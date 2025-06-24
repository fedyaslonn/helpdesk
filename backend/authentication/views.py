from django.core.exceptions import ObjectDoesNotExist
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.serializers import Serializer
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.token_blacklist.models import (
    BlacklistedToken,
    OutstandingToken,
)
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken
from rest_framework_simplejwt.views import (
    TokenBlacklistView,
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

from authentication.serializers import (
    CustomTokenBlackListSerializer,
    CustomTokenObtainPairSerializer,
    CustomTokenRefreshSerializer,
    LogoutSerializer,
)

# Create your views here.


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer  # type: ignore
    permission_classes = (AllowAny,)  # type: ignore


class CustomTokenRefreshView(TokenRefreshView):
    serializer_class = CustomTokenRefreshSerializer  # type: ignore


class CustomTokenBlackListView(TokenBlacklistView):
    serializer_class = CustomTokenBlackListSerializer  # type: ignore


class LogoutView(APIView):
    def post(self, request):
        serializer = LogoutSerializer(data=request.data)

        serializer.is_valid(raise_exception=True)
        token = serializer.validated_data["refresh_token"]

        try:
            token.blacklist()

            user_id = token.payload.get("user_id")

            active_tokens = OutstandingToken.objects.filter(user_id=user_id)

            for active_token in active_tokens:
                if not BlacklistedToken.objects.filter(token=active_token).exists():
                    BlacklistedToken.objects.create(token=active_token)

            response = Response(
                {"detail": "Successfully logged out"},
                status=status.HTTP_205_RESET_CONTENT,
            )

            return response

        except Exception as e:
            return Response(
                {"detail": "An error occurred during logout"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class CheckAuthView(APIView):
    def get(self, request):
        if request.user.is_authenticated:
            return Response(
                {
                    "user": {
                        "id": request.user.id,
                        "email": request.user.email,
                    }
                }
            )

        else:
            return Response({"user": "Unauthorized"}, status=401)
