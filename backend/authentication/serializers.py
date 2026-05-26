import logging

from django.contrib.auth.password_validation import validate_password
from django.contrib.auth import authenticate, get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import (
    TokenBlacklistSerializer,
    TokenObtainPairSerializer,
    TokenRefreshSerializer,
)
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

from core.models import User, Client

logger = logging.getLogger(__name__)

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        return token

    def validate(self, attrs):
        validate_data = super().validate(attrs)

        validate_data.update(
            {
                "user_id": self.user.id,
                "email": self.user.email,
            }
        )
        return validate_data


class CustomTokenRefreshSerializer(TokenRefreshSerializer):
    def validate(self, attrs):

        refresh_token = RefreshToken(attrs["refresh"])
        user_id = refresh_token.payload.get("user_id")
        validated_data = super().validate(attrs)

        refresh_token.blacklist()

        validated_data.update(
            {
                "access": validated_data.get("access"),
                "user_id": user_id,
            }
        )

        return validated_data


class CustomTokenBlackListSerializer(TokenBlacklistSerializer):
    def validate(self, attrs):
        validated_data = super().validate(attrs)

        validated_data["message"] = "Token has been blacklisted"

        return validated_data


class LogoutSerializer(serializers.Serializer):
    refresh_token = serializers.CharField(required=True)

    def validate_refresh_token(self, value):
        try:
            token = RefreshToken(value)

            if hasattr(token, "blacklist"):
                token.blacklist()

            return token

        except TokenError as e:
            raise serializers.ValidationError(str(e))

        except Exception:
            raise serializers.ValidationError("Invalid refresh token")


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, required=True)
    email = serializers.EmailField(required=True)


    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 'full_name', 'contact_phone']
        extra_kwargs = {
            'full_name': {'required': False, 'allow_blank': True},
            'contact_phone': {'required': False, 'allow_blank': True},
        }


    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Пароли не совпадают'})

        # Проверка на уникальность
        if User.objects.filter(email=data['email']).exists():
            raise serializers.ValidationError({'email': 'Пользователь с таким email уже существует'})
        if User.objects.filter(username=data['username']).exists():
            raise serializers.ValidationError({'username': 'Такой логин уже занят'})

        return data


    def create(self, validated_data):
        validated_data.pop('password_confirm')

        # Создаём пользователя с ролью CLIENT
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            full_name=validated_data.get('full_name', ''),
            contact_phone=validated_data.get('contact_phone', ''),
            role=User.Role.CLIENT,  # 🔥 Регистрация создаёт только клиента
            is_verified=False,  # Требует верификации админом
        )

        # Автоматически создаём профиль клиента
        Client.objects.create(user=user)

        return user
