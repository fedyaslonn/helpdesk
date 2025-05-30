from django.contrib.auth.models import AbstractUser
from django.core.validators import MinLengthValidator
from django.db import models
from django.utils.translation import gettext_lazy as _

# Create your models here.


class TimestampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Organization(TimestampedModel):
    name = models.CharField(
        max_length=52,
        validators=[MinLengthValidator(2)],
        error_messages={"min_length": "Name must have at least 2 characters"},
    )
    email = models.EmailField(
        max_length=52,
        unique=True,
        error_messages={"unique": "This email is already taken."},
    )
    is_active = models.BooleanField(
        default=True, help_text=_("Whether the organization is active")
    )

    class Meta:
        verbose_name = _("Organization model")
        verbose_name_plural = _("Organizations")
        db_table = "Organizations"

    def __str__(self):
        return f"{self.name}"


class User(AbstractUser):
    email = models.EmailField(
        max_length=52,
        unique=True,
        error_messages={"unique": "This email is already taken."},
    )
    username = models.CharField(
        max_length=32,
        unique=True,
        validators=[MinLengthValidator(3)],
        error_messages={
            "unique": "This username is already taken.",
            "min_length": "Username must have at least 3 characters",
        },
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.PROTECT,
        related_name="members",
        null=True,
        blank=True,
    )
    date_birth = models.DateField(auto_now_add=False, null=True, blank=True)

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["email"]

    class Meta:
        verbose_name = _("User model")
        verbose_name_plural = _("Users")
        db_table = "Users"

    def __str__(self):
        return f"{self.get_full_name()}"


class Ticket(TimestampedModel):
    class Status(models.TextChoices):
        OPEN = "OP", _("Open")
        IN_PROGRESS = "IP", _("In Progress")
        RESOLVED = "RS", _("Resolved")
        WAITING_FOR_ASSIGNEE = "WA", _("WA")

    requestor = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="requested_tickets"
    )
    assignee = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="assigned_tickets",
    )
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="tickets"
    )
    title = models.CharField(
        max_length=52,
        validators=[MinLengthValidator(2)],
        error_messages={"min_length": _("Title must have at least 2 characters")},
    )
    description = models.TextField(
        validators=[MinLengthValidator(8)],
        error_messages={
            "min_length": _("Description must have at least 10 characters")
        },
    )
    status = models.CharField(
        max_length=2,
        choices=Status.choices,
        default=Status.OPEN,
    )

    class Meta:
        verbose_name = _("Ticket")
        verbose_name_plural = _("Tickets")
        db_table = "Tickets"

    def __str__(self):
        return f"Ticket {self.id} - {self.title}"


class Comment(TimestampedModel):
    ticket = models.ForeignKey(
        Ticket, on_delete=models.CASCADE, related_name="comments"
    )
    author = models.ForeignKey(User, models.CASCADE, related_name="comments")
    text = models.TextField(
        validators=[MinLengthValidator(2)],
        error_messages={"min_length": "Text field must have at least 2 characters"},
    )

    class Meta:
        verbose_name = _("Comment")
        verbose_name_plural = _("Comments")
        db_table = "Comments"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Comment from {self.author} to ticket {self.ticket.title}"
