from rest_framework import serializers
from core.models import Notification # Убедись, что импортируешь свою модель

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id', 'user', 'ticket', 'message', 
            'notification_type', 'is_read', 'created_at'
        ]
        read_only_fields = ['id', 'user', 'created_at']
        