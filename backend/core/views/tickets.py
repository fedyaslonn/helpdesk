import logging

from django.db import DatabaseError, IntegrityError
from django.db.models import ObjectDoesNotExist, Prefetch, Q
from rest_framework import status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from core.models import Comment, Organization, Ticket, User
from core.serializers.tickets import (
    CreateTicketSerializer,
    GetTicketSerializer,
    PartialUpdateTicketSerializer,
    UpdateTicketSerializer,
)

logger = logging.getLogger(__name__)


class TicketsViewSet(viewsets.ViewSet):
    def list(self, request):
        queryset = Ticket.objects.select_related(
            "requestor", "assignee", "organization"
        ).all()
        serializer = GetTicketSerializer(queryset, many=True)

        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        try:
            ticket = Ticket.objects.select_related(
                "requestor", "assignee", "organization"
            ).get(pk=pk)
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

        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_400_BAD_REQUEST)

        try:
            requestor_id = validated_data.get("requestor")
            organization_id = validated_data.get("organization")
            assignee_id = validated_data.get("assignee")

            if not requestor_id or not organization_id:
                return Response(
                    {
                        "error": "Both requestor id and organization id should be provided"
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            try:
                requestor = User.objects.get(pk=requestor_id)
                organization = Organization.objects.get(pk=organization_id)
                assignee = User.objects.get(pk=assignee_id) if assignee_id else None
            except User.DoesNotExist:
                return Response(
                    {"error": "User not found"}, status=status.HTTP_404_NOT_FOUND
                )
            except Organization.DoesNotExist:
                return Response(
                    {"error": "Organization not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if assignee_id is not None:
                try:
                    assignee = User.objects.get(
                        pk=assignee_id, organization=organization
                    )

                except User.DoesNotExist:
                    return Response(
                        {
                            "error": "Assignee not found or assignee from other organization"
                        },
                        status=status.HTTP_404_NOT_FOUND,
                    )

            ticket = Ticket.objects.create(
                requestor=requestor,
                assignee=assignee if assignee else None,
                organization=organization,
                title=validated_data["title"],
                description=validated_data["description"],
                status=Ticket.Status.OPEN,
            )

            ticket.save()
            ticket = Ticket.objects.select_related(
                "requestor", "assignee", "organization"
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

        serializer = UpdateTicketSerializer(data=request.data, partial=False)

        try:
            serializer.is_valid(raise_exception=True)
            validated_data = serializer.validated_data

        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_400_BAD_REQUEST)

        try:
            assignee_id = validated_data.get("assignee")

            try:
                organization_id = validated_data.get("organization")
                organization = Organization.objects.get(pk=organization_id)

            except Organization.DoesNotExist:
                return Response(
                    {"error": "Organization not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if assignee_id is not None:
                try:
                    assignee = User.objects.get(
                        pk=assignee_id, organization=organization
                    )

                except User.DoesNotExist:
                    return Response(
                        {
                            "error": "Assignee not found or assignee from other organization"
                        },
                        status=status.HTTP_404_NOT_FOUND,
                    )

            ticket.assignee = assignee if assignee_id else None
            ticket.title = validated_data.get("title")
            ticket.description = validated_data.get("description")
            ticket.status = validated_data.get("status")

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

        serializer = PartialUpdateTicketSerializer(data=request.data, partial=True)

        try:
            serializer.is_valid(raise_exception=True)
            validated_data = serializer.validated_data

            assignee_id = validated_data.get("assignee")
            if assignee_id is not None:
                try:
                    assignee = User.objects.get(
                        pk=assignee_id, organization=ticket.organization
                    )
                    ticket.assignee = assignee
                except User.DoesNotExist:
                    return Response(
                        {
                            "error": "Assignee not found or assignee is not a member of the ticket's organization"
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

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
