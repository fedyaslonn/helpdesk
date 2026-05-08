from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from core.models import Category
from core.serializers.categories import CategorySerializer, CategoryListSerializer, CategoryDetailSerializer
from core.permissions import IsAdminOrReadOnly

class CategoryViewSet(viewsets.ModelViewSet):
    """
    API для работы с категориями.
    """
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    def get_serializer_class(self):
        # Для GET /categories/{id}/ отдаем детальный вид с children
        if self.action == 'retrieve':
            return CategoryDetailSerializer
        # Для GET /categories/, POST, PATCH отдаем обычный вид
        return CategoryListSerializer

    def get_queryset(self):
        # Оптимизируем запрос, подтягивая дочерние элементы
        qs = Category.objects.prefetch_related('children')

        # Обрабатываем кастомный фильтр ?parent=null
        parent_param = self.request.query_params.get('parent')
        
        if parent_param == 'null':
            # Возвращаем только корневые категории
            qs = qs.filter(parent__isnull=True)
        elif parent_param and parent_param.isdigit():
            # Если передали конкретный ID: ?parent=5
            qs = qs.filter(parent_id=parent_param)

        return qs
