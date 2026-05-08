from datetime import date

from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from core.models import User


class GetUserSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "role",
            "role_display",
            "last_login",
            "full_name",
            "email",
            "username",
        ]
        extra_kwargs = {field: {"read_only": True} for field in fields}


class CreateUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        validators=[validate_password],
        style={"input_type": "password"},
    )

    password2 = serializers.CharField(write_only=True, style={"input_type": "password"})

    class Meta:
        model = User
        fields = [
            "email",
            "username",
            "full_name",
            "password",
            "password2",
            "date_birth",
        ]

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError(
                {"password": "Пароли не совпадают"}
            )
        return attrs

    def validate_date_birth(self, value):
        # Если значение не передано (None), пропускаем проверку
        if value and value > timezone.now().date():
            raise serializers.ValidationError("Дата рождения не может быть в будущем")
        return value


class UpdateUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "email",
            "username",
            "full_name",
            "date_birth",
        ]

    def validate_date_birth(self, value):
        if value and value > timezone.now().date():
            raise serializers.ValidationError("Дата рождения не может быть в будущем")
        return value


class PartialUpdateUserSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(
        validators=[UniqueValidator(queryset=User.objects.all())], required=False
    )
    username = serializers.CharField(
        validators=[UniqueValidator(queryset=User.objects.all())], required=False
    )
    full_name = serializers.CharField(required=False)
    date_birth = serializers.DateField(required=False)

    class Meta:
        model = User
        fields = ["email", "username", "full_name", "date_birth"]

    def validate_date_birth(self, value):
        if value and value > date.today():
            raise serializers.ValidationError("Дата рождения не может быть в будущем")
        return value


class ShiftSerializer(serializers.Serializer):
    shift_start = serializers.TimeField(required=False, allow_null=True)
    shift_end = serializers.TimeField(required=False, allow_null=True)


class ChangeRoleSerializer(serializers.Serializer):
    """
    Заменил AdminAssignmentSerializer, так как Membership больше нет.
    Теперь администратор просто назначает системную роль.
    """
    role = serializers.ChoiceField(choices=User.Role.choices, required=True)

    def validate(self, attrs):
        request_user = self.context["request"].user

        # Дополнительная защита на уровне сериализатора
        if request_user.role != User.Role.ADMIN:
            raise serializers.ValidationError(
                "Только администраторы могут изменять роли пользователей"
            )

        return attrs
        