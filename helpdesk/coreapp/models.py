from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinLengthValidator

# Create your models here.

class User(AbstractUser):
    email = models.EmailField(max_length=52, unique=True, error_messages={"unique": "This email is already taken."})
    username = models.CharField(max_length=32, unique=True, validators=[MinLengthValidator(3)], error_messages={"unique": "This username is already taken.", "min_length": "Username must have at least 3 characters"})
    date_birth = models.DateField(auto_now_add=False, null=True, blank=True)

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["email"]

    class Meta:
        verbose_name = _("User model")
        verbose_name_plural = _("Users")
        db_table = "Users"

    def str(self):
        return f"{self.get_full_name()}"


class Organization(models.Model):
    name = models.CharField(max_length=52, validators=[MinLengthValidator(2)], error_messages={"min_length": "Name must have at least 2 characters"})
    email = models.EmailField(max_length=52, unique=True, error_messages={"unique": "This email is already taken."})
    members = models.ManyToManyField(
        User,
        through='OrganizationMember',
        related_name='organizations'
    )
    is_active = models.BooleanField(default=True, help_text=_("Whether the organization is active"))
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Organization model")
        verbose_name_plural = _("Organizations")
        db_table = "Organizations"
        ordering = ['-created_at']

    def str(self):
        return f"{self.name}"


class Comment(models.Model):
    author = models.ForeignKey(
        User,
        models.CASCADE,
        related_name='comments'
    )
    text = models.TextField(validators=[MinLengthValidator(2)], error_messages={"min_length": "Text field must have at least 2 characters"})
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_responsed = models.BooleanField(default=False, help_text=_("Whether response is received"))


    class Meta:
        verbose_name = _('Comment')
        verbose_name_plural = _('Comments')
        db_table = "Comments"
        ordering = ['-created_at']

    def str(self):
        return f"Comment from {self.author}"


class OrganizationMember(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE
    )
    date_joined = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = (
            'user', 'organization'
        )
        verbose_name = _('OrganizationMember')
        verbose_name_plural = _('OrganizationMembers')
        db_table = "OrganizationMember"
