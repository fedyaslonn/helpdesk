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
from core.filters.tickets import TicketFilter
from core.permissions import CanInteractWithTicket, IsAdminOrEngineer


class TicketViewSet(viewsets.ModelViewSet):
    serializer_class = TicketSerializer
    permission_classes = [CanInteractWithTicket]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = TicketFilter
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
        ).prefetch_related('comments')

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
        ticket = serializer.save()
        # Автоматическое уведомление
        Notification.objects.create(
            user=ticket.user, ticket=ticket,
            message=f"Заявка {ticket.ticket_number} успешно создана",
            notification_type=Notification.Type.TICKET_CREATED
        )

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
