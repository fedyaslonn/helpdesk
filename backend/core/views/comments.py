import logging

from core.models import Comment, Organization, Ticket, User
from core.serializers.comments import (
    CreateCommentSerializer,
    GetCommentSerializer,
    PartialUpdateCommentSerializer,
    UpdateCommentSerializer,
)

from django.db import DatabaseError, IntegrityError
from django.db.models import ObjectDoesNotExist, Prefetch, Q
from rest_framework import status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

logger = logging.getLogger(__name__)


class CommentsViewSet(viewsets.ViewSet):
    def list(self, request):
        queryset = Comment.objects.select_related("author").all()
        serializer = GetCommentSerializer(queryset, many=True)

        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        try:
            comment = Comment.objects.select_related("author").get(pk=pk)
        except ObjectDoesNotExist:
            return Response(
                {"error": "Comment not found"}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = GetCommentSerializer(comment)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def create(self, request):
        serializer = CreateCommentSerializer(data=request.data)

        try:
            serializer.is_valid(raise_exception=True)
            validated_data = serializer.validated_data

        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_400_BAD_REQUEST)

        try:
            author_id = validated_data.get("author_id")
            ticket_id = validated_data.get("ticket_id")

            if not author_id:
                return Response(
                    {"error": "Author id should be provided"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            try:
                user = User.objects.get(id=author_id)

            except User.DoesNotExist:
                return Response(
                    {"error": "Author not found"}, status=status.HTTP_404_NOT_FOUND
                )

            try:
                ticket = Ticket.objects.get(
                    Q(id=ticket_id) & (Q(requestor=user) | Q(assignee=user))
                )

            except Ticket.DoesNotExist:
                return Response(
                    {
                        "error": "Ticket not found or comment's author not assignee or requestor"
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

            comment = Comment.objects.create(
                text=validated_data["text"], author=user, ticket=ticket
            )
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
                {"error": f"Failed to create comment: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        response = GetCommentSerializer(comment)
        return Response(response.data, status=status.HTTP_201_CREATED)

    def update(self, request, pk=None):
        try:
            comment = Comment.objects.select_related("author").get(pk=pk)

        except ObjectDoesNotExist:
            return Response(
                {"error": "Comment not found"}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = UpdateCommentSerializer(data=request.data, partial=False)

        try:
            serializer.is_valid(raise_exception=True)
            validated_data = serializer.validated_data

        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_400_BAD_REQUEST)

        try:
            comment.text = validated_data.get("text", comment.text)

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

    def partial_update(self, request, pk=None):
        try:
            comment = Comment.objects.select_related("author").get(pk=pk)

        except ObjectDoesNotExist:
            return Response(
                {"error": "Comment not found"}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = PartialUpdateCommentSerializer(data=request.data, partial=True)

        try:
            serializer.is_valid(raise_exception=True)
            validated_data = serializer.validated_data

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

    def destroy(self, request, pk=None):
        try:
            comment = Comment.objects.get(pk=pk)

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
