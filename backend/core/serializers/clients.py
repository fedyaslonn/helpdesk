from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from ..models import User, Client, SupportEngineer


class ClientProfileSerializer(serializers.ModelSerializer):
    """Сериализатор профиля клиента (Таблица 2.1)"""
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    full_name = serializers.CharField(source='user.full_name', required=False)
    contact_phone = serializers.CharField(source='user.contact_phone', required=False)
    is_verified = serializers.BooleanField(source='user.is_verified', read_only=True)

    class Meta:
        model = Client
        fields = [
            'id', 'user_id', 'username', 'email', 'full_name', 'contact_phone',
            'account_id', 'position', 'status', 'is_verified', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user_id', 'username', 'email', 'is_verified', 'created_at', 'updated_at']

    def validate_status(self, value):
        if value not in ['active', 'archived']:
            raise serializers.ValidationError("Недопустимый статус")
        return value


class SupportEngineerProfileSerializer(serializers.ModelSerializer):
    """Сериализатор профиля инженера (Таблица 2.2)"""
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    full_name = serializers.CharField(source='user.full_name', required=False)
    contact_phone = serializers.CharField(source='user.contact_phone', required=False)
    is_on_duty = serializers.BooleanField(required=False)
    is_active_on_shift = serializers.SerializerMethodField()

    class Meta:
        model = SupportEngineer
        fields = [
            'id', 'user_id', 'username', 'email', 'full_name', 'contact_phone',
            'max_concurrent_tickets', 'is_on_duty', 'is_active_on_shift',
            'last_ticket_resolved_at', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'user_id', 'username', 'email', 'last_ticket_resolved_at',
            'created_at', 'updated_at', 'is_active_on_shift'
        ]

    def get_is_active_on_shift(self, obj):
        return obj.is_active_on_shift

    def validate_max_concurrent_tickets(self, value):
        if value < 1 or value > 20:
            raise serializers.ValidationError("Максимальное количество заявок должно быть от 1 до 20")
        return value


class UserListSerializer(serializers.ModelSerializer):
    """Минимальный сериализатор для списка пользователей (админ-панель)"""
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    profile_id = serializers.SerializerMethodField()
    profile_type = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'full_name', 'role', 'role_display',
                  'is_verified', 'is_active', 'profile_id', 'profile_type', 'date_joined']
        read_only_fields = ['id', 'date_joined']

    def get_profile_id(self, obj):
        if obj.role == 'client':
            return getattr(obj, 'client_profile', None) and obj.client_profile.id
        elif obj.role == 'engineer':
            return getattr(obj, 'engineer_profile', None) and obj.engineer_profile.id
        return None

    def get_profile_type(self, obj):
        if obj.role == 'client':
            return 'client'
        elif obj.role == 'engineer':
            return 'engineer'
        return None


class UserDetailSerializer(serializers.ModelSerializer):
    """Детальный сериализатор пользователя с вложенным профилем"""
    client_profile = ClientProfileSerializer(read_only=True)
    engineer_profile = SupportEngineerProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'full_name', 'contact_phone', 'role',
            'is_verified', 'is_active', 'date_birth', 'date_joined', 'last_login',
            'client_profile', 'engineer_profile'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login']


