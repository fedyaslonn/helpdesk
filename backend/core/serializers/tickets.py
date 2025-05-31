from core.models import Organization, Ticket, User
from core.serializers.comments_serializers import GetCommentSerializer
from core.serializers.organizations_serializers import GetOrganizationSerializer
from core.serializers.users_serializers import GetUserSerializer

from django.core.validators import MinLengthValidator
from rest_framework import serializers


class SimpleTicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ticket
        fields = [
            "title",
            "description",
            "status",
            "requestor",
            "assignee",
            "organization",
        ]


class CreateTicketSerializer(serializers.ModelSerializer):
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


class GetTicketSerializer(serializers.ModelSerializer):
    requestor = GetUserSerializer()
    assignee = GetUserSerializer(allow_null=True)
    organization = GetOrganizationSerializer()
    comments = GetCommentSerializer(many=True)

    class Meta:
        model = Ticket
        fields = [
            "id",
            "requestor",
            "assignee",
            "title",
            "description",
            "status",
            "comments",
            "organization",
        ]

        extra_kwargs = {field: {"read_only": True} for field in fields}


class UpdateTicketSerializer(serializers.ModelSerializer):
    assignee = serializers.IntegerField(required=False, allow_null=True)
    organization = serializers.IntegerField(read_only=True)

    description = serializers.CharField(
        required=True,
        validators=[MinLengthValidator(8)],
        error_messages={
            "min_length": "Description field must have at least 2 characters"
        },
    )
    title = serializers.CharField(
        required=True,
        validators=[MinLengthValidator(2)],
        error_messages={"min_length": "Title field must have at least 2 characters"},
    )

    class Meta:
        model = Ticket
        fields = ["description", "organization", "title", "assignee", "status"]

    def validate_status(self, value):
        valid_statuses = [status[0] for status in Ticket.Status.choices]
        if value not in valid_statuses:
            raise serializers.ValidationError("Invalid status value")
        return value


class PartialUpdateTicketSerializer(serializers.ModelSerializer):
    assignee = serializers.IntegerField(required=False, allow_null=True)
    description = serializers.CharField(
        required=False,
        allow_null=True,
        validators=[MinLengthValidator(8)],
        error_messages={
            "min_length": "Description field must have at least 2 characters"
        },
    )
    title = serializers.CharField(
        required=False,
        allow_null=True,
        validators=[MinLengthValidator(2)],
        error_messages={"min_length": "Title field must have at least 2 characters"},
    )

    status = serializers.ChoiceField(choices=Ticket.Status.choices, required=False)

    class Meta:
        model = Ticket
        fields = ["assignee", "description", "organization", "title", "status"]
