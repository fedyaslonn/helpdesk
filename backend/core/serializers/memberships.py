from rest_framework import serializers

from core.models import Membership, User
from core.serializers.users import GetUserSerializer


class GetMembershipSerializer(serializers.ModelSerializer):
    user = GetUserSerializer(read_only=True)
    role_display = serializers.CharField(source="get_role_display", read_only=True)

    organization = serializers.SerializerMethodField()

    class Meta:
        model = Membership
        fields = [
            "user",
            "role",
            "role_display",
            "organization",
            "shift_start",
            "shift_end",
            "is_active",
        ]

    def get_organization(self, obj):
        return {"id": obj.organization.id, "name": obj.organization.name}
