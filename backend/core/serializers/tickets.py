from django.core.validators import MinLengthValidator
from rest_framework import serializers

from core.models import Organization, Ticket, User, Membership
from core.serializers.comments import GetCommentSerializer
from core.serializers.organizations import GetOrganizationSerializer
from core.serializers.users import GetUserSerializer


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
    organization = serializers.PrimaryKeyRelatedField(
        queryset=Organization.objects.all(),
        error_messages={"organization": "Organization does not exist"}
    )

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
            "organization",
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
    description = serializers.CharField(
        required=True,
        validators=[MinLengthValidator(8)],
        error_messages={"min_length": "Description must have at least 8 characters"}
    )
    title = serializers.CharField(
        required=True,
        validators=[MinLengthValidator(2)],
        error_messages={"min_length": "Title must have at least 2 characters"}
    )

    class Meta:
        model = Ticket
        fields = ["description", "title"]

    def validate(self, attrs):
        request = self.context.get('request')
        ticket = self.instance

        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError("User is not authenticated.")

        if ticket.requestor != request.user:
            raise serializers.ValidationError(
                "Only the ticket creator can update this ticket"
            )

        return attrs


class PartialUpdateTicketSerializer(serializers.ModelSerializer):
    description = serializers.CharField(
        required=False,
        allow_blank=True,
        validators=[MinLengthValidator(8)],
        error_messages={"min_length": "Description must have at least 8 characters"}
    )
    title = serializers.CharField(
        required=False,
        allow_blank=True,
        validators=[MinLengthValidator(2)],
        error_messages={"min_length": "Title must have at least 2 characters"}
    )
    status = serializers.ChoiceField(choices=Ticket.Status.choices, required=False)

    class Meta:
        model = Ticket
        fields = ["description", "title", "status"]

    def validate(self, attrs):
        request = self.context.get('request')
        user = request.user
        ticket = self.instance

        if not user.is_authenticated:
            raise serializers.ValidationError("User is not authenticated.")

        if 'description' in attrs or 'title' in attrs:
            if ticket.requestor != user:
                raise serializers.ValidationError(
                    "Only the ticket creator can update description or title"
                )

        if 'status' in attrs:
            is_org_admin = Membership.objects.filter(
                user=user,
                organization=ticket.organization,
                role=Membership.Role.ADMIN,
                is_active=True
            ).exists()

            is_assignee = (ticket.assignee == user)

            if not (is_org_admin or is_assignee):
                raise serializers.ValidationError(
                    "Only organization admins or the assignee can change the status"
                )

        return attrs
