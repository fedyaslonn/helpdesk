from django.core.validators import MinLengthValidator
from rest_framework import serializers
from rest_framework.serializers import ValidationError

from core.models import Comment


class CreateCommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ["text"]


class GetCommentSerializer(serializers.ModelSerializer):
    from core.serializers.users_serializers import GetUserSerializer

    author = GetUserSerializer(read_only=True)

    class Meta:
        model = Comment
        fields = ["id", "author", "text", "created_at", "is_responsed"]

        extra_kwargs = {field: {"read_only": True} for field in fields}

    def validate_text(self, value):
        if len(value.strip()) < 2:
            raise ValidationError("Text should contain at least 3 characters")

        return value


class UpdateCommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ["text", "is_responsed"]


class PartialUpdateCommentSerializer(serializers.ModelSerializer):
    text = serializers.CharField(
        required=False,
        validators=[MinLengthValidator(2)],
        error_messages={"min_length": "Text field must have at least 2 characters"},
    )
    is_responsed = serializers.BooleanField(required=False)

    class Meta:
        model = Comment
        fields = ["text", "is_responsed"]
