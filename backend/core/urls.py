from django.urls import path

from core.views.comments import CommentsViewSet
from core.views.organizations import OrganizationsViewSet
from core.views.tickets import TicketsViewSet
from core.views.users import UsersViewSet

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


ticket_check_admin = TicketsViewSet.as_view({"get": "admin_check"})

get_current_user = UsersViewSet.as_view({"get": "get_current_user"})
ticket_assign = TicketsViewSet.as_view({"post": "assign"})


urlpatterns = [
    path("users/users_list/", user_list, name="user-list"),
    path("users/<int:pk>/", user_detail, name="user-detail"),
    path(
        "users/<int:pk>/update_password/",
        user_update_password,
        name="user-update-password",
    ),
    path(
        "users/<int:pk>/set_organization/",
        user_set_organization,
        name="user-set-organization",
    ),
    path(
        "users/<int:pk>/leave_organization/",
        user_leave_organization,
        name="user-leave-organization",
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
        "tickets/<int:pk>/assign/",
        ticket_assign,
        name="ticket-assign",
    ),
    path(
        "tickets/<int:pk>/",
        ticket_check_admin,
        name="ticket-check-admin",
    ),
    path("users/me/", get_current_user, name="current-user"),
    path(
        "organizations/<int:pk>/members/",
        organization_get_members,
        name="organizations-members",
    ),
]
