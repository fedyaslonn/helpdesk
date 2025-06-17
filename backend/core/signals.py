from core.models import Ticket, Membership

from django.db import models
from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from django.utils import timezone


@receiver(pre_save, sender=Ticket)
def track_ticket_changes(sender, instance, **kwargs):
    if instance.pk:
        try:
            instance._previous = Ticket.objects.get(pk=instance.pk)
        except Ticket.DoesNotExist:
            instance._previous = None
    else:
        instance._previous = None


@receiver(post_save, sender=Ticket)
def update_membership_on_ticket_change(sender, instance, **kwargs):
    current_ticket = instance
    previous_ticket = getattr(current_ticket, "_previous", None)

    if previous_ticket and previous_ticket.assignee != current_ticket.assignee:
        if previous_ticket.assignee:
            membership = Membership.objects.get(
                user=previous_ticket.assignee, organization=current_ticket.organization
            )
            if previous_ticket.status in [
                Ticket.Status.OPEN,
                Ticket.Status.IN_PROGRESS,
                Ticket.Status.WAITING_FOR_REQUESTOR,
            ]:
                membership.active_tickets_count = models.F("active_tickets_count") - 1
                membership.save()

        if current_ticket.assignee:
            membership = Membership.objects.get(
                user=current_ticket.assignee, organization=current_ticket.organization
            )
            if current_ticket.status in [
                Ticket.Status.OPEN,
                Ticket.Status.IN_PROGRESS,
                Ticket.Status.WAITING_FOR_REQUESTOR,
            ]:
                membership.active_tickets_count = models.F("active_tickets_count") + 1
                membership.save()

    if previous_ticket and previous_ticket.status != current_ticket.status:
        if current_ticket.assignee:
            membership = Membership.objects.get(
                user=current_ticket.assignee, organization=current_ticket.organization
            )

            if current_ticket.status == Ticket.Status.RESOLVED:
                membership.active_tickets_count = models.F("active_tickets_count") - 1
                membership.resolved_tickets_count = (
                    models.F("resolved_tickets_count") + 1
                )
                membership.last_ticket_resolved_at = timezone.now()
                membership.save()

            elif (
                previous_ticket.status == Ticket.Status.RESOLVED
                and current_ticket.status
                in [
                    Ticket.Status.OPEN,
                    Ticket.Status.IN_PROGRESS,
                    Ticket.Status.WAITING_FOR_REQUESTOR,
                ]
            ):
                membership.active_tickets_count = models.F("active_tickets_count") + 1
                membership.resolved_tickets_count = (
                    models.F("resolved_tickets_count") - 1
                )
                membership.save()


@receiver(post_delete, sender=Ticket)
def update_membership_on_ticket_delete(sender, instance, **kwargs):
    if instance.assignee:
        membership = Membership.objects.get(
            user=instance.assignee, organization=instance.organization
        )
        if instance.status in [
            Ticket.Status.OPEN,
            Ticket.Status.IN_PROGRESS,
            Ticket.Status.WAITING_FOR_REQUESTOR,
        ]:
            membership.active_tickets_count = models.F("active_tickets_count") - 1
        else:
            membership.resolved_tickets_count = models.F("resolved_tickets_count") - 1
        membership.save()
