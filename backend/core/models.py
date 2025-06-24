from django.contrib.auth.models import AbstractUser
from django.core.validators import MinLengthValidator
from django.db import models, transaction
from django.db.models import F, Q, Value
from django.db.models.functions import Coalesce
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

# Create your models here.


class TicketManager(models.Manager):
    def get_current_shift_users(self, organization):
        now = timezone.now().time()

        return (
            Membership.objects.filter(
                organization=organization,
                is_active=True,
                user__is_active=True,
                shift_start__isnull=False,
                shift_end__isnull=False,
            )
            .filter(
                models.Q(shift_start__lte=now, shift_end__gt=now)
                | models.Q(shift_start__gt=models.F("shift_end"), shift_start__lte=now)
                | models.Q(shift_end__lt=models.F("shift_start"), shift_end__gt=now)
            )
            .select_related("user")
        )

    def auto_assign(self, ticket):
        with transaction.atomic():
            available_users = self.get_current_shift_users(ticket.organization)

            available_users = available_users.annotate(
                active_tickets=models.Count(
                    "user__assigned_tickets",
                    filter=models.Q(
                        user__assigned_tickets__status__in=[
                            Ticket.Status.OPEN,
                            Ticket.Status.IN_PROGRESS,
                            Ticket.Status.WAITING_FOR_REQUESTOR,
                        ]
                    ),
                )
            )

            candidates = available_users.filter(active_tickets__lt=3)

            if not candidates.exists():
                return self.assign_to_admin(ticket)

            best_candidate = (
                candidates.select_related("user")
                .order_by("resolved_tickets_count", "last_ticket_resolved_at")
                .first()
            )

            if best_candidate:
                ticket.assignee = best_candidate.user
                ticket.save()
                Membership.objects.filter(id=best_candidate.id).update(
                    active_tickets_count=models.F("active_tickets_count") + 1
                )

            return ticket

    def assign_to_admin(self, ticket):
        admin = Membership.objects.filter(
            organization=ticket.organization, role=Membership.Role.ADMIN, is_active=True
        ).first()

        if admin:
            ticket.assignee = admin.user
            admin.active_tickets_count = models.F("active_tickets_count") + 1
            admin.save()

        return ticket


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
        on_delete=models.SET_NULL,
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
        WAITING_FOR_REQUESTOR = "WR", _("WR")

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

    objects = TicketManager()

    class Meta:
        verbose_name = _("Ticket")
        verbose_name_plural = _("Tickets")
        db_table = "Tickets"

    def __str__(self):
        return f"Ticket {self.id} - {self.title}"


class Membership(models.Model):
    class Role(models.TextChoices):
        ADMIN = "admin", _("Admin")
        WORKER = "worker", _("Worker")

    active_tickets_count = models.PositiveIntegerField(default=0)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="memberships")
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="memberships"
    )
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.WORKER)
    is_active = models.BooleanField(default=True)
    shift_start = models.TimeField(null=True, blank=True)
    shift_end = models.TimeField(null=True, blank=True)

    resolved_tickets_count = models.PositiveIntegerField(default=0)
    last_ticket_resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = _("Membership")
        verbose_name_plural = _("Memberships")
        db_table = "Membership"

        unique_together = [("user", "organization")]

        constraints = [
            models.UniqueConstraint(
                fields=["organization"],
                condition=Q(role="admin", is_active=True),
                name="unique_active_admin_per_organization",
            )
        ]


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
