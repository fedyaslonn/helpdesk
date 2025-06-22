import logging

from django.db import DatabaseError, IntegrityError, transaction
from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from core.models import Application, Membership
from core.serializers.applications import (
    CreateApplicationSerializer,
    GetApplicationSerializer,
)

logger = logging.getLogger(__name__)


class ApplicationsViewSet(viewsets.ViewSet):
    @action(detail=False, methods=["get"])
    def organization_applications(self, request):
        try:
            admin_membership = Membership.objects.get(
                user=request.user, role=Membership.Role.ADMIN, is_active=True
            )
        except Membership.DoesNotExist:
            return Response(
                {"error": "You must be an admin of an organization"},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            applications = (
                Application.objects.filter(
                    organization=admin_membership.organization,
                    status=Application.Status.PENDING,
                )
                .select_related("user", "organization")
                .order_by("-applied_at")
            )

            serializer = GetApplicationSerializer(applications, many=True)

            return Response({"application": serializer.data}, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error fetching applications: {str(e)}")
            return Response(
                {"error": f"Failed to fetch applications: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["post"])
    def accept_application(self, request, pk=None):
        try:
            application = Application.objects.get(
                pk=pk, status=Application.Status.PENDING
            )
        except Application.DoesNotExist:
            return Response(
                {"error": "Application not found or already processed"},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            admin_membership = Membership.objects.get(
                user=request.user,
                organization=application.organization,
                role=Membership.Role.ADMIN,
                is_active=True,
            )
        except Membership.DoesNotExist:
            return Response(
                {"error": "You must be an admin of this organization"},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            with transaction.atomic():
                user = application.user
                organization = application.organization

                if user.organization is not None:
                    return Response(
                        {"error": "User is already a member of an organization"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                if Membership.objects.filter(user=user, is_active=True).exists():
                    return Response(
                        {"error": "User already has an active membership"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                user.organization = organization
                user.save()

                membership = Membership.objects.create(
                    user=user,
                    organization=organization,
                    is_active=True,
                    role=Membership.Role.WORKER,
                )

                application.status = Application.Status.APPROVED
                application.save()

                logger.info(
                    f"Admin {request.user.id} accepted application {application.id} "
                    f"for user {user.id} to join organization {organization.id}"
                )

            serializer = GetApplicationSerializer(application, many=False)

            return Response(
                {
                    "message": "Application accepted successfully",
                    "application": serializer.data,
                },
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
            logger.error(f"Error accepting application: {str(e)}")
            return Response(
                {"error": f"Failed to accept application: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["post"])
    def reject_application(self, request, pk=None):
        try:
            application = Application.objects.get(
                pk=pk, status=Application.Status.PENDING
            )
        except Application.DoesNotExist:
            return Response(
                {"error": "Application not found or already processed"},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            admin_membership = Membership.objects.get(
                user=request.user,
                organization=application.organization,
                role=Membership.Role.ADMIN,
                is_active=True,
            )
        except Membership.DoesNotExist:
            return Response(
                {"error": "You must be an admin of this organization"},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            with transaction.atomic():
                rejection_reason = request.data.get("reason", "No reason provided")

                application.status = Application.Status.REJECTED
                application.save()

                logger.info(
                    f"Admin {request.user.id} rejected application {application.id} "
                    f"for user {application.user.id} to join organization {application.organization.id}. "
                    f"Reason: {rejection_reason}"
                )

                serializer = GetApplicationSerializer(application)

                return Response(
                    {
                        "message": "Application rejected successfully",
                        "application": serializer.data,
                        "rejection_reason": rejection_reason,
                    },
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
            logger.error(f"Error rejecting application: {str(e)}")
            return Response(
                {"error": f"Failed to reject application: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
