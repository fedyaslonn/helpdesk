import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags

from core.models import Ticket, User

logger = logging.getLogger(__name__)


def send_new_assignee_email(ticket, new_assignee):
    context = {"ticket": ticket, "new_assignee": new_assignee}

    html_content = render_to_string("email/new_assignee.html", context)
    text_content = strip_tags(html_content)

    email = EmailMultiAlternatives(
        subject=f"New task assignment: {ticket.title}",
        body=text_content,
        from_email=settings.EMAIL_HOST_USER,
        to=[new_assignee.email],
    )

    email.attach_alternative(html_content, "text/html")
    email.send()
    logger.info(f"Assignment email sent to {new_assignee.email} for ticket {ticket.id}")


def send_unassign_email(ticket, old_assignee):
    context = {"ticket": ticket, "old_assignee": old_assignee}

    html_content = render_to_string("email/unassign_notify.html", context)
    text_content = strip_tags(html_content)

    email = EmailMultiAlternatives(
        subject=f"Unassignment from task: {ticket.title}",
        body=text_content,
        from_email=settings.EMAIL_HOST_USER,
        to=[old_assignee.email],
    )

    email.attach_alternative(html_content, "text/html")
    email.send()
    logger.info(
        f"Unassignment email sent to {old_assignee.email} for ticket {ticket.id}"
    )


def send_status_change_email(ticket, old_status, new_status, recipients):
    context = {"ticket": ticket, "old_status": old_status, "new_status": new_status}

    html_content = render_to_string("email/status_change.html", context)
    text_content = strip_tags(html_content)

    email = EmailMultiAlternatives(
        subject=f"Status changed: {ticket.title}",
        body=text_content,
        from_email=settings.EMAIL_HOST_USER,
        to=recipients,
    )

    email.attach_alternative(html_content, "text/html")
    email.send()
    logger.info(f"Status change email sent for ticket {ticket.id}")
