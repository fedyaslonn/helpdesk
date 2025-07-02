import logging

from django.db import DatabaseError, IntegrityError, transaction
from django.db.models import Exists, F, ObjectDoesNotExist, OuterRef, Prefetch, Q
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.settings import api_settings

from core.filters.tickets import TicketFilter
from core.models import Comment, Membership, Organization, Ticket, User
from core.serializers.tickets import (
    ChangeAssigneeSerializer,
    CreateTicketSerializer,
    GetTicketSerializer,
    PartialUpdateTicketSerializer,
    RemoveAssigneeSerializer,
    SetAssigneeSerializer,
    UpdateTicketSerializer,
)
from core.services.utils import TicketNotificationService
from core.tasks import (
    send_change_assignee_notification,
    send_change_status_notification,
    send_remove_assignee_notification,
    send_resolution_approved_notification,
    send_set_assignee_notification,
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
                "requestor",
                "assignee",
                "organization",
            ).get(pk=pk)

            is_requestor = ticket.requestor == user
            is_assignee = ticket.assignee == user if ticket.assignee else False

            is_org_admin = Membership.objects.filter(
                user=user,
                organization=ticket.organization,
                role=Membership.Role.ADMIN,
                is_active=True,
            ).exists()

            if not (is_requestor or is_assignee or is_org_admin):
                return Response(
                    {"error": "You don't have permission to view this ticket"},
                    status=status.HTTP_403_FORBIDDEN,
                )

        except Ticket.DoesNotExist:
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
                ticket = Ticket(
                    requestor=request.user,
                    organization=validated_data.get("organization"),
                    title=validated_data.get("title"),
                    description=validated_data.get("description"),
                    status=Ticket.Status.OPEN,
                )

                ticket = Ticket.objects.auto_assign(ticket)
                ticket.save()

                logger.error(f"ticket:{ticket.assignee}")

                ticket = Ticket.objects.select_related(
                    "requestor",
                    "assignee",
                    "organization",
                ).get(id=ticket.id)

                if ticket.assignee:
                    transaction.on_commit(
                        lambda: send_set_assignee_notification.delay(
                            ticket.id, ticket.assignee.id
                        )
                    )

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
                "requestor",
                "assignee",
                "organization",
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
                "requestor",
                "assignee",
                "organization",
            ).get(pk=pk)

        except ObjectDoesNotExist as e:
            return Response(
                {"error": "Ticket not found"}, status=status.HTTP_404_NOT_FOUND
            )

        old_status = ticket.status

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

                new_status = ticket.status

                if (
                    new_status == Ticket.Status.RESOLVED
                    and old_status != Ticket.Status.RESOLVED
                ):
                    if ticket.assignee:
                        Membership.objects.filter(
                            user=ticket.assignee,
                            organization=ticket.organization,
                        ).update(
                            resolved_tickets_count=F("resolved_tickets_count") + 1,
                            active_tickets_count=F("active_tickets_count") - 1,
                        )

                elif (
                    old_status == Ticket.Status.RESOLVED
                    and new_status != Ticket.Status.RESOLVED
                ):
                    if ticket.assignee:
                        Membership.objects.filter(
                            user=ticket.assignee,
                            organization=ticket.organization,
                        ).update(
                            resolved_tickets_count=F("resolved_tickets_count") - 1,
                            active_tickets_count=F("active_tickets_count") + 1,
                        )

                if "status" in validated_data:
                    transaction.on_commit(
                        lambda: send_change_status_notification.delay(
                            ticket.id, old_status, ticket.status
                        )
                    )

                if "resolution_approved" in validated_data:
                    transaction.on_commit(
                        lambda: send_resolution_approved_notification.delay(ticket.id)
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

    @action(detail=True, methods=["post"])
    def assign(self, request, pk=None):
        try:
            ticket = Ticket.objects.select_related(
                "requestor",
                "assignee",
                "organization",
            ).get(pk=pk)

            if not Membership.objects.filter(
                user=request.user,
                organization=ticket.organization,
                role=Membership.Role.ADMIN,
                is_active=True,
            ).exists():
                raise PermissionDenied("Only organization admins can modify assignees")

            context = {"request": request, "ticket": ticket}
            data = request.data.copy()

            if "old_assignee" in data and "new_assignee" in data:
                serializer_class = ChangeAssigneeSerializer

            elif "new_assignee" in data:
                data["assignee"] = data["new_assignee"]
                serializer_class = SetAssigneeSerializer

            else:
                serializer_class = RemoveAssigneeSerializer
                data = {}

            if serializer_class == RemoveAssigneeSerializer:
                serializer = serializer_class(
                    data={},
                    context=context,
                )

            else:
                serializer = serializer_class(
                    instance=ticket,
                    data=data,
                    context=context,
                    partial=False,
                )

            try:
                serializer.is_valid(raise_exception=True)
                validated_data = serializer.validated_data

            except ValidationError as e:
                return Response(
                    {"error": e.detail},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            with transaction.atomic():
                old_assignee = ticket.assignee

                if serializer_class == ChangeAssigneeSerializer:
                    ticket.assignee = validated_data["new_assignee"]
                    operation = "change"

                elif serializer_class == SetAssigneeSerializer:
                    ticket.assignee = validated_data["assignee"]
                    operation = "set"

                elif serializer_class == RemoveAssigneeSerializer:
                    ticket.assignee = None
                    operation = "remove"

                ticket.save()

                old_assignee_id = old_assignee.id if old_assignee else None
                new_assignee_id = ticket.assignee.id if ticket.assignee else None

                transaction.on_commit(
                    lambda: TicketNotificationService.send_notification(
                        operation, ticket.id, old_assignee_id, new_assignee_id
                    )
                )

        except PermissionDenied as e:
            return Response(
                {"error": f"{str(e)}"},
                status=status.HTTP_403_FORBIDDEN,
            )

        except Ticket.DoesNotExist:
            return Response(
                {"error": "Ticket not found"},
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
                {"error": f"Failed to update ticket: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        response = GetTicketSerializer(ticket)
        return Response(
            data=response.data,
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get"])
    def check_admin(self, request, pk=None):
        if not request.user.is_authenticated:
            return Response(
                {"error": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            ticket = Ticket.objects.get(pk=pk)

            is_admin = Membership.objects.filter(
                user_id=request.user.id,
                organization=ticket.organization.id,
                role=Membership.Role.ADMIN,
                is_active=True,
            ).exists()

            return Response({"is_admin": is_admin})

        except Ticket.DoesNotExist:
            return Response(
                {"error": "Ticket not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and user.organization:
            return Ticket.objects.filter(
                Q(organization=user.organization) | Q(requestor=user)
            ).select_related("requestor", "assignee", "organization")

        else:
            return Ticket.objects.filter(requestor=user).select_related(
                "requestor", "assignee", "organization"
            )

        return Ticket.objects.none()

    def filter_queryset(self, queryset):
        for backend in self.filter_backends:
            queryset = backend().filter_queryset(self.request, queryset, self)

        return queryset
