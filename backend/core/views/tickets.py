from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db import models, transaction
from django.utils import timezone
from core.models import Comment
from core.models import Ticket, SupportEngineer, User, Notification
from core.serializers.tickets import TicketSerializer
from core.serializers.comments import PartialUpdateCommentSerializer, GetCommentSerializer, CreateCommentSerializer 
from core.filters.tickets import TicketFilter
from core.permissions import CanInteractWithTicket, IsAdminOrEngineer

from core.tasks import (
    send_ticket_created_notification,
    process_ai_classification_and_assignment,
    send_change_assignee_notification,      # ← новое
    send_remove_assignee_notification,      # ← уже есть, проверьте имя
    send_change_status_notification,        # ← новое
    send_set_assignee_notification,         # ← новое
    send_resolution_approved_notification,  # ← новое
)


class TicketViewSet(viewsets.ModelViewSet):
    serializer_class = TicketSerializer
    permission_classes = [CanInteractWithTicket]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = TicketFilter
    search_fields = ['ticket_number', 'description', 'category__name']
    ordering_fields = ['created_at', 'sla_deadline', 'status']
    ordering = ['-created_at']

    def get_permissions(self):
        if self.action in ['list', 'create']:
            return [IsAuthenticated()]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        qs = Ticket.objects.select_related(
            'user', 'category', 'assigned_engineer__user'
        ).prefetch_related('comments__author')

        if user.role == User.Role.ADMIN:
            return qs
        elif user.role == User.Role.ENGINEER:
            return qs.filter(
                models.Q(assigned_engineer__user=user) | models.Q(user=user)
            )
        else:  # CLIENT
            return qs.filter(user=user)

    def perform_create(self, serializer):
        # 🔥 ДОБАВЛЕНО: Транзакция для безопасного создания заявки, уведомлений и запуска Celery
        with transaction.atomic():
            ticket = serializer.save(user=self.request.user)

            Notification.objects.create(
                user=ticket.user, ticket=ticket,
                message=f"Заявка {ticket.ticket_number} успешно создана",
                notification_type=Notification.Type.TICKET_CREATED
            )

            transaction.on_commit(lambda: send_ticket_created_notification.delay(ticket.id))
            transaction.on_commit(lambda: process_ai_classification_and_assignment.delay(ticket.id))

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrEngineer])
    def assign(self, request, pk=None):
        """Ручное назначение инженера на заявку"""

        # 🔥 ДОБАВЛЕНО: Жесткая блокировка для всех, кроме Администратора
        if request.user.role != User.Role.ADMIN:
            return Response(
                {'error': 'Только администратор имеет право назначать и переназначать заявки.'},
                status=status.HTTP_403_FORBIDDEN
            )

        ticket = self.get_object()
        engineer_id = request.data.get('engineer_id')

        if not engineer_id:
            return Response({'error': 'engineer_id обязателен'}, status=status.HTTP_400_BAD_REQUEST)

        engineer = SupportEngineer.objects.select_related('user').filter(
            models.Q(id=engineer_id) | models.Q(user__id=engineer_id)
        ).first()

        if not engineer:
            return Response({'error': 'Инженер не найден'}, status=status.HTTP_404_NOT_FOUND)

        if engineer.user.role != User.Role.ENGINEER:
            return Response(
                {'error': 'Назначенный пользователь не является инженером'},
                status=status.HTTP_400_BAD_REQUEST
            )

        old_assignee_id = ticket.assigned_engineer.user.id if ticket.assigned_engineer else None

        # Блок транзакции оставляем как было
        with transaction.atomic():
            ticket.assign_engineer(engineer, assigned_by=request.user)

            Notification.objects.create(
                user=engineer.user,
                ticket=ticket,
                message=f"Вам назначена заявка {ticket.ticket_number}",
                notification_type=Notification.Type.ASSIGNED
            )

            transaction.on_commit(
                lambda: send_change_assignee_notification.delay(
                    ticket.id, old_assignee_id, engineer.user.id
                )
            )

        return Response(self.get_serializer(ticket).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrEngineer], url_path='auto_assign')
    def auto_assign(self, request, pk=None):
        """Принудительное авто-назначение (по кнопке из интерфейса)"""
        # 🔥 flush=True заставляет Docker мгновенно показать лог
        print(f"\n[VIEWSET] >>> ЗАПРОС ПРИШЕЛ В auto_assign ДЛЯ ТИКЕТА PK={pk}", flush=True)
        print(f"[VIEWSET] >>> Пользователь: {request.user.username} (Роль: {request.user.role})", flush=True)

        try:
            ticket = self.get_object()
            print(f"[VIEWSET] >>> Тикет найден: {ticket.ticket_number}, Статус: {ticket.status}", flush=True)
        except Exception as e:
            print(f"[VIEWSET] >>> ОШИБКА ПОИСКА ТИКЕТА: {e}", flush=True)
            raise

        if ticket.status in [Ticket.Status.RESOLVED, Ticket.Status.CLOSED]:
            print("[VIEWSET] >>> ОШИБКА: Попытка назначить закрытый тикет", flush=True)
            return Response(
                {'error': 'Нельзя назначать инженера на закрытую или решенную заявку'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            print("[VIEWSET] >>> Передаю тикет в TicketManager.auto_assign()...", flush=True)
            ticket = Ticket.objects.auto_assign(ticket)
            
            if ticket.assigned_engineer:
                print(f"[VIEWSET] >>> УСПЕХ: Менеджер назначил инженера {ticket.assigned_engineer.user.username}", flush=True)
                Notification.objects.create(
                    user=ticket.assigned_engineer.user, ticket=ticket,
                    message=f"Вам автоматически назначена заявка {ticket.ticket_number}",
                    notification_type=Notification.Type.ASSIGNED
                )
                return Response(self.get_serializer(ticket).data)
            else:
                print("[VIEWSET] >>> ПРОВАЛ: Менеджер вернул тикет без инженера", flush=True)
                return Response(
                    {'error': 'Нет доступных инженеров (никто не на смене, не на дежурстве или превышены лимиты)'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

    @action(detail=True, methods=['post'], permission_classes=[CanInteractWithTicket])
    def close(self, request, pk=None):
        """Закрытие заявки"""
        ticket = self.get_object()
        if ticket.status not in [Ticket.Status.RESOLVED, Ticket.Status.WAITING]:
            return Response({'error': 'Нельзя закрыть заявку в текущем статусе'},
                            status=status.HTTP_400_BAD_REQUEST)

        ticket.status = Ticket.Status.CLOSED
        ticket.save(update_fields=['status', 'updated_at'])
        return Response({'status': 'closed', 'message': 'Заявка закрыта'})

    # =======================================================
    # Блок комментариев
    # =======================================================

    @action(detail=True, methods=['get', 'post'], url_path='comments')
    def manage_comments(self, request, pk=None):
        ticket = self.get_object()

        if request.method == 'GET':
            comments = ticket.comments.select_related('author').order_by('-created_at')
            serializer = GetCommentSerializer(comments, many=True)
            return Response(serializer.data)

        if request.method == 'POST':
            serializer = CreateCommentSerializer(data=request.data, context={'request': request})
            serializer.is_valid(raise_exception=True)
            comment = serializer.save(ticket=ticket, author=request.user)
            return Response(GetCommentSerializer(comment).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch', 'delete'], url_path=r'comments/(?P<comment_id>\d+)')
    def comment_detail(self, request, pk=None, comment_id=None):
        ticket = self.get_object()

        try:
            comment = ticket.comments.get(id=comment_id)
        except Comment.DoesNotExist:
            return Response({"error": "Комментарий не найден"}, status=status.HTTP_404_NOT_FOUND)

        if request.method == 'PATCH':
            serializer = PartialUpdateCommentSerializer(
                comment, data=request.data, partial=True, context={'request': request}
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(GetCommentSerializer(comment).data)

        if request.method == 'DELETE':
            if request.user != comment.author and request.user.role != User.Role.ADMIN:
                return Response({"error": "Вы не можете удалить этот комментарий"}, status=status.HTTP_403_FORBIDDEN)

            comment.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], permission_classes=[CanInteractWithTicket])
    def approve_resolution(self, request, pk=None):
        """Подтверждение решения клиентом"""
        ticket = self.get_object()

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

        old_status = ticket.status

        # 🔥 ДОБАВЛЕНО: Транзакция для обновления статуса, уведомления и 2-х задач Celery
        with transaction.atomic():
            ticket.status = Ticket.Status.RESOLVED
            ticket.save(update_fields=['status', 'updated_at'])

            if ticket.assigned_engineer:
                Notification.objects.create(
                    user=ticket.assigned_engineer.user, ticket=ticket,
                    message=f"Пользователь подтвердил решение по заявке {ticket.ticket_number}. Отличная работа!",
                    notification_type=Notification.Type.STATUS_CHANGED
                )

            transaction.on_commit(lambda: send_change_status_notification.delay(
                ticket.id, old_status, Ticket.Status.RESOLVED
            ))

            transaction.on_commit(lambda: send_resolution_approved_notification.delay(ticket.id))

        return Response({'status': 'resolved', 'message': 'Решение успешно подтверждено'})

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrEngineer])
    def unassign(self, request, pk=None):
        """Снятие инженера с заявки (перевод обратно в OPEN)"""
        ticket = self.get_object()

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

        # 🔥 ДОБАВЛЕНО: Транзакция для безопасного снятия и отправки письма
        with transaction.atomic():
            ticket.assigned_engineer = None
            ticket.status = Ticket.Status.OPEN
            ticket.save(update_fields=['assigned_engineer', 'status', 'updated_at'])

            Notification.objects.create(
                user=old_engineer_user, ticket=ticket,
                message=f"Администратор снял вас с выполнения заявки {ticket.ticket_number}.",
                notification_type=Notification.Type.STATUS_CHANGED
            )

            transaction.on_commit(lambda: send_remove_assignee_notification.delay(ticket.id, old_engineer_user.id))

        return Response({'status': 'unassigned', 'message': 'Инженер успешно снят с заявки'})

    def perform_update(self, serializer):
        old_ticket = self.get_object()
        old_assignee_id = old_ticket.assigned_engineer_id

        # 🔥 ДОБАВЛЕНО: Транзакция для обновления и отправки письма о ручном назначении
        with transaction.atomic():
            ticket = serializer.save()

            if ticket.assigned_engineer_id and ticket.assigned_engineer_id != old_assignee_id:
                new_user_id = ticket.assigned_engineer.user_id

                transaction.on_commit(
                    lambda: send_set_assignee_notification.delay(ticket.id, new_user_id)
                )
