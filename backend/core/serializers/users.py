from datetime import date

from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from core.models import Membership, Organization, User


class GetUserSerializer(serializers.ModelSerializer):
    organization = serializers.SerializerMethodField()

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

    def get_organization(self, obj):
        if obj.organization:
            return {"id": obj.organization.id, "name": obj.organization.name}

        return None


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


class ShiftSerializer(serializers.Serializer):
    shift_start = serializers.TimeField(required=False, allow_null=True)
    shift_end = serializers.TimeField(required=False, allow_null=True)


class AdminAssignmentSerializer(serializers.Serializer):
    user_id = serializers.IntegerField(required=True)
    organization_id = serializers.IntegerField(required=True)

    def validate(self, attrs):
        user_id = attrs["user_id"]
        organization_id = attrs["organization_id"]
        request_user = self.context["request"].user

        try:
            organization = Organization.objects.get(id=organization_id)

        except Organization.DoesNotExist:
            raise serializers.ValidationError("Organization does not exist")

        if not Membership.objects.filter(
            user=request_user,
            organization=organization,
            role=Membership.Role.ADMIN,
            is_active=True,
        ).exists():
            raise serializers.ValidationError(
                "Only organization admins can assign roles"
            )

        if not Membership.objects.filter(
            user=user_id, organization=organization, is_active=True
        ).exists():
            raise serializers.ValidationError(
                "User is not a member of this organization"
            )

        return attrs
