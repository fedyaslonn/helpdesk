from django.core.validators import MinLengthValidator
from rest_framework import serializers
from rest_framework.serializers import ValidationError

from core.models import Comment
from core.serializers.users_serializers import GetUserSerializer


class CreateCommentSerializer(serializers.ModelSerializer):
    author_id = serializers.IntegerField(required=True)
    ticket_id = serializers.IntegerField(required=True)

    class Meta:
        model = Comment
        fields = ["text", "author_id", "ticket_id"]


class GetCommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = "__all__"

        extra_kwargs = {field: {"read_only": True} for field in fields}

    def validate_text(self, value):
        if len(value.strip()) < 2:
            raise ValidationError("Text should contain at least 3 characters")

        return value


class UpdateCommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ["text"]


class PartialUpdateCommentSerializer(serializers.ModelSerializer):
    text = serializers.CharField(
        required=False,
        validators=[MinLengthValidator(2)],
        error_messages={"min_length": "Text field must have at least 2 characters"},
    )

    class Meta:
        model = Comment
        fields = ["text"]
