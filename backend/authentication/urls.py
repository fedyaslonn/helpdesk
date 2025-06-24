from authentication.views import (
    CheckAuthView,
    CustomTokenBlackListView,
    CustomTokenObtainPairView,
    CustomTokenRefreshView,
    LogoutView,
)
from django.urls import path
from rest_framework_simplejwt.views import (
    TokenVerifyView,
)

urlpatterns = [
    path("api/token/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", CustomTokenRefreshView.as_view(), name="token_refresh"),
    path("api/token/verify/", TokenVerifyView.as_view(), name="token_verify"),
    path(
        "api/token/blacklist/",
        CustomTokenBlackListView.as_view(),
        name="token_blacklist",
    ),
    path("logout/", LogoutView.as_view(), name="logout_view"),
    path("api/token/check_auth/", CheckAuthView.as_view(), name="check_auth"),
]
