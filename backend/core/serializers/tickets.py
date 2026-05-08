from rest_framework import serializers
from django.utils import timezone
from core.models import Ticket, User, SupportEngineer
from core.serializers.comments import GetCommentSerializer


class TicketSerializer(serializers.ModelSerializer):
    comments_count = serializers.SerializerMethodField()
    is_sla_breached = serializers.SerializerMethodField()
    
    # Поля для чтения: отдаем объекты, чтобы React мог рисовать аватарки и проверять ID
    requestor = serializers.SerializerMethodField(read_only=True)
    assignee = serializers.SerializerMethodField(read_only=True)
    organization = serializers.SerializerMethodField(read_only=True) # React ждет organization
    comments = GetCommentSerializer(many=True, read_only=True) # Вкладываем комменты

    # Поля для записи
    assigned_engineer = serializers.PrimaryKeyRelatedField(
        queryset=SupportEngineer.objects.select_related('user'),
        required=False, allow_null=True,
        write_only=True # Делаем write_only, так как на чтение отдаем assignee
    )

    class Meta:
        model = Ticket
        fields = [
            'id', 'ticket_number', 'category', 'organization', 
            'assigned_engineer', 'assignee', 'requestor', 'user',
            'sla_deadline', 'status', 'description', 'created_at', 'updated_at', 
            'comments_count', 'is_sla_breached', 'comments'
        ]
        read_only_fields = [
            'id', 'ticket_number', 'sla_deadline', 'user',
            'created_at', 'updated_at', 'comments_count', 'is_sla_breached'
        ]

    # --- Подготовка данных для React ---
    def get_requestor(self, obj):
        return {"id": obj.user.id, "username": obj.user.username}

    def get_assignee(self, obj):
        if obj.assigned_engineer:
            return {"id": obj.assigned_engineer.user.id, "username": obj.assigned_engineer.user.username}
        return None
        
    def get_organization(self, obj):
        if obj.category:
            return {"id": obj.category.id, "name": obj.category.name}
        return None

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
        instance = getattr(self, 'instance', None)
        request = self.context.get('request')
        
        if instance:
            # Логика переходов
            allowed = {
                'OP': ['IP', 'WR'], 
                'IP': ['WR', 'RS'], 
                'RS': ['OP', 'CL'],
                'WR': ['IP', 'RS', 'CL'],
            }
            if value not in allowed.get(instance.status, []):
                raise serializers.ValidationError(
                    f"Недопустимый переход статуса из {instance.status} в {value}"
                )
            
            # 🔥 ГЛАВНАЯ ПРОВЕРКА: Только автор может перевести в "Решена"
            if value == 'RS' and request:
                is_author = request.user == instance.user
                is_admin = request.user.role == request.user.Role.ADMIN
                
                if not (is_author or is_admin):
                    raise serializers.ValidationError(
                        "Только автор заявки может подтвердить решение и перевести её в статус 'Решена'."
                    )

        return value

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
