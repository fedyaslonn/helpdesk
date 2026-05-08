from django.core.validators import MinLengthValidator
from rest_framework import serializers
from rest_framework.serializers import ValidationError

from core.models import Comment
from core.serializers.users import GetUserSerializer


class CreateCommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ["content"]

    def validate_content(self, value):
        if len(value.strip()) < 2:
            raise serializers.ValidationError("Текст должен содержать минимум 2 символа")
        return value

class GetCommentSerializer(serializers.ModelSerializer):
    # Если у тебя есть GetUserSerializer, используй его. Для примера отдаем dict.
    author = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ["id", "author", "content", "created_at", "updated_at"]

    def get_author(self, obj):
        return {"id": obj.author.id, "username": obj.author.username}

class UpdateCommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ["content"]

    def validate_content(self, value):
        if len(value.strip()) < 2:
            raise serializers.ValidationError("Текст должен содержать минимум 2 символа")
        return value

    def validate(self, attrs):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError("User is not authenticated.")
        if self.instance.author != request.user:
            raise serializers.ValidationError("Only the comment author can update comment")
        return attrs


class PartialUpdateCommentSerializer(serializers.ModelSerializer):
    text = serializers.CharField(
        required=False,
        validators=[MinLengthValidator(2)],
        error_messages={"min_length": "Text field must have at least 2 characters"},
    )

    class Meta:
        model = Comment
        fields = ["text"]

    def validate(self, attrs):
        request = self.context.get("request")
        comment = self.instance

        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError("User is not authenticated.")

        if comment.author != request.user:
            raise serializers.ValidationError(
                "Only the comment author can update comment"
            )

        return attrs

class ReplySerializer(serializers.ModelSerializer):
    """Сериализатор для ответов (без поля replies, чтобы не было рекурсии)"""
    author_info = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Comment
        fields = ['id', 'ticket', 'author', 'author_info', 'parent', 'content', 'created_at', 'updated_at']
        read_only_fields = ['id', 'author', 'created_at', 'updated_at']

    def get_author_info(self, obj):
        return {"id": obj.author.id, "username": obj.author.username, "role": obj.author.role}

class CommentSerializer(serializers.ModelSerializer):
    """Сериализатор для главных комментариев"""
    author_info = serializers.SerializerMethodField(read_only=True)
    # Вкладываем ответы через ReplySerializer
    replies = ReplySerializer(many=True, read_only=True)

    class Meta:
        model = Comment
        fields = ['id', 'ticket', 'author', 'author_info', 'parent', 'content', 'replies', 'created_at', 'updated_at']
        read_only_fields = ['id', 'author', 'created_at', 'updated_at']

    def get_author_info(self, obj):
        return {"id": obj.author.id, "username": obj.author.username, "role": obj.author.role}

    def validate_content(self, value):
        if len(value.strip()) < 2:
            raise serializers.ValidationError("Текст должен содержать минимум 2 символа.")
        return value