class UserCreateSerializer(serializers.ModelSerializer):
    """Сериализатор для создания пользователя админом"""
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, required=True)

    # Поля профиля (опционально при создании)
    position = serializers.CharField(write_only=True, required=False, allow_blank=True)
    account_id = serializers.CharField(write_only=True, required=False, allow_blank=True)
    max_concurrent_tickets = serializers.IntegerField(write_only=True, required=False, min_value=1, max_value=20)

    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password_confirm', 'full_name',
            'contact_phone', 'role', 'is_verified', 'date_birth',
            'position', 'account_id', 'max_concurrent_tickets'
        ]
        extra_kwargs = {
            'full_name': {'required': False, 'allow_blank': True},
            'contact_phone': {'required': False, 'allow_blank': True},
            'is_verified': {'required': False},
            'date_birth': {'required': False, 'allow_null': True},
        }

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({"password_confirm": "Пароли не совпадают"})

        # Валидация роли и профиля
        role = data.get('role')
        if role == 'client' and data.get('max_concurrent_tickets'):
            raise serializers.ValidationError({"max_concurrent_tickets": "Поле доступно только для инженеров"})
        if role == 'engineer' and not data.get('max_concurrent_tickets'):
            data['max_concurrent_tickets'] = 3  # Значение по умолчанию

        return data

    def create(self, validated_data):
        profile_data = {}
        if validated_data.get('position') is not None:
            profile_data['position'] = validated_data.pop('position')
        if validated_data.get('account_id') is not None:
            profile_data['account_id'] = validated_data.pop('account_id')
        if validated_data.get('max_concurrent_tickets') is not None:
            profile_data['max_concurrent_tickets'] = validated_data.pop('max_concurrent_tickets')

        password = validated_data.pop('password')
        password_confirm = validated_data.pop('password_confirm', None)

        user = User(**validated_data)
        user.set_password(password)
        user.save()

        # Создаём соответствующий профиль
        if user.role == 'client':
            Client.objects.create(user=user,
                                  **{k: v for k, v in profile_data.items() if k in ['position', 'account_id']})
        elif user.role == 'engineer':
            SupportEngineer.objects.create(user=user,
                                           **{k: v for k, v in profile_data.items() if k in ['max_concurrent_tickets']})

        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Сериализатор для обновления пользователя (админом или самим собой)"""
    password = serializers.CharField(write_only=True, required=False, validators=[validate_password])

    # Поля профиля для обновления
    position = serializers.CharField(source='client_profile.position', required=False, allow_blank=True)
    account_id = serializers.CharField(source='client_profile.account_id', required=False, allow_blank=True)
    status = serializers.ChoiceField(source='client_profile.status',
                                     choices=[('active', 'Активна'), ('archived', 'Архив')], required=False)
    max_concurrent_tickets = serializers.IntegerField(source='engineer_profile.max_concurrent_tickets', required=False,
                                                      min_value=1, max_value=20)
    is_on_duty = serializers.BooleanField(source='engineer_profile.is_on_duty', required=False)

    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'full_name', 'contact_phone',
            'role', 'is_verified', 'is_active', 'date_birth',
            'position', 'account_id', 'status', 'max_concurrent_tickets', 'is_on_duty'
        ]
        extra_kwargs = {
            'username': {'required': False},
            'email': {'required': False},
            'full_name': {'required': False, 'allow_blank': True},
            'contact_phone': {'required': False, 'allow_blank': True},
            'is_verified': {'required': False},
            'is_active': {'required': False},
            'date_birth': {'required': False, 'allow_null': True},
        }

    def validate_role(self, value):
        """Запрет на смену роли через обычный update (только через специальный эндпоинт)"""
        instance = getattr(self, 'instance', None)
        if instance and instance.role != value:
            raise serializers.ValidationError("Для смены роли используйте эндпоинт /admin/change_role/")
        return value

    def update(self, instance, validated_data):
        # Обновление полей профиля
        if instance.role == 'client' and 'client_profile' in validated_data:
            client_data = validated_data.pop('client_profile')
            for attr, value in client_data.items():
                setattr(instance.client_profile, attr, value)
            instance.client_profile.save()

        elif instance.role == 'engineer' and 'engineer_profile' in validated_data:
            engineer_data = validated_data.pop('engineer_profile')
            for attr, value in engineer_data.items():
                setattr(instance.engineer_profile, attr, value)
            instance.engineer_profile.save()

        # Обновление пароля
        password = validated_data.pop('password', None)
        if password:
            instance.set_password(password)

        return super().update(instance, validated_data)
    