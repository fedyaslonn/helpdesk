import logging
import os

from celery import shared_task
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import EmailMultiAlternatives, send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags

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

        send_new_assignee_email(ticket, new_assignee)

    except Ticket.DoesNotExist:
        logger.error(f"Ticket {ticket_id} not found")

    except User.DoesNotExist:
        logger.error(f"User {new_assignee_id} not found")

    except Exception as e:
        logger.error(f"Failed to send notification for ticket {ticket_id}: {str(e)}")
        self.retry(exc=e)
