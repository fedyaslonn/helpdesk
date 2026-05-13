from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db import models, transaction
from django.utils import timezone

from core.models import Ticket, SupportEngineer, User, Notification
from core.serializers.tickets import TicketSerializer
from core.serializers.comments import PartialUpdateCommentSerializer, GetCommentSerializer, CreateCommentSerializer 
from core.filters.tickets import TicketFilter
from core.permissions import CanInteractWithTicket, IsAdminOrEngineer

from core.tasks import send_ticket_created_notification, process_ai_classification_and_assignment


class TicketViewSet(viewsets.ModelViewSet):
    serializer_class = TicketSerializer
    permission_classes = [CanInteractWithTicket]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = TicketFilter # Твой кастомный фильтр
    search_fields = ['ticket_number', 'description', 'category__name']
    ordering_fields = ['created_at', 'sla_deadline', 'status']
    ordering = ['-created_at']

    def get_permissions(self):
        # List/Create: достаточно аутентификации (доступ фильтруется в get_queryset)
        # Detail: полная проверка прав
        if self.action in ['list', 'create']:
            return [IsAuthenticated()]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        # Оптимизация: select_related для FK, prefetch для обратных связей
        qs = Ticket.objects.select_related(
            'user', 'category', 'assigned_engineer__user'
        ).prefetch_related('comments__author')

        if user.role == User.Role.ADMIN:
            return qs
        elif user.role == User.Role.ENGINEER:
            # Инженер видит свои заявки и заявки, которые он создал
            return qs.filter(
                models.Q(assigned_engineer__user=user) | models.Q(user=user)
            )
        else:  # CLIENT
            return qs.filter(user=user)

    def perform_create(self, serializer):
        ticket = serializer.save(user=self.request.user)
        # Автоматическое уведомление
        
        # 3. Системные уведомления и Email клиенту (что заявка создана)
        Notification.objects.create(
            user=ticket.user, ticket=ticket,
            message=f"Заявка {ticket.ticket_number} успешно создана",
            notification_type=Notification.Type.TICKET_CREATED
        )
        # 4. 🔥 Отправляем уведомление клиенту (что заявка создана)
        transaction.on_commit(lambda: send_ticket_created_notification.delay(ticket.id))
        
        # 3. 🔥 Отправляем тикет на обработку ИИ и авто-назначение!
        transaction.on_commit(lambda: process_ai_classification_and_assignment.delay(ticket.id))



    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrEngineer])
    def assign(self, request, pk=None):
        """Ручное назначение инженера на заявку"""
        ticket = self.get_object()
        engineer_id = request.data.get('engineer_id')

        if not engineer_id:
            return Response({'error': 'engineer_id обязателен'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            engineer = SupportEngineer.objects.select_related('user').get(id=engineer_id)
        except SupportEngineer.DoesNotExist:
            return Response({'error': 'Инженер не найден'}, status=status.HTTP_404_NOT_FOUND)

        if engineer.user.role != User.Role.ENGINEER:
            return Response({'error': 'Пользователь не является инженером поддержки'},
                            status=status.HTTP_400_BAD_REQUEST)

        ticket.assign_engineer(engineer, assigned_by=request.user)

        Notification.objects.create(
            user=engineer.user, ticket=ticket,
            message=f"Вам назначена заявка {ticket.ticket_number}",
            notification_type=Notification.Type.ASSIGNED
        )
        return Response(self.get_serializer(ticket).data)

    @action(detail=False, methods=['post'], permission_classes=[IsAdminOrEngineer])
    def auto_assign(self, request):
        """Автоматическое назначение через менеджер"""
        ticket_id = request.data.get('ticket_id')
        if not ticket_id:
            return Response({'error': 'ticket_id обязателен'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            ticket = Ticket.objects.get(id=ticket_id, status=Ticket.Status.OPEN)
        except Ticket.DoesNotExist:
            return Response({'error': 'Заявка не найдена или уже не открыта'}, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            ticket = Ticket.objects.auto_assign(ticket)
            if ticket.assigned_engineer:
                Notification.objects.create(
                    user=ticket.assigned_engineer.user, ticket=ticket,
                    message=f"Автоматически назначена заявка {ticket.ticket_number}",
                    notification_type=Notification.Type.ASSIGNED
                )
        return Response(self.get_serializer(ticket).data)

    @action(detail=True, methods=['post'], permission_classes=[CanInteractWithTicket])
    def close(self, request, pk=None):
        """Финальное закрытие заявки (доступно автору и назначенному инженеру/админу)"""
        ticket = self.get_object()
        if ticket.status not in [Ticket.Status.RESOLVED, Ticket.Status.WAITING]:
            return Response({'error': 'Заявка должна быть в статусе Решена или Ожидание'},
                            status=status.HTTP_400_BAD_REQUEST)

        ticket.status = Ticket.Status.CLOSED
        ticket.save(update_fields=['status', 'updated_at'])
        return Response({'status': 'closed', 'message': 'Заявка успешно закрыта'})


    # =======================================================
    # ЛОГИКА КОММЕНТАРИЕВ (Вложенные эндпоинты)
    # =======================================================

    @action(detail=True, methods=['get', 'post'], url_path='comments')
    def manage_comments(self, request, pk=None):
        """
        GET /tickets/{id}/comments/ - получить все комментарии заявки
        POST /tickets/{id}/comments/ - добавить комментарий к заявке
        """
        ticket = self.get_object() # Это автоматически проверит права доступа к самой заявке!

        if request.method == 'GET':
            comments = ticket.comments.select_related('author').order_by('-created_at')
            serializer = GetCommentSerializer(comments, many=True)
            return Response(serializer.data)

        if request.method == 'POST':
            # Используем твой CreateCommentSerializer
            serializer = CreateCommentSerializer(data=request.data, context={'request': request})
            serializer.is_valid(raise_exception=True)
            
            # Сохраняем, жестко привязывая к заявке и текущему пользователю
            comment = serializer.save(ticket=ticket, author=request.user)
            
            # Возвращаем созданный комментарий в развернутом виде (чтобы React сразу отрисовал автора)
            return Response(GetCommentSerializer(comment).data, status=status.HTTP_201_CREATED)

    # Используем url_path с регулярным выражением для выхватывания ID комментария
    @action(detail=True, methods=['patch', 'delete'], url_path=r'comments/(?P<comment_id>\d+)')
    def comment_detail(self, request, pk=None, comment_id=None):
        """
        PATCH /tickets/{id}/comments/{comment_id}/ - редактировать комментарий
        DELETE /tickets/{id}/comments/{comment_id}/ - удалить комментарий
        """
        ticket = self.get_object()
        
        try:
            comment = ticket.comments.get(id=comment_id)
        except Comment.DoesNotExist:
            return Response({"error": "Комментарий не найден"}, status=status.HTTP_404_NOT_FOUND)

        if request.method == 'PATCH':
            # Передаем request в context, чтобы отработала твоя логика validate() из PartialUpdateCommentSerializer
            serializer = PartialUpdateCommentSerializer(
                comment, data=request.data, partial=True, context={'request': request}
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(GetCommentSerializer(comment).data)

        if request.method == 'DELETE':
            # Проверяем права на удаление (автор комментария или администратор)
            if request.user != comment.author and request.user.role != User.Role.ADMIN:
                return Response({"error": "Вы не можете удалить этот комментарий"}, status=status.HTTP_403_FORBIDDEN)
            
            comment.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], permission_classes=[CanInteractWithTicket])
    def approve_resolution(self, request, pk=None):
        """Подтверждение решения пользователем"""
        ticket = self.get_object()
        
        # Защита от чужих рук
        if request.user != ticket.user and request.user.role != User.Role.ADMIN:
            return Response(
                {'error': 'Только автор заявки может подтвердить решение.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
            
        if ticket.status != Ticket.Status.WAITING:
            return Response(
                {'error': 'Заявка не находится в статусе ожидания подтверждения (WR).'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Меняем статус на Решена (RS)
        ticket.status = Ticket.Status.RESOLVED
        ticket.save(update_fields=['status', 'updated_at'])
        
        # Уведомляем инженера, что его решение принято!
        if ticket.assigned_engineer:
            Notification.objects.create(
                user=ticket.assigned_engineer.user, ticket=ticket,
                message=f"Пользователь подтвердил решение по заявке {ticket.ticket_number}. Отличная работа!",
                notification_type=Notification.Type.STATUS_CHANGED
            )
        
        return Response({'status': 'resolved', 'message': 'Решение успешно подтверждено'})

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrEngineer])
    def unassign(self, request, pk=None):
        """Снятие инженера с заявки (Доступно только Админу)"""
        ticket = self.get_object()
        
        # Проверка прав: только админ может снимать инженеров
        if request.user.role != User.Role.ADMIN:
            return Response(
                {'error': 'Только администратор может снимать инженера с заявки'}, 
                status=status.HTTP_403_FORBIDDEN
            )
            
        if not ticket.assigned_engineer:
            return Response(
                {'error': 'На эту заявку не назначен инженер'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        old_engineer_user = ticket.assigned_engineer.user
        
        # Снимаем инженера и возвращаем статус "Открыта" (OP)
        ticket.assigned_engineer = None
        ticket.status = Ticket.Status.OPEN
        ticket.save(update_fields=['assigned_engineer', 'status', 'updated_at'])
        
        # Системное уведомление внутри приложения
        Notification.objects.create(
            user=old_engineer_user, ticket=ticket,
            message=f"Администратор снял вас с выполнения заявки {ticket.ticket_number}.",
            notification_type=Notification.Type.STATUS_CHANGED
        )
        
        # Фоновая отправка письма
        transaction.on_commit(lambda: send_ticket_unassigned_notification.delay(ticket.id, old_engineer_user.id))
        
        return Response({'status': 'unassigned', 'message': 'Инженер успешно снят с заявки'})

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrEngineer])
    def unassign(self, request, pk=None):
        """Снятие инженера с заявки (Доступно только Админу)"""
        ticket = self.get_object()
        
        # Проверка прав: только админ может снимать инженеров
        if request.user.role != User.Role.ADMIN:
            return Response(
                {'error': 'Только администратор может снимать инженера с заявки'}, 
                status=status.HTTP_403_FORBIDDEN
            )
            
        if not ticket.assigned_engineer:
            return Response(
                {'error': 'На эту заявку не назначен инженер'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        old_engineer_user = ticket.assigned_engineer.user
        
        # Снимаем инженера и возвращаем статус "Открыта" (OP)
        ticket.assigned_engineer = None
        ticket.status = Ticket.Status.OPEN
        ticket.save(update_fields=['assigned_engineer', 'status', 'updated_at'])
        
        # Системное уведомление внутри приложения
        Notification.objects.create(
            user=old_engineer_user, ticket=ticket,
            message=f"Администратор снял вас с выполнения заявки {ticket.ticket_number}.",
            notification_type=Notification.Type.STATUS_CHANGED
        )
        
        # Фоновая отправка письма
        transaction.on_commit(lambda: send_remove_assignee_notification.delay(ticket.id, old_engineer_user.id))
        
        return Response({'status': 'unassigned', 'message': 'Инженер успешно снят с заявки'})
