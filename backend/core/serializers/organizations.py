from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from core.models import Organization, Membership
from core.serializers.users import GetUserSerializer


class CreateOrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ["name", "email"]

    def validate(self, attrs):
        request = self.context.get('request')

        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError("User is not authenticated.")

        if Membership.objects.filter(user=request.user, is_active=True).exists():
            raise serializers.ValidationError(
                "User is already an admin or member of other organization"
            )

        return attrs

class GetOrganizationSerializer(serializers.ModelSerializer):
    members = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = "__all__"

        extra_kwargs = {field: {"read_only": True} for field in fields}

    def get_members(self, obj):

        members = obj.members.all()
        return GetUserSerializer(members, many=True).data


class UpdateOrganizationSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(
        validators=[UniqueValidator(queryset=Organization.objects.all())],
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Organization
        fields = ["name", "email", "is_active"]


class PartialUpdateOrganizationSerializer(serializers.ModelSerializer):
    name = serializers.CharField(required=False, allow_null=True)
    email = serializers.EmailField(
        validators=[UniqueValidator(queryset=Organization.objects.all())],
        required=False,
        allow_null=True,
    )
    is_active = serializers.BooleanField(required=False, allow_null=True)

    class Meta:
        model = Organization
        fields = ["name", "email", "is_active"]
