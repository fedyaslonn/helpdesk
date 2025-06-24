import logging

from django.db import DatabaseError, IntegrityError, transaction
from django.db.models import ObjectDoesNotExist, Prefetch, Q
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.settings import api_settings

from core.filters.tickets import TicketFilter
from core.models import Comment, Membership, Organization, Ticket, User
from core.serializers.tickets import (
    CreateTicketSerializer,
    GetTicketSerializer,
    PartialUpdateTicketSerializer,
    UpdateTicketSerializer,
)

logger = logging.getLogger(__name__)


class TicketsViewSet(viewsets.ViewSet):
    filter_backends = (DjangoFilterBackend,)
    filterset_class = TicketFilter

    def list(self, request):
        queryset = self.get_queryset()
        queryset = self.filter_queryset(queryset)

        serializer = GetTicketSerializer(queryset, many=True)

        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        try:
            user = self.request.user
            ticket = Ticket.objects.select_related(
                "requestor", "assignee", "organization"
            ).get(
                Q(pk=pk)
                & (
                    Q(requestor=user)
                    | Q(assignee=user)
                    | Q(
                        organization__memberships__user=user,
                        organization__memberships__role=Membership.Role.ADMIN,
                        organization__memberships__is_active=True,
                    )
                )
            )

        except ObjectDoesNotExist:
            return Response(
                {"error": "Ticket not found"}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = GetTicketSerializer(ticket)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def create(self, request):
        serializer = CreateTicketSerializer(data=request.data)

        try:
            serializer.is_valid(raise_exception=True)
            validated_data = serializer.validated_data

            with transaction.atomic():
                ticket = Ticket.objects.create(
                    requestor=request.user,
                    organization=validated_data.get("organization"),
                    title=validated_data.get("title"),
                    description=validated_data.get("description"),
                    status=Ticket.Status.OPEN,
                )

                ticket.save()
                ticket = Ticket.objects.select_related(
                    "requestor", "assignee", "organization"
                ).get(id=ticket.id)

        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_400_BAD_REQUEST)

        except User.DoesNotExist:
            return Response(
                {"error": "User not found"}, status=status.HTTP_404_NOT_FOUND
            )

        except Organization.DoesNotExist:
            return Response(
                {"error": "Organization not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

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
                {"error": f"Failed to create ticket: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        response = GetTicketSerializer(ticket)
        return Response(response.data, status=status.HTTP_201_CREATED)

    def update(self, request, pk=None):
        try:
            ticket = Ticket.objects.select_related(
                "requestor", "assignee", "organization"
            ).get(pk=pk)

        except ObjectDoesNotExist:
            return Response(
                {"error": "Ticket not found"}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = UpdateTicketSerializer(
            ticket, data=request.data, partial=False, context={"request": request}
        )

        try:
            serializer.is_valid(raise_exception=True)
            validated_data = serializer.validated_data

            with transaction.atomic():
                ticket.title = validated_data.get("title")
                ticket.description = validated_data.get("description")

                ticket.save()

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
                {"error": f"Failed to update ticket: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        response = GetTicketSerializer(ticket)
        return Response(response.data, status=status.HTTP_200_OK)

    def partial_update(self, request, pk=None):
        try:
            ticket = Ticket.objects.select_related(
                "requestor", "assignee", "organization"
            ).get(pk=pk)

        except ObjectDoesNotExist as e:
            return Response(
                {"error": "Ticket not found"}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = PartialUpdateTicketSerializer(
            ticket, data=request.data, partial=True, context={"request": request}
        )

        try:
            serializer.is_valid(raise_exception=True)
            validated_data = serializer.validated_data

            with transaction.atomic():
                for attr, value in validated_data.items():
                    if attr != "assignee":
                        setattr(ticket, attr, value)

                ticket.save()

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
                {"error": f"Failed to update ticket: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        response = GetTicketSerializer(ticket)
        return Response(response.data, status=status.HTTP_200_OK)

    def destroy(self, request, pk=None):
        try:
            ticket = Ticket.objects.get(pk=pk)

            if not request.user.is_authenticated:
                return Response(
                    {"error": "Authentication required"},
                    status=status.HTTP_401_UNAUTHORIZED,
                )

            if not ticket.requestor == request.user:
                return Response(
                    {"error": "Only requestor can delete its ticket"},
                    status=status.HTTP_403_FORBIDDEN,
                )

            ticket.delete()
            logger.info(f"Ticket {ticket.id} deleted successfully!")

            return Response(
                {"status": "Ticket deleted successfully!"},
                status=status.HTTP_204_NO_CONTENT,
            )

        except ObjectDoesNotExist:
            return Response(
                {"error": "Ticket not found"}, status=status.HTTP_404_NOT_FOUND
            )

        except DatabaseError as e:
            return Response(
                {"error": f"Database error: {str(e)}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        except Exception as e:
            return Response(
                {"error": f"Failed to delete ticket {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated:
            return Ticket.objects.filter(
                Q(organization=user.organization) | Q(requestor=self.request.user)
            ).select_related("requestor", "assignee", "organization")

        return Ticket.objects.none()

    def filter_queryset(self, queryset):
        for backend in self.filter_backends:
            queryset = backend().filter_queryset(self.request, queryset, self)

        return queryset
