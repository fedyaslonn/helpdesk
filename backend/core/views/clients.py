from rest_framework import viewsets, status, mixins, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db import transaction
from django.shortcuts import get_object_or_404

from core.models import User, Client, SupportEngineer
from core.serializers.clients import (
    UserListSerializer, UserDetailSerializer, UserCreateSerializer,
    UserUpdateSerializer, ClientProfileSerializer, SupportEngineerProfileSerializer
)
from ..permissions import IsAdminOrSelf, IsAdminOrEngineerSelf, CanManageRole


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
        if self.action == 'create':
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
    Отдельный ViewSet для управления профилями инженеров.
    """
    serializer_class = SupportEngineerProfileSerializer
    permission_classes = [IsAdminOrEngineerSelf]

    def get_queryset(self):
        queryset = SupportEngineer.objects.select_related('user')
        if self.request.user.role != 'admin':
            queryset = queryset.filter(user=self.request.user)
        return queryset

    def perform_create(self, serializer):
        raise serializers.ValidationError(
            "Профиль инженера создаётся автоматически при создании пользователя с ролью engineer")

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrEngineerSelf])
    def toggle_duty(self, request, pk=None):
        """Переключить статус дежурства инженера"""
        engineer = self.get_object()
        engineer.is_on_duty = not engineer.is_on_duty
        engineer.save(update_fields=['is_on_duty', 'updated_at'])
        return Response({
            'is_on_duty': engineer.is_on_duty,
            'message': f"Инженер {'на' if engineer.is_on_duty else 'не'} дежурстве"
        })

    @action(detail=False, methods=['get'], permission_classes=[IsAdminOrEngineerSelf])
    def on_duty(self, request):
        """Список инженеров, находящихся сейчас на дежурстве"""
        engineers = SupportEngineer.objects.filter(
            is_on_duty=True,
            user__is_active=True
        ).select_related('user')

        # Дополнительно можно отфильтровать по активной смене
        from django.utils import timezone
        now = timezone.localtime(timezone.now())
        engineers = engineers.filter(
            shifts__shift_date=now.date(),
            shifts__is_active=True,
            shifts__shift_start__lte=now.time(),
            shifts__shift_end__gte=now.time()
        ).distinct()

        serializer = self.get_serializer(engineers, many=True)
        return Response(serializer.data)
