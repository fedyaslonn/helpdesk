from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from core.models import SupportSession, SupportEngineer
from core.serializers.support_sessions import SupportSessionSerializer
from core.permissions import SessionAccessPermission # Тот же пермишен, что мы обсуждали

class SupportSessionViewSet(viewsets.ModelViewSet):
    """API для управления сессиями поддержки."""
    queryset = SupportSession.objects.select_related('engineer__user').order_by('-session_start')
    serializer_class = SupportSessionSerializer
    permission_classes = [SessionAccessPermission]
    
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['ticket', 'engineer']


    def perform_create(self, serializer):
        # 1. Достаем ID заявки из запроса
        ticket_id = self.request.data.get('ticket')
        ticket = get_object_or_404(Ticket, id=ticket_id)

        # 2. Проверяем, есть ли у заявки назначенный инженер
        if not ticket.assigned_engineer:
            raise PermissionDenied("Нельзя начать работу: инженер еще не назначен на заявку.")

        # 3. Проверяем, совпадает ли текущий юзер с назначенным инженером
        if ticket.assigned_engineer.user != self.request.user:
            raise PermissionDenied("Только назначенный на заявку инженер может вести журнал работ.")

        # 4. Если всё ок, сохраняем сессию, принудительно привязывая инженера этой заявки
        serializer.save(engineer=ticket.assigned_engineer)

    @action(detail=True, methods=['post'])
    def end_session(self, request, pk=None):
        """Финальное завершение сессии и расчет времени"""
        session = self.get_object()
        
        if session.session_end:
            return Response(
                {"error": "Сессия уже завершена"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        session.session_end = timezone.now()
        
        # Считаем разницу во времени
        delta = session.session_end - session.session_start
        # Переводим в минуты (округляем)
        session.time_spent_min = int(delta.total_seconds() / 60)
        
        session.save(update_fields=['session_end', 'time_spent_min'])
        
        return Response(self.get_serializer(session).data)
