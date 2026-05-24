from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from core.models import KnowledgeBaseArticle
from core.serializers.kb import KBArticleSerializer
from core.permissions import KBAccessPermission
class KnowledgeBaseViewSet(viewsets.ModelViewSet):
    """API для Базы знаний."""
    queryset = KnowledgeBaseArticle.objects.select_related('author', 'category').all()
    serializer_class = KBArticleSerializer
    permission_classes = [KBAccessPermission]
    
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['category', 'is_published']
    search_fields = ['title', 'content', 'tags']
    ordering_fields = ['view_count', 'helpful_count', 'created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        
        # Клиенты и анонимы видят ТОЛЬКО опубликованные статьи
        if not user.is_authenticated or user.role == 'client':
            qs = qs.filter(is_published=True)

        # Кастомный фильтр по тегам (если передано ?tags=принтер,драйвер)
        tags = self.request.query_params.get('tags')
        if tags:
            for tag in tags.split(','):
                qs = qs.filter(tags__icontains=tag.strip().lower())
                
        return qs

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        """Переопределяем получение одной статьи, чтобы инкрементировать просмотры."""
        instance = self.get_object()
        
        # Увеличиваем просмотры (без изменения поля updated_at)
        instance.view_count += 1
        instance.save(update_fields=['view_count'])
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def vote(self, request, pk=None):
        """Оценка полезности статьи."""
        instance = self.get_object()
        is_helpful = request.data.get('helpful', True)
        
        if is_helpful:
            instance.helpful_count += 1
            instance.save(update_fields=['helpful_count'])
            
        return Response({
            "helpful_count": instance.helpful_count, 
            "message": "Спасибо за вашу оценку!"
        })
        