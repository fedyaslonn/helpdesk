from rest_framework import viewsets, status, mixins, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db import transaction
from django.shortcuts import get_object_or_404

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from core.filters.users import UserFilter

from core.models import User, Client, SupportEngineer
from core.serializers.clients import (
    UserListSerializer, UserDetailSerializer, UserCreateSerializer,
    UserUpdateSerializer, ClientProfileSerializer, SupportEngineerProfileSerializer
)
from ..permissions import IsAdminOrSelf, IsAdminOrEngineerSelf, CanManageRole
from django.db.models import Count, Q


class UserProfileViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet
):
    """
    ViewSet для управления пользователями и их профилями.

    Роли:
    - GET /users/ - список (только админ видит всех, остальные - только себя)
    - GET /users/{id}/ - детально (с вложенным профилем)
    - POST /users/ - создание (только админ)
    - PUT/PATCH /users/{id}/ - обновление (админ или сам пользователь)
    - DELETE /users/{id}/ - удаление (только админ)
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = UserFilter
    search_fields = ['username', 'email', 'full_name'] # Поиск ?search=...
    ordering_fields = ['date_joined', 'role']          # Сортировка ?ordering=...
    ordering = ['-date_joined']                        # Сортировка по умолчанию

    def get_queryset(self):
        queryset = User.objects.select_related('client_profile', 'engineer_profile')
        if self.request.user.role != 'admin':
            # Не-админы видят только свой профиль
            queryset = queryset.filter(id=self.request.user.id)
        return queryset

    def get_serializer_class(self):
        if self.action == 'list':
            return UserListSerializer
        elif self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserDetailSerializer

    def get_permissions(self):
        # Добавляем разрешение для нового экшена
        if self.action == 'register':
            return [AllowAny()]
            
        elif self.action == 'create':
            return [IsAuthenticated(), CanManageRole()]  # Только админ создаёт
        elif self.action in ['update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsAdminOrSelf()]
        
        return [IsAuthenticated()]


    def perform_create(self, serializer):
        # Дополнительная логика при создании (например, логирование)
        user = serializer.save()
        # Здесь можно отправить приветственное уведомление

    @action(detail=True, methods=['post'], permission_classes=[CanManageRole])
    def change_role(self, request, pk=None):
        """
        Смена роли пользователя (только админ).
        При смене роли автоматически создаётся/удаляется профиль.
        """
        user = self.get_object()
        new_role = request.data.get('role')

        if new_role not in [r[0] for r in User.Role.choices]:
            return Response({'error': 'Недопустимая роль'}, status=status.HTTP_400_BAD_REQUEST)

        if new_role == user.role:
            return Response({'message': 'Роль не изменена'})

        with transaction.atomic():
            old_role = user.role
            user.role = new_role

            # Удаляем старый профиль, если он есть
            if old_role == 'client' and hasattr(user, 'client_profile'):
                user.client_profile.delete()
            elif old_role == 'engineer' and hasattr(user, 'engineer_profile'):
                user.engineer_profile.delete()

            # Создаём новый профиль, если нужно
            if new_role == 'client':
                Client.objects.get_or_create(user=user)
            elif new_role == 'engineer':
                SupportEngineer.objects.get_or_create(user=user)

            user.save(update_fields=['role'])

        return Response({
            'message': f'Роль изменена с {old_role} на {new_role}',
            'user_id': user.id,
            'new_role': new_role
        })

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def register(self, request):
        """Открытый эндпоинт для регистрации новых клиентов"""
        serializer = UserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Принудительно задаем роль клиента, чтобы никто не мог зарегистрироваться как админ
        user = serializer.save(role='client')
        
        # Автоматически создаем профиль клиента
        Client.objects.get_or_create(user=user)
        
        return Response(
            {"message": "Регистрация успешна", "user_id": user.id}, 
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['post'], permission_classes=[CanManageRole])
    def verify(self, request, pk=None):
        """Верификация пользователя админом"""
        user = self.get_object()
        user.is_verified = True
        user.save(update_fields=['is_verified', 'updated_at'])
        return Response({'status': 'verified', 'user_id': user.id})

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """Получить текущий профиль пользователя"""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)


class ClientProfileViewSet(viewsets.ModelViewSet):
    """
    Отдельный ViewSet для управления профилями клиентов.
    Удобно для фильтрации и специфичных эндпоинтов.
    """
    serializer_class = ClientProfileSerializer
    permission_classes = [IsAdminOrSelf]

    def get_queryset(self):
        queryset = Client.objects.select_related('user')
        if self.request.user.role != 'admin':
            queryset = queryset.filter(user=self.request.user)
        return queryset

    def perform_create(self, serializer):
        # Профиль клиента обычно создаётся автоматически при регистрации/создании пользователя
        raise serializers.ValidationError(
            "Профиль клиента создаётся автоматически при создании пользователя с ролью client")


class SupportEngineerProfileViewSet(viewsets.ModelViewSet):
    """
    Управление профилями инженеров.
    Базовый URL: /helpdesk/engineers/
    """
    serializer_class = SupportEngineerProfileSerializer
    
    # ✅ Применяем твой класс пермишенов ко всему ViewSet
    permission_classes = [IsAuthenticated, IsAdminOrEngineerSelf]
    
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['is_on_duty']
    
    def get_queryset(self):
        # Добавляем annotate, чтобы БД сама посчитала тикеты одним запросом!
        queryset = SupportEngineer.objects.select_related('user').annotate(
            annotated_resolved_count=Count(
                'assigned_tickets',
                filter=Q(assigned_tickets__status__in=['RS', 'CL'])
            )
        ).order_by('-is_on_duty', 'id')

        user = self.request.user

        if user.role == 'admin':
            return queryset
        elif user.role == 'engineer':
            return queryset
        else:
            return queryset.none()

    def perform_create(self, serializer):
        raise serializers.ValidationError(
            "Профиль инженера создаётся автоматически при создании пользователя с ролью engineer"
        )

    # ✅ Явно указываем пермишены для кастомного экшена
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAdminOrEngineerSelf])
    def toggle_duty(self, request, pk=None):
        """Переключить статус дежурства инженера"""
        
        # 🛡️ При вызове get_object() DRF автоматически прогонит IsAdminOrEngineerSelf.has_object_permission
        engineer = self.get_object() 
        
        # Ручная проверка больше не нужна! Код стал максимально чистым.
        engineer.is_on_duty = not engineer.is_on_duty
        engineer.save(update_fields=['is_on_duty', 'updated_at'])
        
        return Response({
            'is_on_duty': engineer.is_on_duty,
            'message': f"Инженер {'на дежурстве' if engineer.is_on_duty else 'снят с дежурства'}"
        })

    @action(detail=False, methods=['get'])
    def on_duty(self, request):
        """Инженеры, находящиеся сейчас на дежурстве"""
        engineers = SupportEngineer.objects.filter(
            is_on_duty=True,
            user__is_active=True
        ).select_related('user')

        now = timezone.localtime(timezone.now())
        engineers = engineers.filter(
            shifts__shift_date=now.date(),
            shifts__is_active=True,
            shifts__shift_start__lte=now.time(),
            shifts__shift_end__gte=now.time()
        ).distinct()

        page = self.paginate_queryset(engineers)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(engineers, many=True)
        return Response(serializer.data)
        