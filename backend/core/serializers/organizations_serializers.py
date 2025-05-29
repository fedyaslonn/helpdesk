from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from core.models import Organization


class CreateOrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ["name", "email"]


class SimpleOrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = "__all__"


class GetOrganizationSerializer(serializers.ModelSerializer):
    members = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = ["id", "name", "email", "is_active", "created_at", "members"]

        extra_kwargs = {field: {"read_only": True} for field in fields}

    def get_members(self, obj):
        from core.serializers.users_serializers import SimpleUserSerializer

        members = obj.members.all()
        return SimpleUserSerializer(members, many=True).data


class UpdateOrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ["name", "email", "is_active"]


class PartialUpdateOrganizationSerializer(serializers.ModelSerializer):
    name = serializers.CharField(required=False)
    email = serializers.EmailField(
        validators=[UniqueValidator(queryset=Organization.objects.all())],
        required=False,
    )
    is_active = serializers.BooleanField(required=False)

    class Meta:
        model = Organization
        fields = ["name", "email", "is_active"]
