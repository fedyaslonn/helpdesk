import logging

from django.db import DatabaseError, IntegrityError, transaction
from django.db.models import ObjectDoesNotExist, Prefetch, Q
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from core.models import Comment, Membership, Organization, Ticket, User
from core.permissions import HasPermissionToTicketComments
from core.serializers.comments import (
    CreateCommentSerializer,
    GetCommentSerializer,
    PartialUpdateCommentSerializer,
    UpdateCommentSerializer,
)

logger = logging.getLogger(__name__)


class CommentsViewSet(viewsets.ViewSet):
    permission_classes = [HasPermissionToTicketComments]

    def list(self, request, ticket_pk=None):
        comments = self.get_queryset()
        serializer = GetCommentSerializer(comments, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None, ticket_pk=None):
        comment = self.get_object(pk)
        serializer = GetCommentSerializer(comment, many=False)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def create(self, request, ticket_pk=None):
        try:
            ticket = Ticket.objects.get(pk=ticket_pk)

        except Ticket.DoesNotExist:
            return Response(
                {"error": "Ticket not found"}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = CreateCommentSerializer(data=request.data)

        try:
            serializer.is_valid(raise_exception=True)
            validated_data = serializer.validated_data

        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                comment = Comment.objects.create(
                    text=validated_data["text"], author=request.user, ticket=ticket
                )
                comment.save()

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
                {"error": f"Failed to create comment: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        response = GetCommentSerializer(comment)
        return Response(response.data, status=status.HTTP_201_CREATED)

    def update(self, request, ticket_pk=None, pk=None):
        try:
            ticket = self.get_ticket(ticket_pk)
            comment = Comment.objects.select_related("author").get(pk=pk)

        except ObjectDoesNotExist:
            return Response(
                {"error": "Comment not found"}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = UpdateCommentSerializer(
            comment, data=request.data, partial=False, context={"request": request}
        )

        try:
            serializer.is_valid(raise_exception=True)
            validated_data = serializer.validated_data
        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                comment.text = validated_data.get("text", comment.text)

                comment.save()

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
                {"error": f"Failed to update comment: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        response = GetCommentSerializer(comment)
        return Response(response.data, status=status.HTTP_200_OK)

    def partial_update(self, request, ticket_pk=None, pk=None):
        try:
            ticket = self.get_ticket(ticket_pk)
            comment = Comment.objects.select_related("author").get(pk=pk)

        except ObjectDoesNotExist:
            return Response(
                {"error": "Comment not found"}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = PartialUpdateCommentSerializer(
            comment, data=request.data, partial=True, context={"request": request}
        )

        try:
            serializer.is_valid(raise_exception=True)
            validated_data = serializer.validated_data

            with transaction.atomic():
                for attr, value in validated_data.items():
                    setattr(comment, attr, value)

                comment.save()

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
                {"error": f"Failed to update comment: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        response = GetCommentSerializer(comment)
        return Response(response.data, status=status.HTTP_200_OK)

    def destroy(self, request, ticket_pk=None, pk=None):
        try:
            ticket = self.get_ticket(ticket_pk)
            comment = Comment.objects.get(pk=pk)

            if request.user != comment.author:
                raise PermissionDenied("Comment can be only deleted by its author")

            comment.delete()
            logger.info(f"Comment {comment.id} deleted successfully!")

            return Response(
                {"status": "Comment deleted successfully!"},
                status=status.HTTP_204_NO_CONTENT,
            )

        except ObjectDoesNotExist:
            return Response(
                {"error": "Comment not found"}, status=status.HTTP_404_NOT_FOUND
            )

        except DatabaseError as e:
            return Response(
                {"error": f"Database error: {str(e)}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        except Exception as e:
            return Response(
                {"error": f"Failed to delete comment {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def get_ticket(self, ticket_pk):
        return get_object_or_404(Ticket, pk=ticket_pk)

    def get_object(self, pk):
        return get_object_or_404(self.get_queryset(), pk=pk)

    def get_queryset(self):
        ticket_pk = self.kwargs.get("ticket_pk")
        return Comment.objects.filter(ticket=ticket_pk).select_related(
            "author", "ticket"
        )
