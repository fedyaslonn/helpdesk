import logging

from celery import shared_task
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import EmailMultiAlternatives, send_mail
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.html import strip_tags
from datetime import timedelta
from .kb.elasticsearch_client import delete_article, index_article
from core.models import KnowledgeBaseArticle, Ticket

from core.ai.ticket_classifier import classify_ticket
import time
from core.metrics import (
    AI_CLASSIFICATION_DURATION, AI_CLASSIFICATION_REQUESTS, AI_PRIORITY_ASSIGNED
)


logger = logging.getLogger(__name__)

User = get_user_model()


@shared_task
def process_ai_classification_and_assignment(ticket_id):
    """Фоновая задача для обработки тикета нейросетью и авто-назначения"""
    try:
        ticket = Ticket.objects.get(id=ticket_id)
        
        # 1. Запускаем Ollama
        decision = classify_ticket(ticket.description)
        
        # Обновляем приоритет и SLA
        ticket.priority = decision.priority
        if decision.resolution_minutes:
            ticket.sla_deadline = ticket.created_at + timedelta(minutes=decision.resolution_minutes)
        ticket.save(update_fields=['priority', 'sla_deadline', 'updated_at'])

        # 2. Теперь, когда у нас есть приоритет, делаем авто-назначение
        with transaction.atomic():
            ticket = Ticket.objects.auto_assign(ticket)

        # 3. Если ИИ успешно назначил инженера, отправляем ему уведомление
        if ticket.assigned_engineer:
            Notification.objects.create(
                user=ticket.assigned_engineer.user, 
                ticket=ticket,
                message=f"Вам автоматически назначена заявка {ticket.ticket_number} (Приоритет: {ticket.priority.name})",
                notification_type=Notification.Type.ASSIGNED
            )
            
    except Exception as e:
        # Если что-то пошло не так (например, БД недоступна), просто пишем в логи Celery
        print(f"Ошибка в фоновой классификации тикета {ticket_id}: {str(e)}")

@shared_task(bind=True, max_retries=3, default_retry_delay=2)
def index_kb_article_task(self, article_id: int):
    """
    Асинхронная индексация KB статьи в Elasticsearch.
    Запускается ТОЛЬКО после commit транзакции (через transaction.on_commit).
    """
    try:
        article = (
            KnowledgeBaseArticle.objects.select_related("category")
            .only("id", "title", "content", "tags", "is_published", "updated_at", "category__id", "category__name")
            .get(pk=article_id)
        )

        doc = {
            "title": article.title,
            "content": article.content,
            "category_name": article.category.name if article.category_id else "",
            "category_id": article.category_id,
            "tags": [t.strip() for t in (article.tags or "").split(",") if t.strip()],
            "is_published": bool(article.is_published),
            "updated_at": article.updated_at.isoformat() if article.updated_at else None,
        }
        index_article(article_id=article.id, doc=doc)
    except KnowledgeBaseArticle.DoesNotExist:
        # если статью удалили до таски — удаляем из индекса
        delete_article(article_id=article_id)
    except Exception as e:
        logger.error(f"Failed to index KB article {article_id}: {e}")
        raise self.retry(exc=e)


@shared_task(bind=True, max_retries=3)
def send_ticket_created_notification(self, ticket_id):
    """Уведомление клиенту об успешном создании заявки"""
    try:
        ticket = Ticket.objects.get(pk=ticket_id)
        user = ticket.user

        context = {
            "ticket": ticket,
            "user": user,
        }

        # Рендерим HTML и автоматически делаем из него plain text
        html_content = render_to_string("core/ticket_created.html", context)
        text_content = strip_tags(html_content)

        msg = EmailMultiAlternatives(
            subject=f"Ваша заявка {ticket.ticket_number} принята в работу",
            body=text_content,
            from_email=settings.EMAIL_HOST_USER,
            to=[user.email],
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send()

    except Ticket.DoesNotExist:
        logger.error(f"Ticket {ticket_id} not found. Cannot send creation email.")

    except Exception as e:
        logger.error(f"Failed to send ticket creation notification: {str(e)}")
        self.retry(exc=e)


@shared_task(bind=True, max_retries=3)
def send_ticket_resolved_notification(self, resolution_id):
    """Уведомление клиенту о решении его заявки"""
    try:
        resolution = ResolutionResult.objects.get(pk=resolution_id)
        ticket = resolution.ticket
        user = ticket.user

        context = {
            "ticket": ticket,
            "resolution": resolution,
            "user": user,
        }

        html_content = render_to_string("core/ticket_resolved.html", context)
        text_content = strip_tags(html_content)

        msg = EmailMultiAlternatives(
            subject=f"Заявка {ticket.ticket_number} успешно обработана",
            body=text_content,
            from_email=settings.EMAIL_HOST_USER,
            to=[user.email],
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send()

    except ResolutionResult.DoesNotExist:
        logger.error(f"ResolutionResult {resolution_id} not found. Cannot send resolution email.")

    except Exception as e:
        logger.error(f"Failed to send ticket resolution notification: {str(e)}")
        self.retry(exc=e)

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
        email.send(fail_silently=False)

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
        email.send(fail_silently=False)

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
        email.send(fail_silently=False)

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


@shared_task(bind=True, max_retries=3)
def send_apply_for_organization_notification(self, admin_email, username, org_name):
    try:
        subject = f"New application for {org_name}"
        html_content = render_to_string(
            "core/application_notification.html",
            {"username": username, "org_name": org_name},
        )
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
        logger.error("Failed to send notification about apply to admin")
        self.retry(exc=e)


@shared_task(bind=True, max_retries=3)
def send_resolution_approved_notification(self, ticket_id):
    try:
        ticket = Ticket.objects.select_related(
            "organization", "assignee", "requestor"
        ).get(id=ticket_id)

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
            "approval_time": timezone.now().strftime("%d.%m.%Y %H:%M:%S"),
        }

        subject = f"Ticket {ticket.title} resolution confirmed by user"
        html_content = render_to_string("core/resolution_approved.html", context)
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
        logger.error(
            f"Failed to send resolution notification for {ticket_id}: {str(e)}"
        )
        self.retry(exc=e, countdown=2**self.request.retries)

@shared_task(bind=True, max_retries=3)
def process_ai_classification_and_assignment(self, ticket_id):
    try:
        ticket = Ticket.objects.get(id=ticket_id)
        
        # 1. Засекаем время работы ИИ
        start_time = time.time()
        decision = classify_ticket(ticket.description)
        duration = time.time() - start_time
        
        # Записываем метрики ИИ
        AI_CLASSIFICATION_DURATION.observe(duration)
        AI_CLASSIFICATION_REQUESTS.labels(status=decision.source).inc() # 'ollama' или 'fallback'
        AI_PRIORITY_ASSIGNED.labels(priority=decision.priority.name).inc()

        # ... (здесь твой код сохранения приоритета и SLA из прошлого ответа) ...
        
    except Exception as e:
        # Если всё сломалось, тоже фиксируем метрику
        AI_CLASSIFICATION_REQUESTS.labels(status='error').inc()
        print(f"Ошибка классификации: {e}")
