import logging

from django.contrib.auth import authenticate, get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import (
    TokenBlacklistSerializer,
    TokenObtainPairSerializer,
    TokenRefreshSerializer,
)
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

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
