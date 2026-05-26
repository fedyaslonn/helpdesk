from rest_framework import serializers
from core.models import KnowledgeBaseArticle

class KBArticleSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.username', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = KnowledgeBaseArticle
        fields = [
            'id', 'title', 'content', 'category', 'category_name', 
            'tags', 'author', 'author_name', 'is_published', 
            'view_count', 'helpful_count', 'created_at', 'updated_at'
        ]
        # Просмотры, оценки и автор заполняются сервером автоматически
        read_only_fields = ['id', 'author', 'view_count', 'helpful_count', 'created_at', 'updated_at']

    def validate_tags(self, value):
        # Небольшая очистка тегов: убираем лишние пробелы вокруг запятых
        if value:
            tags = [tag.strip().lower() for tag in value.split(',') if tag.strip()]
            return ','.join(tags)
        return value
        