import logging

from django.db import DatabaseError, IntegrityError, transaction
from django.db.models import ObjectDoesNotExist, Prefetch, Q
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework import viewsets, permissions
from django_filters.rest_framework import DjangoFilterBackend
from core.models import Comment
from core.serializers.comments import CommentSerializer
from core.permissions import IsCommentAuthorOrAdmin

class CommentViewSet(viewsets.ModelViewSet):
    """
    API для работы с комментариями.
    """
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated, IsCommentAuthorOrAdmin]
    
    # Включаем фильтрацию, чтобы работал запрос ?ticket=101
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['ticket']

    def get_queryset(self):
        # Оптимизируем запрос, сразу подтягивая данные автора
        qs = Comment.objects.select_related('author').prefetch_related('replies__author')
        
        # Если это запрос списка, отдаем ТОЛЬКО корневые комментарии (parent=null)
        if self.action == 'list':
            qs = qs.filter(parent__isnull=True).order_by('-created_at')
            
        return qs

    def perform_create(self, serializer):
        # При создании автоматически привязываем текущего юзера как автора
        serializer.save(author=self.request.user)
