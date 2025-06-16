from rest_framework import serializers

from core.models import Membership, User
from core.serializers.users import GetUserSerializer


class GetMembershipSerializer(serializers.ModelSerializer):
    user = GetUserSerializer(read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = Membership
        fields = ['user', 'role', 'role_display', 'is_active']
