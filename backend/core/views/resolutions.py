from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend
from core.models import ResolutionResult
from core.serializers.resolutions import ResolutionResultSerializer
from core.permissions import ResolutionAccessPermission

from core.tasks import send_ticket_resolved_notification

class ResolutionResultViewSet(viewsets.ModelViewSet):
    """
    API для фиксации результатов обработки заявок.
    GET /resolutions/?ticket=101
    """
    queryset = ResolutionResult.objects.all().order_by('-created_at')
    serializer_class = ResolutionResultSerializer
    permission_classes = [ResolutionAccessPermission]
    
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['ticket', 'is_sla_met']
    

    
    def perform_create(self, serializer):
        with transaction.atomic():
            resolution = serializer.save()
            ticket = resolution.ticket
                
                # 🔥 Автоматически переводим заявку в Ожидание (WR)
            ticket.status = Ticket.Status.WAITING
            ticket.save(update_fields=['status', 'updated_at'])
                
                # Уведомляем систему (текст изменен под логику)
            Notification.objects.create(
                user=ticket.user, ticket=ticket,
                message=f"По заявке {ticket.ticket_number} предложено решение. Ожидается ваше подтверждение.",
                notification_type=Notification.Type.STATUS_CHANGED
            )

                # Отправка Email в фоне
            transaction.on_commit(lambda: send_ticket_resolved_notification.delay(resolution.id))
