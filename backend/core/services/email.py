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


def send_application_notification_email(admin_email, username, org_name):
    subject = f"New application for {org_name}"
    context = {"username": username, "org_name": org_name}

    html_content = render_to_string("email/application_notification.html", context)
    text_content = strip_tags(html_content)

    email = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=settings.EMAIL_HOST_USER,
        to=[admin_email],
    )

    email.attach_alternative(html_content, "text/html")
    email.send(fail_silently=False)

    logger.info(
        f"Application notification sent to {admin_email} for organization {org_name}"
    )


def send_resolution_approved_email(ticket):
    assignee = ticket.assignee
    requestor = ticket.requestor

    if not assignee:
        logger.error(f"No assignee for ticket {ticket.title}, notification skipped")
        return

    context = {
        "ticket_title": ticket.title,
        "requestor_name": requestor.username,
        "assignee_name": assignee.username,
        "organization": ticket.organization.name,
    }

    subject = f"Ticket {ticket.title} resolution confirmed by user"
    html_content = render_to_string("core/resolution_approved.html", context)
    text_content = strip_tags(html_content)

    email = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[assignee.email],
    )
    email.attach_alternative(html_content, "text/html")
    email.send(fail_silently=False)

    logger.info(
        f"Resolution approved notification sent to {assignee.email} for ticket {ticket.title}"
    )
