from rest_framework import serializers
from core.models import Category # Проверь правильность пути импорта


class CategorySerializer(serializers.ModelSerializer):
    # Добавим названия родительской категории и приоритета для удобства фронтенда
    parent_name = serializers.CharField(source='parent.name', read_only=True)
    default_priority_name = serializers.CharField(source='default_priority.name', read_only=True)

    class Meta:
        model = Category
        fields = [
            'id', 
            'name', 
            'parent', 
            'parent_name',
            'description', 
            'default_priority', 
            'default_priority_name',
            'knowledge_base_link', 
            'created_at', 
            'updated_at'
        ]

class CategoryListSerializer(serializers.ModelSerializer):
    """Сериализатор для создания и отображения в списке"""
    class Meta:
        model = Category
        fields = [
            'id', 'name', 'parent', 'description', 
            'default_priority', 'knowledge_base_link', 'created_at'
        ]

class CategoryDetailSerializer(serializers.ModelSerializer):
    """Сериализатор для детального просмотра (с вложенными подкатегориями)"""
    # Вкладываем дочерние элементы рекурсивно или через базовый сериализатор
    children = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            'id', 'name', 'parent', 'description', 
            'default_priority', 'knowledge_base_link', 
            'children', 'created_at', 'updated_at'
        ]

    def get_children(self, obj):
        # Достаем все дочерние категории
        children = obj.children.all()
        # Используем CategoryListSerializer, чтобы не уйти в бесконечную рекурсию
        return CategoryListSerializer(children, many=True).data

