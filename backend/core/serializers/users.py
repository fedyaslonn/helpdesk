from datetime import date

from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from core.models import User


class GetUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "organization",
            "last_login",
            "first_name",
            "last_name",
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
            "first_name",
            "last_name",
            "password",
            "password2",
            "date_birth",
        ]

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError(
                {"password": "Password fields didn't match"}
            )

        return attrs

    def validate_date_birth(self, value):
        if value > timezone.now():
            raise serializers.ValidationError("Birth date cannot be in the future")
        return value


class UpdateUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "email",
            "username",
            "first_name",
            "last_name",
            "date_birth",
        ]

    def validate_date_birth(self, value):
        if value > timezone.now():
            raise serializers.ValidationError("Birth date cannot be in the future")
        return value


class PartialUpdateUserSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(
        validators=[UniqueValidator(queryset=User.objects.all())], required=False
    )
    username = serializers.CharField(
        validators=[UniqueValidator(queryset=User.objects.all())], required=False
    )
    first_name = serializers.CharField(required=False)
    last_name = serializers.CharField(required=False)
    date_birth = serializers.DateField(required=False)

    class Meta:
        model = User
        fields = ["email", "username", "first_name", "last_name", "date_birth"]

    def validate_date_birth(self, value):
        if value > date.today():
            raise serializers.ValidationError("Birth date cannot be in the future")
        return value
