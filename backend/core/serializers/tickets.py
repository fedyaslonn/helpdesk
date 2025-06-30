from datetime import timezone

from django.core.validators import MinLengthValidator
from rest_framework import serializers

from core.models import Membership, Organization, Ticket, User
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
        error_messages={"organization": "Organization does not exist"},
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
        error_messages={"min_length": "Description must have at least 8 characters"},
    )
    title = serializers.CharField(
        required=True,
        validators=[MinLengthValidator(2)],
        error_messages={"min_length": "Title must have at least 2 characters"},
    )

    class Meta:
        model = Ticket
        fields = ["description", "title"]

    def validate(self, attrs):
        request = self.context.get("request")
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
        error_messages={"min_length": "Description must have at least 8 characters"},
    )
    title = serializers.CharField(
        required=False,
        allow_blank=True,
        validators=[MinLengthValidator(2)],
        error_messages={"min_length": "Title must have at least 2 characters"},
    )
    status = serializers.ChoiceField(choices=Ticket.Status.choices, required=False)

    class Meta:
        model = Ticket
        fields = ["description", "title", "status"]

    def validate(self, attrs):
        request = self.context.get("request")
        user = request.user
        ticket = self.instance
        current_time = timezone.now().time()

        if not user.is_authenticated:
            raise serializers.ValidationError("User is not authenticated.")

        if "description" in attrs or "title" in attrs:
            if ticket.requestor != user:
                raise serializers.ValidationError(
                    "Only the ticket creator can update description or title"
                )

        if "status" in attrs:
            is_org_admin = Membership.objects.filter(
                user=user,
                organization=ticket.organization,
                role=Membership.Role.ADMIN,
                is_active=True,
            ).exists()

            is_assignee = ticket.assignee == user

            if not (is_org_admin or is_assignee):
                raise serializers.ValidationError(
                    "Only organization admins or the assignee can change the status"
                )

            if is_assignee and not is_org_admin:
                membership = Membership.objects.filter(
                    user=user,
                    organization=ticket.organization,
                    is_active=True,
                ).first()

                if membership and membership.shift_start and membership.shift_end:
                    shift_start = membership.shift_start
                    shift_end = membership.shift_end

                    if shift_start <= shift_end:
                        if not (shift_start <= current_time <= shift_end):
                            raise serializers.ValidationError(
                                "You can only change status during your working shift"
                            )
                    else:
                        if not (
                            current_time >= shift_start or current_time <= shift_end
                        ):
                            raise serializers.ValidationError(
                                "You can only change status during your working shift"
                            )

            if attrs["status"] == ticket.status:
                raise serializers.ValidationError(
                    {"status": "New statis must be different from old"}
                )

        return attrs


class ChangeAssigneeSerializer(serializers.ModelSerializer):
    old_assignee = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        error_messages={"user": "User does not exist"},
        required=True,
    )

    new_assignee = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        error_messages={"user": "User does not exist"},
        required=True,
    )

    class Meta:
        model = Ticket
        fields = ["old_assignee", "new_assignee"]

    def validate_old_assignee(self, val):
        ticket = self.instance

        if ticket.assignee is None:
            if val is not None:
                raise serializers.ValidationError(
                    {
                        "old_assignee": "Ticket has no assignee but old assignee was provided"
                    }
                )

        if ticket.assignee != val:
            raise serializers.ValidationError(
                {
                    "old_assignee": "Provided assignee does not match current ticket assignee"
                }
            )

        return val

    def validate_new_assignee(self, val):
        ticket = self.instance

        if not Membership.objects.filter(
            user=val, organization=ticket.organization, is_active=True
        ).exists():
            raise serializers.ValidationError(
                {
                    "new_assignee": "User is not an active member of the ticket's organization"
                }
            )

        return val

    def validate(self, attrs):
        if attrs["old_assignee"] == attrs["new_assignee"]:
            raise serializers.ValidationError(
                {"new_assignee": "New assignee must be different from old assignee"}
            )

        return attrs


class RemoveAssigneeSerializer(serializers.Serializer):
    def validate(self, attrs):
        ticket = self.context.get("ticket")

        if ticket.assignee is None:
            raise serializers.ValidationError({"assignee": "Ticket has no assignee"})

        return attrs


class SetAssigneeSerializer(serializers.ModelSerializer):
    assignee = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        error_messages={"user": "User does not exist"},
        required=True,
    )

    class Meta:
        model = Ticket
        fields = ["assignee"]

    def validate_assignee(self, val):
        ticket = self.instance

        if not Membership.objects.filter(
            user=val, organization=ticket.organization, is_active=True
        ).exists():
            raise serializers.ValidationError(
                {
                    "new_assignee": "User is not an active member of the ticket's organization"
                }
            )

        return val

    def validate(self, attrs):
        ticket = self.instance

        if ticket.assignee:
            raise serializers.ValidationError("Ticket has already been assigned")

        return attrs
