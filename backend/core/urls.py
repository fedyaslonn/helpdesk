from django.urls import path

from core.views.comments import CommentsViewSet
from core.views.organizations import OrganizationsViewSet
from core.views.tickets import TicketsViewSet
from core.views.users import UsersViewSet
from core.views.applications import ApplicationsViewSet

user_list = UsersViewSet.as_view({"get": "list", "post": "create"})

user_detail = UsersViewSet.as_view(
    {"get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"}
)

user_update_password = UsersViewSet.as_view({"post": "update_password"})

user_set_organization = UsersViewSet.as_view({"post": "set_organization"})

user_leave_organization = UsersViewSet.as_view({"post": "leave_organization"})

organization_list = OrganizationsViewSet.as_view({"get": "list", "post": "create"})

organization_detail = OrganizationsViewSet.as_view(
    {"get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"}
)

organization_get_members = OrganizationsViewSet.as_view({"get": "get_members"})

comment_creation = CommentsViewSet.as_view({"get": "list", "post": "create"})

comment_detail = CommentsViewSet.as_view(
    {"get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"}
)

ticket_list = TicketsViewSet.as_view({"get": "list", "post": "create"})

ticket_detail = TicketsViewSet.as_view(
    {"get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"}
)

ticket_change_assignee = TicketsViewSet.as_view({"post": "change_assignee"})
ticket_remove_assignee = TicketsViewSet.as_view({"post": "remove_assignee"})
ticket_set_assignee = TicketsViewSet.as_view({"post": "set_assignee"})
ticket_check_admin = TicketsViewSet.as_view({"get": "admin_check"})

users_apply_for_organization = UsersViewSet.as_view({"post": "apply_for_organization"})
users_update_shift = UsersViewSet.as_view({"post": "update_shift"})
users_assign_to_admin = UsersViewSet.as_view({"post": "assign_to_admin"})

applications_list = ApplicationsViewSet.as_view({"get": "organization_applications"})
accept_application = ApplicationsViewSet.as_view({"post": "accept_application"})
reject_application = ApplicationsViewSet.as_view({"post": "reject_application"})

get_current_user = UsersViewSet.as_view({"get": "get_current_user"})

urlpatterns = [
    path("users/users_list/", user_list, name="user-list"),
    path("users/<int:pk>/", user_detail, name="user-detail"),
    path(
        "users/<int:pk>/update_password/",
        user_update_password,
        name="user-update-password",
    ),
    path(
        "users/<int:pk>/d/",
        user_set_organization,
        name="user-set-organization",
    ),
    path(
        "users/<int:pk>/leave_organization/",
        user_leave_organization,
        name="user-leave-organization",
    ),
    path(
        "users/<int:pk>/apply_for_organization/",
        users_apply_for_organization,
        name="apply-for-organization",
    ),
    path(
        "organizations/organizations_list/", organization_list, name="organization-list"
    ),
    path("organizations/<int:pk>/", organization_detail, name="organization-detail"),
    path(
        "tickets/<int:ticket_pk>/comments/", comment_creation, name="comment-creation"
    ),
    path(
        "tickets/<int:ticket_pk>/comments/<int:pk>/",
        comment_detail,
        name="comment-detail",
    ),
    path("tickets/tickets_list/", ticket_list, name="ticket-list"),
    path("tickets/<int:pk>/", ticket_detail, name="ticket-detail"),
    path(
        "tickets/<int:pk>/change_assignee/",
        ticket_change_assignee,
        name="ticket-change-assignee",
    ),
    path(
        "tickets/<int:pk>/remove_assignee/",
        ticket_remove_assignee,
        name="ticket-remove-assignee",
    ),
    path(
        "tickets/<int:pk>/set_assignee/",
        ticket_set_assignee,
        name="ticket-set-assignee",
    ),
    path(
        "tickets/<int:pk>/check_admin/",
        ticket_check_admin,
        name="ticket-check-admin",
    ),
    path("users/me/", get_current_user, name="current-user"),
    path(
        "organizations/<int:pk>/members/",
        organization_get_members,
        name="organizations-members",
    ),
    path("users/<int:pk>/update_shifts/", users_update_shift, name="update-shift"),
    path(
        "applications/organization_applications/",
        applications_list,
        name="organization-applications"
    ),
    path(
        "applications/<int:pk>/accept_application/",
        accept_application,
        name="accept-application"
    ),
    path(
        "applications/<int:pk>/reject_application/",
        reject_application,
        name="reject-application"
    ),
    path(
        "users/<int:pk>/assign_to_admin/",
        users_assign_to_admin,
        name="assign-to-admin"
    ),
]
