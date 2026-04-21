from rest_framework import serializers
from django.utils import timezone
from core.models import Ticket, User, SupportEngineer

class TicketSerializer(serializers.ModelSerializer):
    # Вычисляемые и вложенные поля для удобства фронтенда
    author_name = serializers.CharField(source='user.full_name', read_only=True)
    assignee_name = serializers.CharField(source='assigned_engineer.user.full_name', read_only=True, allow_null=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    comments_count = serializers.SerializerMethodField()
    is_sla_breached = serializers.SerializerMethodField()

    assigned_engineer = serializers.PrimaryKeyRelatedField(
        queryset=SupportEngineer.objects.select_related('user'),
        required=False, allow_null=True,
        help_text="ID инженера поддержки (только для Admin/Engineer)"
    )

    class Meta:
        model = Ticket
        fields = [
            'id', 'ticket_number', 'author_name', 'category', 'category_name',
            'assigned_engineer', 'assignee_name', 'sla_deadline', 'status',
            'description', 'created_at', 'updated_at', 'comments_count', 'is_sla_breached'
        ]
        read_only_fields = [
            'id', 'ticket_number', 'author_name', 'sla_deadline',
            'created_at', 'updated_at', 'comments_count', 'is_sla_breached'
        ]

    def get_comments_count(self, obj):
        return obj.comments.count()

    def get_is_sla_breached(self, obj):
        if obj.sla_deadline and obj.status not in [Ticket.Status.RESOLVED, Ticket.Status.CLOSED]:
            return timezone.now() > obj.sla_deadline
        return False

    def validate_assigned_engineer(self, value):
        if value and value.user.role != User.Role.ENGINEER:
            raise serializers.ValidationError("Назначенный пользователь должен иметь роль инженера.")
        return value

    def validate_status(self, value):
        # Базовая валидация статусной модели
        instance = getattr(self, 'instance', None)
        if instance:
            allowed = {
                'OP': ['IP', 'WR'],
                'IP': ['RS', 'WR'],
                'RS': ['OP', 'CL'],
                'WR': ['IP', 'RS'],
            }
            if instance.status not in allowed.get(value, []):
                raise serializers.ValidationError(
                    f"Недопустимый переход статуса из {instance.get_status_display()} в {dict(Ticket.Status.choices).get(value)}"
                )
        return value

    def create(self, validated_data):
        # Автоматически привязываем автора из request
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
