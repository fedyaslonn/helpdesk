from django.core.validators import MinLengthValidator
from rest_framework import serializers
from core.models import Ticket, Organization
from core.serializers.users_serializers import (
    SimpleUserSerializer,
    CreateUserSerializer,
)
from core.serializers.organizations_serializers import SimpleOrganizationSerializer


class SimpleTicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ticket
        fields = [
            "id",
            "title",
            "description",
            "status",
            "requestor",
            "assignee",
            "organization",
        ]


class CreateTicketSerializer(serializers.ModelSerializer):
    from core.models import User, Organization

    requestor = serializers.IntegerField(required=True)
    organization = serializers.IntegerField(required=True)
    assignee = serializers.IntegerField(required=False, allow_null=True)
    description = serializers.CharField(
        validators=[MinLengthValidator(8)],
        error_messages={
            "min_length": "Description field must have at least 8 characters"
        },
    )
    title = serializers.CharField(
        validators=[MinLengthValidator(2)],
        error_messages={"min_length": "Title field must have at least 2 characters"},
    )

    class Meta:
        model = Ticket
        fields = [
            "requestor",
            "organization",
            "assignee",
            "title",
            "description",
        ]

    def validate_assignee(self, value):
        if not value:
            return value

        organization_id = self.initial_data.get("organization")
        if not organization_id:
            raise serializers.ValidationError(
                "Organization is required for assignee validation"
            )

        try:
            organization = Organization.objects.get(id=organization_id)

        except Organization.DoesNotExist:
            raise serializers.ValidationError("Organization not found")

        if not organization.members.filter(id=value).exists():
            raise serializers.ValidationError("Assignee must be member of organization")

        return value


class GetTicketSerializer(serializers.ModelSerializer):
    requestor = SimpleUserSerializer()
    assignee = SimpleUserSerializer(allow_null=True)
    organization = SimpleOrganizationSerializer()

    class Meta:
        model = Ticket
        fields = [
            "id",
            "title",
            "description",
            "status",
            "requestor",
            "assignee",
            "organization",
        ]
        extra_kwargs = {field: {"read_only": True} for field in fields}


class UpdateTicketSerializer(serializers.ModelSerializer):
    assignee = serializers.IntegerField(required=False, allow_null=True)

    description = serializers.CharField(
        required=False,
        validators=[MinLengthValidator(8)],
        error_messages={
            "min_length": "Description field must have at least 2 characters"
        },
    )
    title = serializers.CharField(
        required=False,
        validators=[MinLengthValidator(2)],
        error_messages={"min_length": "Title field must have at least 2 characters"},
    )

    class Meta:
        model = Ticket
        fields = ["description", "organization", "title", "assignee", "status"]
        extra_kwargs = {"status": {"required": False}}

    def validate_assignee(self, value):
        from core.models import User

        if not value:
            return value

        organization_id = self.initial_data["organization"]

        try:
            organization = Organization.objects.get(id=organization_id)

        except Organization.DoesNotExist:
            raise serializers.ValidationError("Organization not found")

        if not organization.members.filter(id=value).exists():
            raise serializers.ValidationError(
                "Assignee must be a member of the ticket's organization"
            )

        return value

    def validate_status(self, value):
        valid_statuses = [status[0] for status in Ticket.Status.choices]
        if value not in valid_statuses:
            raise serializers.ValidationError("Invalid status value")
        return value


class PartialUpdateTicketSerializer(serializers.ModelSerializer):
    from core.models import User

    assignee = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), required=False, allow_null=True
    )
    description = serializers.CharField(
        required=False,
        validators=[MinLengthValidator(8)],
        error_messages={
            "min_length": "Description field must have at least 2 characters"
        },
    )
    title = serializers.CharField(
        required=False,
        validators=[MinLengthValidator(2)],
        error_messages={"min_length": "Title field must have at least 2 characters"},
    )

    status = serializers.ChoiceField(choices=Ticket.Status.choices, required=False)

    class Meta:
        model = Ticket
        fields = ["assignee", "description", "title", "status"]
