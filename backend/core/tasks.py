import logging
import os

from celery import shared_task
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import EmailMultiAlternatives, send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.utils import timezone

from core.services.email import (
    send_new_assignee_email,
    send_status_change_email,
    send_unassign_email,
)

from .models import Ticket

MAX_RETRIES = int(os.getenv("NOTIFICATION_TASK_MAX_RETRIES"))  # type: ignore
RETRY_DELAY = int(os.getenv("NOTIFICATION_TASK_RETRY_DELAY"))  # type: ignore


logger = logging.getLogger(__name__)

User = get_user_model()


@shared_task(bind=True, max_retries=MAX_RETRIES, retry_backoff=RETRY_DELAY)
def send_change_assignee_notification(
    self, ticket_id, old_assignee_id, new_assignee_id
):
    try:
        ticket = Ticket.objects.get(pk=ticket_id)

        if new_assignee_id:
            new_assignee = User.objects.get(pk=new_assignee_id)
            send_new_assignee_email(ticket, new_assignee)

        if old_assignee_id:
            old_assignee = User.objects.get(pk=old_assignee_id)
            send_unassign_email(ticket, old_assignee)

    except User.DoesNotExist as e:
        logger.error(f"User not found: {str(e)}")

    except Ticket.DoesNotExist:
        logger.error(f"Ticket {ticket_id} not found")

    except Exception as e:
        logger.error(f"Failed to send notification: {str(e)}")
        self.retry(exc=e)


@shared_task(bind=True, max_retries=MAX_RETRIES, retry_backoff=RETRY_DELAY)
def send_remove_assignee_notification(self, ticket_id, old_assignee_id):
    try:
        ticket = Ticket.objects.get(pk=ticket_id)
        old_assignee = User.objects.get(pk=old_assignee_id)

        context = {"ticket": ticket, "old_assignee": old_assignee}

        html_content = render_to_string("core/unassign_notify.html", context)
        text_content = strip_tags(html_content)

        email = EmailMultiAlternatives(
            subject=f"Unassignment from task: {ticket.title}",
            body=text_content,
            from_email=settings.EMAIL_HOST_USER,
            to=[old_assignee.email],
        )
        email.attach_alternative(html_content, "text/html")
        email.send(fail_silently=False)
        send_unassign_email(ticket, old_assignee)

    except Ticket.DoesNotExist:
        logger.error(f"Ticket {ticket_id} not found")

    except User.DoesNotExist:
        logger.error(f"User {old_assignee_id} not found")

    except Exception as e:
        logger.error(f"Failed to send notification: {str(e)}")
        self.retry(exc=e)


@shared_task(bind=True, max_retries=MAX_RETRIES, retry_backoff=RETRY_DELAY)
def send_change_status_notification(self, ticket_id, old_status, new_status):
    try:
        ticket = Ticket.objects.get(pk=ticket_id)
        recipients = [ticket.requestor.email]

        if ticket.assignee:
            recipients.append(ticket.assignee.email)

        context = {"ticket": ticket, "old_status": old_status, "new_status": new_status}

        html_content = render_to_string("core/status_change.html", context)
        text_content = strip_tags(html_content)

        email = EmailMultiAlternatives(
            subject=f"Status changed: {ticket.title}",
            body=text_content,
            from_email=settings.EMAIL_HOST_USER,
            to=recipients,
        )
        email.attach_alternative(html_content, "text/html")
        email.send(fail_silently=False)

        logger.info(f"Status change notification sent for ticket {ticket_id}")
        send_status_change_email(ticket, old_status, new_status, recipients)

    except Ticket.DoesNotExist:
        logger.error(f"Ticket {ticket_id} not found")

    except Exception as e:
        logger.error(f"Failed to send notification for ticket {ticket_id}: {str(e)}")
        self.retry(exc=e)


@shared_task(bind=True, max_retries=MAX_RETRIES, retry_backoff=RETRY_DELAY)
def send_set_assignee_notification(self, ticket_id, new_assignee_id):
    try:
        ticket = Ticket.objects.get(pk=ticket_id)
        new_assignee = User.objects.get(pk=new_assignee_id)

        context = {"ticket": ticket, "new_assignee": new_assignee}

        html_content = render_to_string("core/new_assignee.html", context)
        text_content = strip_tags(html_content)

        email = EmailMultiAlternatives(
            subject=f"New task assignment: {ticket.title}",
            body=text_content,
            from_email=settings.EMAIL_HOST_USER,
            to=[new_assignee.email],
            bcc=[settings.EMAIL_HOST_USER],
        )
        email.attach_alternative(html_content, "text/html")
        email.send(fail_silently=False)

        logger.info(
            f"Assignment notification sent to {new_assignee.email} for ticket {ticket_id}"
        )
        send_new_assignee_email(ticket, new_assignee)

    except Ticket.DoesNotExist:
        logger.error(f"Ticket {ticket_id} not found")

    except User.DoesNotExist:
        logger.error(f"User {new_assignee_id} not found")

    except Exception as e:
        logger.error(f"Failed to send notification for ticket {ticket_id}: {str(e)}")
        self.retry(exc=e)


@shared_task(bind=True, max_retries=3)
def send_apply_for_organization_notification(self, admin_email, username, org_name):
    try:
        subject = f"New application for {org_name}"
        html_content = render_to_string('core/application_notification.html', {
            'username': username,
            'org_name': org_name
        })
        text_content = strip_tags(html_content)

        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.EMAIL_HOST_USER,
            to=[admin_email],
            bcc=[settings.EMAIL_HOST_USER],
        )
        email.attach_alternative(html_content, "text/html")
        email.send(fail_silently=False)

    except Exception as e:
        logger.error(f"Failed to send notification about apply to admin")
        self.retry(exc=e)


@shared_task(bind=True, max_retries=3)
def send_resolution_approved_notification(self, ticket_id):
    try:
        ticket = Ticket.objects.select_related(
            'organization', 'assignee', 'requestor'
        ).get(id=ticket_id)

        assignee = ticket.assignee
        requestor = ticket.requestor

        if not assignee:
            logger.error(f"No assignee for ticket {ticket.title}, notification skipped")
            return

        context = {
            'ticket_title': ticket.title,
            'requestor_name': requestor.username,
            'assignee_name': assignee.username,
            'organization': ticket.organization.name,
            'approval_time': timezone.now().strftime("%d.%m.%Y %H:%M:%S")
        }

        subject = f"Ticket {ticket.title} resolution confirmed by user"
        html_content = render_to_string('core/resolution_approved.html', context)
        text_content = strip_tags(html_content)

        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[assignee.email],
            bcc=[settings.EMAIL_HOST_USER],
        )
        email.attach_alternative(html_content, "text/html")
        email.send(fail_silently=False)

    except Ticket.DoesNotExist:
        logger.error(f"Ticket {ticket.title} not found for notification")
        return

    except Exception as e:
        logger.error(f"Failed to send resolution notification for {ticket_id}: {str(e)}")
        self.retry(exc=e, countdown=2 ** self.request.retries)
