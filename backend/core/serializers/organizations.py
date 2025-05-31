from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from core.models import Organization
from core.serializers.users_serializers import GetUserSerializer


class CreateOrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ["name", "email"]


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
