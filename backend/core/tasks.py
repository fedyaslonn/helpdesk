import logging

from celery import shared_task
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import EmailMultiAlternatives, send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags

from .models import Ticket

logger = logging.getLogger(__name__)

User = get_user_model()


@shared_task(bind=True, max_retries=3)
def send_change_assignee_notification(
    self, ticket_id, old_assignee_id, new_assignee_id
):
    try:
        ticket = Ticket.objects.get(pk=ticket_id)
        context = {
            "ticket": ticket,
            "new_assignee": (
                User.objects.get(pk=new_assignee_id) if new_assignee_id else None
            ),
        }

        if new_assignee_id:
            html_content = render_to_string("core/new_assignee.html", context)
            text_content = strip_tags(html_content)

            new_assignee = User.objects.get(pk=new_assignee_id)
            msg = EmailMultiAlternatives(
                subject=f"New task assignment: {ticket.title}",
                body=text_content,
                from_email=settings.EMAIL_HOST_USER,
                to=[new_assignee.email],
            )
            msg.attach_alternative(html_content, "text/html")
            msg.send()

        if old_assignee_id:
            html_content = render_to_string("core/unassign_notify.html", context)
            text_content = strip_tags(html_content)

            old_assignee = User.objects.get(pk=old_assignee_id)
            msg = EmailMultiAlternatives(
                subject=f"Task reassignment: {ticket.title}",
                body=text_content,
                from_email=settings.EMAIL_HOST_USER,
                to=[old_assignee.email],
            )
            msg.attach_alternative(html_content, "text/html")
            msg.send()

    except User.DoesNotExist as e:
        logger.error(f"User not found: {str(e)}")

    except Ticket.DoesNotExist:
        logger.error(f"Ticket {ticket_id} not found")

    except Exception as e:
        logger.error(f"Failed to send notification: {str(e)}")
        self.retry(exc=e)


@shared_task(bind=True, max_retries=3)
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
        email.send()

    except Ticket.DoesNotExist:
        logger.error(f"Ticket {ticket_id} not found")

    except User.DoesNotExist:
        logger.error(f"User {old_assignee_id} not found")

    except Exception as e:
        logger.error(f"Failed to send notification: {str(e)}")
        self.retry(exc=e)


@shared_task(bind=True, max_retries=3)
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
        email.send()

        logger.info(f"Status change notification sent for ticket {ticket_id}")

    except Ticket.DoesNotExist:
        logger.error(f"Ticket {ticket_id} not found")

    except Exception as e:
        logger.error(f"Failed to send notification for ticket {ticket_id}: {str(e)}")
        self.retry(exc=e)


@shared_task(bind=True, max_retries=3)
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
        email.send()

        logger.info(
            f"Assignment notification sent to {new_assignee.email} for ticket {ticket_id}"
        )

    except Ticket.DoesNotExist:
        logger.error(f"Ticket {ticket_id} not found")
    except User.DoesNotExist:
        logger.error(f"User {new_assignee_id} not found")
    except Exception as e:
        logger.error(f"Failed to send notification for ticket {ticket_id}: {str(e)}")
        self.retry(exc=e)
