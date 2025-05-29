from core.views import CommentViewSet, OrganizationViewSet, TicketViewSet, UserViewSet
from django.urls import path

user_list = UserViewSet.as_view({"get": "list", "post": "create"})

user_detail = UserViewSet.as_view(
    {"get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"}
)

user_update_password = UserViewSet.as_view({"post": "update_password"})

user_set_organization = UserViewSet.as_view({"post": "set_organization"})

user_leave_organization = UserViewSet.as_view({"post": "leave_organization"})

organization_list = OrganizationViewSet.as_view({"get": "list", "post": "create"})

organization_detail = OrganizationViewSet.as_view(
    {"get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"}
)

comment_list = CommentViewSet.as_view({"get": "list", "post": "create"})

comment_detail = CommentViewSet.as_view(
    {"get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"}
)

ticket_list = TicketViewSet.as_view({"get": "list", "post": "create"})

ticket_detail = TicketViewSet.as_view(
    {"get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"}
)

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
    path("comments/comments_list/", comment_list, name="comment-list"),
    path("comments/<int:pk>/", comment_detail, name="comment-detail"),
    path("tickets/tickets_list/", ticket_list, name="ticket-list"),
    path("tickets/<int:pk>/", ticket_detail, name="ticket-detail"),
]
