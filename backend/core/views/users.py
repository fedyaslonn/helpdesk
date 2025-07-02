from datetime import timedelta
import logging

from django.contrib.auth.hashers import check_password
from django.db import DatabaseError, IntegrityError, transaction
from django.db.models import ObjectDoesNotExist, Prefetch, Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from core.models import Application, Comment, Membership, Organization, Ticket, User
from core.serializers.applications import (
    CreateApplicationSerializer,
    GetApplicationSerializer,
)
from core.serializers.users import (
    AdminAssignmentSerializer,
    CreateUserSerializer,
    GetUserSerializer,
    PartialUpdateUserSerializer,
    ShiftSerializer,
    UpdateUserSerializer,
)
from core.tasks import send_apply_for_organization_notification

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

        try:
            if Membership.objects.filter(user=user, is_active=True).exists():
                return Response(
                    {
                        "error": "User already has an active membership in another organization"
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except Exception as e:
            return Response(
                {"error": f"Failed to check memberships: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        try:
            with transaction.atomic():
                user.organization = organization
                user.save()

                membership = Membership.objects.create(
                    user=user, organization=user.organization, is_active=True
                )

                membership.save()

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
                {"error": f"Failed to set organization: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        response = GetUserSerializer(user)
        return Response(data=response.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def leave_organization(self, request, pk=None):
        try:
            user = User.objects.get(Q(pk=pk) & Q(organization__isnull=False))

            is_self_removal = user == request.user
            is_admin_removal = Membership.objects.filter(
                user=request.user,
                organization=user.organization,
                role=Membership.Role.ADMIN,
                is_active=True,
            ).exists()

            if not (is_self_removal or is_admin_removal):
                raise PermissionDenied(
                    "User can be removed from organization only by himself or admin of the organization"
                )

            if Ticket.objects.active_tickets_for_user(user, user.organization).exists():
                return Response(
                    {"error": "Cannot leave organization with active tickets"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        except User.DoesNotExist:
            return Response(
                {"error": "User not found or user is already member of organization"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except PermissionDenied as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            with transaction.atomic():
                membership = Membership.objects.get(
                    user=user, organization=user.organization, is_active=True
                )

                membership.is_active = False
                membership.save()

                user.organization = None
                user.last_organization_leave = timezone.now()
                user.save()

        except Membership.DoesNotExist:
            return Response(
                {"error": "Active membership not found for this organization"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except DatabaseError as e:
            return Response(
                {"error": f"Database error: {str(e)}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except Exception as e:
            return Response(
                {"error": f"Failed to leave organization: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        response = GetUserSerializer(user)
        return Response(data=response.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def apply_for_organization(self, request, pk=None):
        try:
            user = User.objects.get(pk=pk)

        except User.DoesNotExist:
            return Response(
                {"error": "User not found"}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = CreateApplicationSerializer(
            data=request.data, context={"user": user, "request": request}
        )

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        validated_data = serializer.validated_data
        organization = validated_data.get("organization")

        try:
            with transaction.atomic():
                application = Application.objects.create(
                    user=user,
                    organization=organization,
                    status=Application.Status.PENDING,
                )

                admin = (
                    User.objects.filter(
                        organization=organization,
                        memberships__role=Membership.Role.ADMIN,
                        memberships__is_active=True,
                    )
                    .select_related("organization")
                    .first()
                )

                transaction.on_commit(
                    lambda a=admin, u=user, o=organization: send_apply_for_organization_notification.delay(
                        a.email, u.username, o.name
                    )
                )

            response_serializer = GetApplicationSerializer(application)

            return Response(
                {
                    "status": "Application submitted successfully",
                    "organization": response_serializer.data,
                },
                status=status.HTTP_201_CREATED,
            )

        except Membership.DoesNotExist:
            return Response(
                {"error": "Admin not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        except PermissionDenied as e:
            return Response({"error": f"{str(e)}"}, status=status.HTTP_403_FORBIDDEN)

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
            logger.error(f"Error creating application: {str(e)}", exc_info=True)
            return Response(
                {"error": "Failed to process application"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["get"])
    def get_current_user(self, request):
        if not request.user.is_authenticated:
            return Response(
                {"error": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        user = request.user
        serializer = GetUserSerializer(user)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def update_shift(self, request, pk=None):
        try:
            worker = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found"}, status=status.HTTP_404_NOT_FOUND
            )

        try:
            worker_membership = Membership.objects.get(user=worker, is_active=True)
        except Membership.DoesNotExist:
            return Response(
                {"error": "User is not an active worker"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            admin_membership = Membership.objects.get(
                user=request.user,
                organization=worker_membership.organization,
                role=Membership.Role.ADMIN,
                is_active=True,
            )
        except Membership.DoesNotExist:
            return Response(
                {"error": "You must be an admin of the organization to update shifts"},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = ShiftSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        shift_start = serializer.validated_data.get("shift_start")
        shift_end = serializer.validated_data.get("shift_end")

        try:
            with transaction.atomic():
                if shift_start is not None:
                    worker_membership.shift_start = shift_start
                if shift_end is not None:
                    worker_membership.shift_end = shift_end

                worker_membership.save()

                logger.info(
                    f"Admin {request.user.id} updated shift for worker {worker.id} "
                    f"in organization {worker_membership.organization.id}: "
                    f"{shift_start or 'No change'} - {shift_end or 'No change'}"
                )

                return Response(
                    {"status": "Shift updated successfully"},
                    status=status.HTTP_200_OK,
                )

        except DatabaseError as e:
            return Response(
                {"error": f"Database error: {str(e)}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except Exception as e:
            return Response(
                {"error": f"Failed to update shift: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["post"])
    def assign_to_admin(self, request, pk=None):
        serializer = AdminAssignmentSerializer(
            data=request.data,
            context={"request": request},
        )

        try:
            serializer.is_valid()
            vaidated_data = serializer.validated_data

            with transaction.atomic():
                membership = Membership.objects.get(
                    user=vaidated_data.get("user_id"),
                    organization=vaidated_data.get("organization_id"),
                )

                if membership.role == Membership.Role.ADMIN:
                    return Response(
                        {"status": "User is already an admin"},
                        status=status.HTTP_200_OK,
                    )

                membership.role = Membership.Role.ADMIN

                membership.save()

            return Response(
                {"status": "User successfully promoted to admin"},
                status=status.HTTP_200_OK,
            )

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
            logger.error(f"Error in assignment to admin role: {str(e)}", exc_info=True)
            return Response(
                {"error": "Failed to process assignment"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
