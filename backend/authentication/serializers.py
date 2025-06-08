from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer, TokenBlacklistSerializer
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken
from django.contrib.auth import get_user_model
from django.contrib.auth import authenticate
from rest_framework import serializers

import logging

logger = logging.getLogger(__name__)

User = get_user_model()

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        return token

    def validate(self, attrs):
        validate_data = super().validate(attrs)

        validate_data.update({
            "user_id": self.user.id,
            "email": self.user.email,
            }
        )
        return validate_data


class CustomTokenRefreshSerializer(TokenRefreshSerializer):
    def validate(self, attrs):

        refresh_token = RefreshToken(attrs['refresh'])
        user_id = refresh_token.payload.get('user_id')
        validated_data = super().validate(attrs)

        refresh_token.blacklist()

        validated_data.update({
            'access':  validated_data.get('access'),
            'user_id': user_id,
        })

        return validated_data


class CustomTokenBlackListSerializer(TokenBlacklistSerializer):
    def validate(self, attrs):
        validated_data = super().validate(attrs)

        validated_data['message'] = "Token has been blacklisted"

        return validated_data
