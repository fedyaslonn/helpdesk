import logging

from django.db import DatabaseError, IntegrityError
from django.db.models import ObjectDoesNotExist, Prefetch
from rest_framework import status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from core.models import Comment, Organization, Ticket, User
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
        serializer = CreateOrganizationSerializer(data=request.data)

        try:
            serializer.is_valid(raise_exception=True)
            validated_data = serializer.validated_data

        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_400_BAD_REQUEST)

        try:
            organization = Organization.objects.create(
                name=validated_data["name"],
                email=validated_data["email"],
            )

            organization.save()
            organization.objects.prefetch_related("members")

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
            organization = Organization.objects.prefetch_related("members").get(pk=pk)

        except ObjectDoesNotExist:
            return Response(
                {"error": "Organization not found"}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = UpdateOrganizationSerializer(data=request.data, partial=False)

        try:
            serializer.is_valid(raise_exception=True)
            validated_data = serializer.validated_data

        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_400_BAD_REQUEST)

        try:
            organization.name = validated_data.get("name", organization.name)
            organization.email = validated_data.get("email", organization.email)

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

    def partial_update(self, request, pk=None):
        try:
            organization = Organization.objects.prefetch_related("members").get(pk=pk)

        except ObjectDoesNotExist:
            return Response(
                {"error": "Organization not found"}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = PartialUpdateOrganizationSerializer(
            data=request.data, partial=True
        )

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
            organization = Organization.objects.get(pk=pk)

            organization.delete()
            logger.info(f"Organization {organization.id} deleted successfully!")

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
