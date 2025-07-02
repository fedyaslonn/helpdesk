from datetime import timedelta

from django.core.exceptions import PermissionDenied
from django.utils import timezone
from rest_framework import serializers

from core.models import Application, Membership, Organization, User


class CreateApplicationSerializer(serializers.ModelSerializer):
    organization_id = serializers.IntegerField(write_only=True, required=True)

    class Meta:
        model = Application
        fields = ["organization_id"]

    def validate_organization_id(self, value):
        if not Organization.objects.filter(pk=value).exists():
            raise serializers.ValidationError("Organization not found")
        return value

    def validate(self, attrs):
        user = self.context["user"]

        if self.context["request"].user != self.context["user"]:
            raise PermissionDenied(
                "You can only apply for organizations on your own account"
            )

        organization_id = attrs["organization_id"]
        organization = Organization.objects.get(pk=organization_id)

        if user.organization:
            raise serializers.ValidationError("User already belongs to an organization")

        if user.last_organization_leave:
            cooldown_end = user.last_organization_leave + timedelta(hours=24)
            if timezone.now() < cooldown_end:
                raise serializers.ValidationError("24 hours cooldown active")

        if Application.objects.filter(
            user=user,
            organization=organization,
            status=Application.Status.PENDING,
        ).exists():
            raise serializers.ValidationError("Application already exists")

        if not Membership.objects.filter(
            organization=organization,
            role=Membership.Role.ADMIN,
            is_active=True,
        ).exists():
            raise serializers.ValidationError("Organization has no active admin")

        attrs["organization"] = organization
        del attrs["organization_id"]

        return attrs


class GetApplicationSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(read_only=True)
    organization = serializers.PrimaryKeyRelatedField(read_only=True)

    username = serializers.CharField(source="user.username", read_only=True)
    organization_name = serializers.CharField(
        source="organization.name", read_only=True
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Application
        fields = "__all__"
