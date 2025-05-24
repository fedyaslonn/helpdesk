from django.contrib.auth.hashers import check_password
from django.db import IntegrityError, DatabaseError
from django.db.models import ObjectDoesNotExist
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from .models import User, Organization, Comment
from .serializers import CreateUserSerializer, GetUserSerializer, UpdateUserSerializer, PartialUpdateUserSerializer, \
    CreateOrganizationSerializer, GetOrganizationSerializer, UpdateOrganizationSerializer, \
    PartialUpdateOrganizationSerializer, GetCommentSerializer, CreateCommentSerializer, UpdateCommentSerializer, \
    PartialUpdateCommentSerializer

import logging

logger = logging.getLogger(__name__)


# Create your views here.

class UserViewSet(viewsets.ViewSet):
    def list(self, request):
        queryset = User.objects.prefetch_related('organizations').all()
        serializer = GetUserSerializer(queryset, many=True)

        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        try:
            user = User.objects.prefetch_related('organizations').get(pk=pk)

        except ObjectDoesNotExist:
            return Response(
                {"error": "User not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = GetUserSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)


    def create(self, request):
        serializer = CreateUserSerializer(data=request.data)

        try:
            serializer.is_valid(raise_exception=True)
            validated_data = serializer.validated_data

        except ValidationError as e:
            return Response(
                {"error": e.detail},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.create(email=validated_data['email'],
                                username=validated_data['username'],
                                first_name=validated_data.get('first_name', ''),
                                last_name=validated_data.get('last_name', ''),
                                date_birth=validated_data.get('date_birth'),
                                )

            user.set_password(validated_data['password'])
            user.save()

        except ValidationError as e:
            return Response(
                {"error": e.detail},
                status=status.HTTP_400_BAD_REQUEST
            )

        except IntegrityError as e:
            return Response({"error": f"Integrity error: {str(e)}"},
                           status=status.HTTP_400_BAD_REQUEST)

        except DatabaseError as e:
            return Response(
                {"error": f"Database error: {str(e)}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        except Exception as e:
            return Response(
                {"error": f"Failed to create user: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        response = GetUserSerializer(user)
        return Response(response.data, status=status.HTTP_201_CREATED)

    def update(self, request, pk=None):
        try:
            user = User.objects.prefetch_related('organizations').get(pk=pk)

        except ObjectDoesNotExist:
            return Response({"error": "User not found"},
                            status=status.HTTP_404_NOT_FOUND)

        serializer = UpdateUserSerializer(
            data=request.data,
            partial=False
        )

        try:
            serializer.is_valid(raise_exception=True)
            validated_data = serializer.validated_data

        except ValidationError as e:
            return Response(
                {"error": e.detail},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user.email = validated_data.get('email', user.email)
            user.username = validated_data.get('username', user.username)
            user.first_name = validated_data.get('first_name', user.first_name)
            user.last_name = validated_data.get('last_name', user.last_name)
            user.date_birth = validated_data.get('date_birth', user.date_birth)

            user.save()

        except ValidationError as e:
            return Response(
                {"error": e.detail},
                status=status.HTTP_400_BAD_REQUEST
            )

        except IntegrityError as e:
            return Response({"error": f"Integrity error: {str(e)}"},
                           status=status.HTTP_400_BAD_REQUEST)

        except DatabaseError as e:
            return Response(
                {"error": f"Database error: {str(e)}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        except Exception as e:
            return Response(
                {"error": f"Failed to update user: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        response = GetUserSerializer(user)
        return Response(response.data, status=status.HTTP_200_OK)


    def partial_update(self, request, pk=None):
        try:
            user = User.objects.prefetch_related('organizations').get(pk=pk)

        except ObjectDoesNotExist as e:
            return Response({"error": "User not found"},
                            status=status.HTTP_404_NOT_FOUND)

        serializer = PartialUpdateUserSerializer(
            data=request.data
        )

        try:
            serializer.is_valid(raise_exception=True)
            validated_data = serializer.validated_data

            for attr, value in validated_data.items():
                setattr(user, attr, value)

            user.save()

        except ValidationError as e:
            return Response(
                {"error": e.detail},
                status=status.HTTP_400_BAD_REQUEST
            )

        except IntegrityError as e:
            return Response({"error": f"Integrity error: {str(e)}"},
                           status=status.HTTP_400_BAD_REQUEST)

        except DatabaseError as e:
            return Response(
                {"error": f"Database error: {str(e)}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        except Exception as e:
            return Response(
                {"error": f"Failed to update user: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
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
                status=status.HTTP_204_NO_CONTENT
            )

        except ObjectDoesNotExist:
            return Response(
                {"error": "User not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        except DatabaseError as e:
            return Response(
                {"error": f"Database error: {str(e)}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        except Exception as e:
            return Response(
                {"error": f"Failed to delete user {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def update_password(self, request, pk=None):
        try:
            user = User.objects.get(pk=pk)

        except ObjectDoesNotExist:
            return Response(
                {"error": "User not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        old_password = user.password

        old_password_from_request = request.data.get('old_password')
        password = request.data.get('password')
        password2 = request.data.get('password2')

        if not password or not password2:
            return Response(
                {"error": "New passwords are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if password != password2:
            return Response({"error": "New passwords do not match"},
                            status=status.HTTP_400_BAD_REQUEST)

        if not check_password(old_password_from_request, old_password):
            return Response(
                {"error": "Old password is incorrect"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if check_password(password, old_password):
            return Response(
                {"error": "New password must be different from the old one"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user.set_password(password)
            user.save()

        except DatabaseError as e:
            return Response(
                {"error": f"Database error: {str(e)}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        except Exception as e:
            return Response(
                {"error": f"Failed to update password: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        return Response({"status": "Password updated successfully"}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def set_organization(self, request, pk=None):
        try:
            user = User.objects.prefetch_related('organizations').get(pk=pk)

        except ObjectDoesNotExist as e:
            return Response(
                {"error": "User not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        organization_id = request.data.get('organization_id')

        if not organization_id:
            return Response(
                {"error": "organization_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            organization = Organization.objects.get(pk=organization_id)

        except Organization.DoesNotExist:
            return Response(
                {"error": "Organization is not found"},
                status=status.HTTP_400_BAD_REQUEST
            )

        users_with_organizations = User.objects.prefetch_related('organizations').get(id=user.id)
        organizations_id = users_with_organizations.organizations.values_list('id', flat=True)

        if organization_id in organizations_id:
            return Response(
                {"error": "User is already a member of this organization"}
            )


        user.organizations.add(organization)

        response = GetUserSerializer(user)
        return Response(data=response.data, status=status.HTTP_200_OK)


    @action(detail=True, methods=['post'])
    def leave_organization(self, request, pk=None):
        try:
            user = User.objects.prefetch_related('organizations').get(pk=pk)

        except ObjectDoesNotExist as e:
            return Response(
                {"error": "User not found"},
                status=status.HTTP_404_NOT_FOUND
        )

        organization_id = request.data.get('organization_id')

        try:
            organization = Organization.objects.get(pk=organization_id)

        except Organization.DoesNotExist:
            return Response(
                {"error": "Organization not found"},
                status=status.HTTP_404_NOT_FOUND
        )

        user_with_organizations = User.objects.prefetch_related('organizations').get(pk=pk)

        organizations_id = user_with_organizations.organizations.values_list('id', flat=True)

        if organization_id not in organizations_id:
            return Response(
                {"error": "User is not a member of this organization"}
            )

        user.organizations.remove(organization)
        response = GetUserSerializer(user)

        return Response(data=response.data, status=status.HTTP_200_OK)

class OrganizationViewSet(viewsets.ViewSet):
    def list(self, request):
        queryset = Organization.objects.prefetch_related('members').all()
        serializer = GetOrganizationSerializer(queryset, many=True)

        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        try:
            organization = Organization.objects.prefetch_related('members').get(pk=pk)
        except ObjectDoesNotExist:
            return Response(
                {"error": "Organization not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = GetOrganizationSerializer(organization)
        return Response(serializer.data, status=status.HTTP_200_OK)


    def create(self, request):
        serializer = CreateOrganizationSerializer(data=request.data)

        try:
            serializer.is_valid(raise_exception=True)
            validated_data = serializer.validated_data

        except ValidationError as e:
            return Response(
                {"error": e.detail},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            organization = Organization.objects.create(name=validated_data['name'],
                                email=validated_data['email'],
                                )

            organization.save()

        except ValidationError as e:
            return Response(
                {"error": e.detail},
                status=status.HTTP_400_BAD_REQUEST
            )

        except IntegrityError as e:
            return Response({"error": f"Integrity error: {str(e)}"},
                           status=status.HTTP_400_BAD_REQUEST)

        except DatabaseError as e:
            return Response(
                {"error": f"Database error: {str(e)}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        except Exception as e:
            return Response(
                {"error": f"Failed to create organization: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        response = GetOrganizationSerializer(organization)
        return Response(response.data, status=status.HTTP_201_CREATED)

    def update(self, request, pk=None):
        try:
            organization = Organization.objects.prefetch_related('members').get(pk=pk)

        except ObjectDoesNotExist:
            return Response({"error": "Organization not found"},
                            status=status.HTTP_404_NOT_FOUND)

        serializer = UpdateOrganizationSerializer(
            data=request.data
        )

        try:
            serializer.is_valid(raise_exception=True)
            validated_data = serializer.validated_data

        except ValidationError as e:
            return Response(
                {"error": e.detail},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            organization.name = validated_data.get('name', organization.name)
            organization.email = validated_data.get('email', organization.email)
            organization.is_active = validated_data.get('is_active', organization.is_active)

            organization.save()

        except ValidationError as e:
            return Response(
                {"error": e.detail},
                status=status.HTTP_400_BAD_REQUEST
            )

        except IntegrityError as e:
            return Response({"error": f"Integrity error: {str(e)}"},
                           status=status.HTTP_400_BAD_REQUEST)

        except DatabaseError as e:
            return Response(
                {"error": f"Database error: {str(e)}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        except Exception as e:
            return Response(
                {"error": f"Failed to update organization: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        response = GetOrganizationSerializer(organization)
        return Response(response.data, status=status.HTTP_200_OK)

    def partial_update(self, request, pk=None):
        try:
            organization = Organization.objects.prefetch_related('members').get(pk=pk)

        except ObjectDoesNotExist as e:
            return Response({"error": "Organization not found"},
                            status=status.HTTP_404_NOT_FOUND)

        serializer = PartialUpdateOrganizationSerializer(
            data=request.data
        )

        try:
            serializer.is_valid(raise_exception=True)
            validated_data = serializer.validated_data

            for attr, value in validated_data.items():
                setattr(organization, attr, value)

            organization.save()

        except ValidationError as e:
            return Response(
                {"error": e.detail},
                status=status.HTTP_400_BAD_REQUEST
            )

        except IntegrityError as e:
            return Response({"error": f"Integrity error: {str(e)}"},
                           status=status.HTTP_400_BAD_REQUEST)

        except DatabaseError as e:
            return Response(
                {"error": f"Database error: {str(e)}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        except Exception as e:
            return Response(
                {"error": f"Failed to update organization: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
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
                status=status.HTTP_204_NO_CONTENT
            )

        except ObjectDoesNotExist:
            return Response(
                {"error": "Organization not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        except DatabaseError as e:
            return Response(
                {"error": f"Database error: {str(e)}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        except Exception as e:
            return Response(
                {"error": f"Failed to delete user {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class CommentViewSet(viewsets.ViewSet):
    def list(self, request):
        queryset = Comment.objects.select_related('author').all()
        serializer = GetCommentSerializer(queryset, many=True)

        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        try:
            comment = Comment.objects.select_related('author').get(pk=pk)
        except ObjectDoesNotExist:
            return Response(
                {"error": "Comment not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = GetCommentSerializer(comment)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def create(self, request):
        serializer = CreateCommentSerializer(data=request.data)

        try:
            serializer.is_valid(raise_exception=True)
            validated_data = serializer.validated_data

        except ValidationError as e:
            return Response(
                {"error": e.detail},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            author_id = request.data.get('author_id')

            if not author_id:
                return Response({"error": "Author id should be provided"},
                                status=status.HTTP_404_NOT_FOUND)



            try:
                user = User.objects.get(id=author_id)

            except User.DoesNotExist:
                return Response({"error": "Author not found"},
                                    status=status.HTTP_404_NOT_FOUND)

            comment = Comment.objects.create(text=validated_data['text'], author=user)
            comment.save()

        except ValidationError as e:
            return Response(
                {"error": e.detail},
                status=status.HTTP_400_BAD_REQUEST
            )

        except IntegrityError as e:
            return Response({"error": f"Integrity error: {str(e)}"},
                           status=status.HTTP_400_BAD_REQUEST)

        except DatabaseError as e:
            return Response(
                {"error": f"Database error: {str(e)}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        except Exception as e:
            return Response(
                {"error": f"Failed to create comment: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        response = GetCommentSerializer(comment)
        return Response(response.data, status=status.HTTP_201_CREATED)

    def update(self, request, pk=None):
        try:
            comment = Comment.objects.select_related('author').get(pk=pk)

        except ObjectDoesNotExist:
            return Response({"error": "Comment not found"},
                            status=status.HTTP_404_NOT_FOUND)

        serializer = UpdateCommentSerializer(
            data=request.data
        )

        try:
            serializer.is_valid(raise_exception=True)
            validated_data = serializer.validated_data

        except ValidationError as e:
            return Response(
                {"error": e.detail},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            comment.text = validated_data.get('text', comment.text)
            comment.is_responsed = validated_data.get('is_responsed', comment.is_responsed)

            comment.save()

        except ValidationError as e:
            return Response(
                {"error": e.detail},
                status=status.HTTP_400_BAD_REQUEST
            )

        except IntegrityError as e:
            return Response({"error": f"Integrity error: {str(e)}"},
                           status=status.HTTP_400_BAD_REQUEST)

        except DatabaseError as e:
            return Response(
                {"error": f"Database error: {str(e)}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        except Exception as e:
            return Response(
                {"error": f"Failed to update comment: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        response = GetCommentSerializer(comment)
        return Response(response.data, status=status.HTTP_200_OK)

    def partial_update(self, request, pk=None):
        try:
            comment = Comment.objects.select_related('author').get(pk=pk)

        except ObjectDoesNotExist as e:
            return Response({"error": "Comment not found"},
                            status=status.HTTP_404_NOT_FOUND)

        serializer = PartialUpdateCommentSerializer(
            data=request.data, partial=True
        )

        try:
            serializer.is_valid(raise_exception=True)
            validated_data = serializer.validated_data

            for attr, value in validated_data.items():
                setattr(comment, attr, value)

            comment.save()

        except ValidationError as e:
            return Response(
                {"error": e.detail},
                status=status.HTTP_400_BAD_REQUEST
            )

        except IntegrityError as e:
            return Response({"error": f"Integrity error: {str(e)}"},
                           status=status.HTTP_400_BAD_REQUEST)

        except DatabaseError as e:
            return Response(
                {"error": f"Database error: {str(e)}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        except Exception as e:
            return Response(
                {"error": f"Failed to update comment: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
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
                status=status.HTTP_204_NO_CONTENT
            )

        except ObjectDoesNotExist:
            return Response(
                {"error": "Comment not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        except DatabaseError as e:
            return Response(
                {"error": f"Database error: {str(e)}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        except Exception as e:
            return Response(
                {"error": f"Failed to delete comment {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
