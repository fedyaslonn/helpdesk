from django.core.validators import MinLengthValidator
from rest_framework import serializers
from rest_framework.serializers import ValidationError

from core.models import Comment
from core.serializers.users import GetUserSerializer


class CreateCommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ["text"]

    def validate_text(self, value):
        if len(value.strip()) < 2:
            raise ValidationError("Text should contain at least 3 characters")

        return value


class GetCommentSerializer(serializers.ModelSerializer):
    author = GetUserSerializer(read_only=True)

    class Meta:
        model = Comment
        fields = "__all__"

        extra_kwargs = {field: {"read_only": True} for field in fields}


class UpdateCommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ["text"]

    def validate_text(self, value):
        if len(value.strip()) < 2:
            raise ValidationError("Text should contain at least 3 characters")

        return value

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
