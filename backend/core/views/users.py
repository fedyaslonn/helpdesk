import logging

from django.contrib.auth.hashers import check_password
from django.db import DatabaseError, IntegrityError
from django.db.models import ObjectDoesNotExist, Prefetch, Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from core.models import Comment, Organization, Ticket, User
from core.serializers.users import (
    CreateUserSerializer,
    GetUserSerializer,
    PartialUpdateUserSerializer,
    UpdateUserSerializer,
)

logger = logging.getLogger(__name__)


class UsersViewSet(viewsets.ViewSet):
    def list(self, request):
        queryset = User.objects.select_related("organization").all()
        serializer = GetUserSerializer(queryset, many=True)

        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        try:
            user = User.objects.select_related("organization").get(pk=pk)

        except ObjectDoesNotExist:
            return Response(
                {"error": "User not found"}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = GetUserSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def create(self, request):
        serializer = CreateUserSerializer(data=request.data)

        try:
            serializer.is_valid(raise_exception=True)
            validated_data = serializer.validated_data

        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.create(
                email=validated_data["email"],
                username=validated_data["username"],
                first_name=validated_data.get("first_name", ""),
                last_name=validated_data.get("last_name", ""),
                date_birth=validated_data.get("date_birth"),
            )

            user.set_password(validated_data["password"])
            user.save()

            refresh = RefreshToken.for_user(user)

            user_with_org = User.objects.select_related("organization").get(pk=user.id)

            response_data = GetUserSerializer(user_with_org).data

            response_data["tokens"] = {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            }

        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_400_BAD_REQUEST)

        except IntegrityError as e:
            return Response(
                {"error": f"Integrity error: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        except DatabaseError as e:
            return Response(
                {"error": f"Database error: {str(e)}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        except Exception as e:
            return Response(
                {"error": f"Failed to create user: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(response_data, status=status.HTTP_201_CREATED)

    def update(self, request, pk=None):
        try:
            user = User.objects.select_related("organization").get(pk=pk)

        except ObjectDoesNotExist:
            return Response(
                {"error": "User not found"}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = UpdateUserSerializer(data=request.data, partial=False)

        try:
            serializer.is_valid(raise_exception=True)
            validated_data = serializer.validated_data

        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_400_BAD_REQUEST)

        try:
            if "email" in validated_data:
                user.email = validated_data.get("email")
            if "username" in validated_data:
                user.username = validated_data.get("username")
            if "first_name" in validated_data:
                user.first_name = validated_data.get("first_name")
            if "last_name" in validated_data:
                user.last_name = validated_data.get("last_name")
            if "date_birth" in validated_data:
                user.date_birth = validated_data.get("date_birth")

            user.save()

        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_400_BAD_REQUEST)

        except IntegrityError as e:
            return Response(
                {"error": f"Integrity error: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        except DatabaseError as e:
            return Response(
                {"error": f"Database error: {str(e)}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        except Exception as e:
            return Response(
                {"error": f"Failed to update user: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        response = GetUserSerializer(user)
        return Response(response.data, status=status.HTTP_200_OK)

    def partial_update(self, request, pk=None):
        try:
            user = User.objects.select_related("organization").get(pk=pk)

        except ObjectDoesNotExist as e:
            return Response(
                {"error": "User not found"}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = PartialUpdateUserSerializer(data=request.data, partial=True)

        try:
            serializer.is_valid(raise_exception=True)
            validated_data = serializer.validated_data

            for attr, value in validated_data.items():
                setattr(user, attr, value)

            user.save()

        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_400_BAD_REQUEST)

        except IntegrityError as e:
            return Response(
                {"error": f"Integrity error: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        except DatabaseError as e:
            return Response(
                {"error": f"Database error: {str(e)}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        except Exception as e:
            return Response(
                {"error": f"Failed to update user: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        response = GetUserSerializer(user)
        return Response(response.data, status=status.HTTP_200_OK)

    def destroy(self, request, pk=None):
        try:
            user = User.objects.get(pk=pk)

            user.delete()
            logger.info(f"User {user.id} deleted successfully!")

            return Response(
                {"status": "User deleted successfully!"},
                status=status.HTTP_204_NO_CONTENT,
            )

        except ObjectDoesNotExist:
            return Response(
                {"error": "User not found"}, status=status.HTTP_404_NOT_FOUND
            )

        except DatabaseError as e:
            return Response(
                {"error": f"Database error: {str(e)}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        except Exception as e:
            return Response(
                {"error": f"Failed to delete user {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["post"])
    def update_password(self, request, pk=None):
        try:
            user = User.objects.get(pk=pk)

        except ObjectDoesNotExist:
            return Response(
                {"error": "User not found"}, status=status.HTTP_404_NOT_FOUND
            )

        old_password = user.password

        old_password_from_request = request.data.get("old_password")
        password = request.data.get("password")
        password2 = request.data.get("password2")

        if not password or not password2:
            return Response(
                {"error": "New passwords are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if password != password2:
            return Response(
                {"error": "New passwords do not match"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not check_password(old_password_from_request, old_password):
            return Response(
                {"error": "Old password is incorrect"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if check_password(password, old_password):
            return Response(
                {"error": "New password must be different from the old one"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user.set_password(password)
            user.save()

        except DatabaseError as e:
            return Response(
                {"error": f"Database error: {str(e)}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        except Exception as e:
            return Response(
                {"error": f"Failed to update password: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        return Response(
            {"status": "Password updated successfully"}, status=status.HTTP_200_OK
        )

    @action(detail=True, methods=["post"])
    def set_organization(self, request, pk=None):
        organization_id = request.data.get("organization_id")

        if not organization_id:
            return Response(
                {"error": "organization_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            user = User.objects.get(Q(pk=pk) & Q(organization__isnull=True))

        except User.DoesNotExist:
            return Response(
                {"error": "User not found or user is already member of organization"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            organization = Organization.objects.get(pk=organization_id)

        except Organization.DoesNotExist:
            return Response(
                {"error": "Organization not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        user.organization = organization
        user.save()

        response = GetUserSerializer(user)
        return Response(data=response.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def leave_organization(self, request, pk=None):
        try:
            user = User.objects.get(Q(pk=pk) & Q(organization__isnull=False))

        except User.DoesNotExist:
            return Response(
                {"error": "User not found or user is already member of organization"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.organization = None
        user.save()

        response = GetUserSerializer(user)
        return Response(data=response.data, status=status.HTTP_200_OK)
