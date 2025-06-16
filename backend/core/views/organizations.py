import logging

from django.db import DatabaseError, IntegrityError, transaction
from django.db.models import ObjectDoesNotExist, Prefetch
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from core.models import Comment, Membership, Organization, Ticket, User
from core.permissions import IsAdminOfOrganization
from core.serializers.memberships import GetMembershipSerializer
from core.serializers.organizations import (
    CreateOrganizationSerializer,
    GetOrganizationSerializer,
    PartialUpdateOrganizationSerializer,
    UpdateOrganizationSerializer,
)

logger = logging.getLogger(__name__)


class OrganizationsViewSet(viewsets.ViewSet):
    def list(self, request):
        queryset = Organization.objects.prefetch_related("members").all()
        serializer = GetOrganizationSerializer(queryset, many=True)

        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        try:
            organization = Organization.objects.prefetch_related("members").get(pk=pk)
        except ObjectDoesNotExist:
            return Response(
                {"error": "Organization not found"}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = GetOrganizationSerializer(organization)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def create(self, request):
        serializer = CreateOrganizationSerializer(
            data=request.data, context={"request": request}
        )

        try:
            serializer.is_valid(raise_exception=True)
            validated_data = serializer.validated_data

            with transaction.atomic():
                organization = Organization.objects.create(
                    name=validated_data["name"],
                    email=validated_data["email"],
                )

                Membership.objects.create(
                    user=request.user,
                    organization=organization,
                    role=Membership.Role.ADMIN,
                    is_active=True,
                )

                organization = Organization.objects.prefetch_related("members").get(
                    pk=organization.id
                )

                organization.save()

                request.user.organization = organization
                request.user.save()

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
                {"error": f"Failed to create organization: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        response = GetOrganizationSerializer(organization)
        return Response(response.data, status=status.HTTP_201_CREATED)

    def update(self, request, pk=None):
        try:
            organization = self.get_object(pk=pk)

            if not IsAdminOfOrganization().has_object_permission(
                request, self, organization
            ):
                raise PermissionDenied(
                    "Only organization admin can perform this action"
                )

            serializer = UpdateOrganizationSerializer(
                organization, data=request.data, context={"request": request}
            )
            serializer.is_valid(raise_exception=True)
            validated_data = serializer.validated_data

            with transaction.atomic():
                organization.name = validated_data.get("name", organization.name)
                organization.email = validated_data.get("email", organization.email)
                organization.save()

            response = GetOrganizationSerializer(organization)
            return Response(response.data, status=status.HTTP_200_OK)

        except Organization.DoesNotExist:
            return Response(
                {"error": "Organization not found"}, status=status.HTTP_404_NOT_FOUND
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
            return Response(
                {"error": f"Failed to create organization: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def partial_update(self, request, pk=None):
        try:
            organization = Organization.objects.prefetch_related("members").get(pk=pk)

        except ObjectDoesNotExist:
            return Response(
                {"error": "Organization not found"}, status=status.HTTP_404_NOT_FOUND
            )

        if not IsAdminOfOrganization().has_object_permission(
            request, self, organization
        ):
            raise PermissionDenied("Only organization admin can perform this action")

        serializer = PartialUpdateOrganizationSerializer(
            data=request.data, partial=True
        )

        if not IsAdminOfOrganization().has_object_permission(
            request, self, organization
        ):
            raise PermissionDenied("Only organization admin can perform this action")

        try:
            serializer.is_valid(raise_exception=True)
            validated_data = serializer.validated_data

            for attr, value in validated_data.items():
                setattr(organization, attr, value)

            organization.save()

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
                {"error": f"Failed to update organization: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        response = GetOrganizationSerializer(organization)
        return Response(response.data, status=status.HTTP_200_OK)

    def destroy(self, request, pk=None):
        try:
            organization = self.get_object(pk)
            if not organization:
                return Response(
                    {"error": "Organization not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if not IsAdminOfOrganization().has_object_permission(
                request, self, organization
            ):
                raise PermissionDenied(
                    "Only organization admin can perform this action"
                )

            with transaction.atomic():
                Membership.objects.filter(organization=organization).update(
                    is_active=False
                )

                User.objects.filter(organization=organization).update(organization=None)

                organization.is_active = False
                organization.save()

            return Response(
                {"status": "Organization deleted successfully!"},
                status=status.HTTP_204_NO_CONTENT,
            )

        except ObjectDoesNotExist:
            return Response(
                {"error": "Organization not found"}, status=status.HTTP_404_NOT_FOUND
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

    def get_object(self, pk):
        try:
            return self.get_queryset().get(pk=pk)
        except ObjectDoesNotExist:
            return None

    def get_queryset(self):
        return Organization.objects.prefetch_related("members").all()

    @action(detail=False, methods=['get'])
    def get_members(self, request, pk=None):
        try:
            organization = get_object_or_404(Organization, pk=pk)

            user_organization = request.user.organization

            if not user_organization or user_organization != organization:
                return Response(
                    {"detail": "You don't have access to this organization"},
                    status=status.HTTP_403_FORBIDDEN
                )

            try:
                memberships = Membership.objects.filter(
                    organization=request.user.organization,
                    is_active=True
                ).select_related('user')

            except ObjectDoesNotExist:
                return Response(
                    {"error": "Membership not found"}, status=status.HTTP_404_NOT_FOUND
                )

            serializer = GetMembershipSerializer(memberships, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except DatabaseError as e:
            return Response(
                {"error": f"Database error: {str(e)}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        except Exception as e:
            return Response(
                {"error": f"Server error: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
