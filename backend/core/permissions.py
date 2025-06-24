from django.db.models import Q
from rest_framework import permissions

from core.models import Membership, Organization


class IsAdminOfOrganization(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.memberships.filter(
            user=request.user,
            role=Membership.Role.ADMIN,
            is_active=True,
        ).exists()


class IsAdminOrAssignee(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return (
            obj.organization.memberships.filter(
                user=request.user,
                role=Membership.Role.ADMIN,
                is_active=True,
            ).exists()
            or obj.assignee.id == request.user.id
        )
