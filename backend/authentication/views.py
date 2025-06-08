from datetime import timezone
from http.client import responses

from authentication.serializers import CustomTokenObtainPairSerializer, CustomTokenRefreshSerializer, CustomTokenBlackListSerializer
from rest_framework_simplejwt.views import TokenVerifyView, TokenRefreshView, TokenBlacklistView, TokenObtainPairView
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken, AccessToken
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
from rest_framework_simplejwt.authentication import JWTAuthentication

from django.core.exceptions import ObjectDoesNotExist

# Create your views here.

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            access_token = response.data['access']
            refresh_token = response.data['refresh']

            user_id = response.data.get('user_id')
            email = response.data.get('email')

            response.set_cookie('access_token', access_token)
            response.set_cookie('refresh_token', refresh_token)
            response.set_cookie('user_id', user_id)
            response.set_cookie('email', email)

        return response


class CustomTokenRefreshView(TokenRefreshView):
    serializer_class = CustomTokenRefreshSerializer


class CustomTokenBlackListView(TokenBlacklistView):
    serializer_class = CustomTokenBlackListSerializer


class LogoutView(APIView):
    def post(self, request):
        refresh_token = request.data.get("refresh_token")

        if not refresh_token:
            return Response(
                {"error": "Refresh token is missing"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()

            user_id = token.payload.get('user_id')

            active_tokens = OutstandingToken.objects.filter(
                user_id=user_id
            )

            for active_token in active_tokens:
                if not BlacklistedToken.objects.filter(token=active_token).exists():
                    BlacklistedToken.objects.create(token=active_token)


            response = Response(
                {"detail": "Successfully logged out"},
                status=status.HTTP_205_RESET_CONTENT
            )
            response.delete_cookie('access_token')
            response.delete_cookie('refresh_token')
            response.delete_cookie('user_id')
            response.delete_cookie('email')

            return response

        except TokenError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        except Exception as e:
            return Response(
                {"detail": "An error occurred during logout"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CheckAuthView(APIView):
    def get(self, request):
        if request.user.is_authenticated:
            return Response(
                {
                    'user': {
                        'id': request.user.id,
                        'email': request.user.email,
                    }
                }
            )

        else:
            return Response({'user': 'Unauthorized'}, status=401)
