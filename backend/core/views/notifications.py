from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from core.models import Notification
from core.serializers.notifications import NotificationSerializer
from core.permissions import IsNotificationOwner

class NotificationViewSet(viewsets.ModelViewSet):
    """
    API для работы с уведомлениями пользователей.
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated, IsNotificationOwner]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['is_read']

    def get_queryset(self):
        # Строго отдаем только уведомления текущего пользователя!
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Отметить все непрочитанные уведомления текущего юзера как прочитанные"""
        # Обновляем одним SQL-запросом для скорости
        self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({"status": "marked"})

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Отметить конкретное уведомление как прочитанное"""
        notification = self.get_object() # Автоматически проверит пермишены
        if not notification.is_read:
            notification.is_read = True
            notification.save(update_fields=['is_read'])
        return Response({"status": "marked"})
        