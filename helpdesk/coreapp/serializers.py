from rest_framework import serializers
from rest_framework.serializers import  ValidationError

from datetime import date

from django.contrib.auth.password_validation import validate_password

from rest_framework.validators import UniqueValidator

from .models import User, Organization, Comment

from django.core.validators import MinLengthValidator
from django.utils import timezone


class SimpleUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'first_name', 'last_name', 'is_staff', 'is_active', 'date_joined', 'organizations']


class GetUserSerializer(serializers.ModelSerializer):
    organizations = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'first_name', 'last_name', 'is_staff', 'is_active', 'date_joined', 'organizations']

        extra_kwargs = {
            field: {'read_only': True} for field in fields
        }

    def get_organizations(self, obj):
        organizations = obj.organizations.all()
        return SimpleOrganizationSerializer(organizations, many=True).data


class CreateUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, validators=[validate_password],
        style={'input_type': 'password'}
    )

    password2 = serializers.CharField(
        write_only=True, style={'input_type': 'password'}
    )

    class Meta:
        model = User
        fields = ['email', 'username', 'first_name', 'last_name', 'password', 'password2', 'date_birth']

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError(
                {"password": "Password fields didn't match"}
            )

        return attrs

    def validate_date_birth(self, value):
        if value > timezone.now():
            raise serializers.ValidationError("Birth date cannot be in the future")
        return value

class UpdateUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['email', 'username', 'first_name', 'last_name', 'date_birth']

    def validate_date_birth(self, value):
        if value > timezone.now():
            raise serializers.ValidationError("Birth date cannot be in the future")
        return value


class PartialUpdateUserSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(validators=[UniqueValidator(queryset=User.objects.all())],
                                   required=False)
    username = serializers.CharField(validators=[UniqueValidator(queryset=User.objects.all())],
                                    required=False)
    first_name = serializers.CharField(required=False)
    last_name = serializers.CharField(required=False)
    date_birth = serializers.DateField(required=False)

    class Meta:
        model = User
        fields = ['email', 'username', 'first_name', 'last_name', 'date_birth']

    def validate_date_birth(self, value):
        if value > date.today():
            raise serializers.ValidationError("Birth date cannot be in the future")
        return value


class CreateOrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ['name', 'email']


class SimpleOrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = "__all__"


class GetOrganizationSerializer(serializers.ModelSerializer):
    members = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = ['id', 'name', 'email', 'is_active', 'created_at', 'members']

        extra_kwargs = {
            field: {'read_only': True} for field in fields
        }

    def get_members(self, obj):
        members = obj.members.all()
        return SimpleUserSerializer(members, many=True).data


class UpdateOrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model =  Organization
        fields = ['name', 'email', 'is_active']


class PartialUpdateOrganizationSerializer(serializers.ModelSerializer):
    name = serializers.CharField(required=False)
    email = serializers.EmailField(validators=[UniqueValidator(queryset=Organization.objects.all())],
                                   required=False)
    is_active = serializers.BooleanField(required=False)

    class Meta:
        model = Organization
        fields = ['name', 'email', 'is_active']


class CreateCommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ['text']


class GetCommentSerializer(serializers.ModelSerializer):
    author = GetUserSerializer(read_only=True)

    class Meta:
        model = Comment
        fields = ['id', 'author', 'text', 'created_at', 'is_responsed']

        extra_kwargs = {
            field: {'read_only': True} for field in fields
        }

    def validate_text(self, value):
        if len(value.strip()) < 2:
            raise ValidationError("Text should contain at least 3 characters")

        return value


class UpdateCommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ['text', 'is_responsed']


class PartialUpdateCommentSerializer(serializers.ModelSerializer):
    text = serializers.CharField(required=False,
                                 validators=[MinLengthValidator(2)],
                                 error_messages={"min_length": "Text field must have at least 2 characters"})
    is_responsed = serializers.BooleanField(required=False)

    class Meta:
        model = Comment
        fields = ['text', 'is_responsed']
