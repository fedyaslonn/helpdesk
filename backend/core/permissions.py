from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions

from core.models import Membership, Organization, Ticket


class IsAdminOfOrganization(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.memberships.filter(
            user=request.user, role=Membership.Role.ADMIN, is_active=True
        ).exists()


class IsAdminOrAssignee(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return (
            obj.organization.memberships.filter(
                user=request.user, role=Membership.Role.ADMIN, is_active=True
            ).exists()
            or obj.assignee.id == request.user.id
        )


class HasPermissionToTicketComments(permissions.BasePermission):
    def has_permission(self, request, view):
        ticket_pk = view.kwargs.get("ticket_pk")
        if not ticket_pk:
            return False

        try:
            ticket = Ticket.objects.get(pk=ticket_pk)
        except Ticket.DoesNotExist:
            return False

        return self.check_access(request.user, ticket)

    def has_object_permission(self, request, view, obj):
        return self.check_access(request.user, obj.ticket)

    def get_ticket(self, ticket_pk):
        return get_object_or_404(Ticket, pk=ticket_pk)

    def check_access(self, user, ticket):
        if user == ticket.requestor:
            return True

        if Membership.objects.filter(
            user=user,
            organization=ticket.organization,
            role=Membership.Role.ADMIN,
            is_active=True,
        ).exists():
            return True

        if user == ticket.assignee:
            return Membership.objects.is_worker_on_shift(user, ticket.organization)

        return False
