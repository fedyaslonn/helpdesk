from django.db import models
from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone
from core.models import Category, Priority, SLAParameter, Ticket

@receiver(pre_save, sender=Ticket)
def track_ticket_changes(sender, instance, **kwargs):
    """
    Сохраняем предыдущее состояние заявки перед обновлением,
    чтобы в post_save можно было сравнить старый и новый статусы.
    """
    if instance.pk:
        try:
            instance._previous = Ticket.objects.get(pk=instance.pk)
        except Ticket.DoesNotExist:
            instance._previous = None
    else:
        instance._previous = None


@receiver(post_save, sender=Ticket)
def update_engineer_on_ticket_resolve(sender, instance, created, **kwargs):
    """
    Обновляем время последнего решения заявки у назначенного инженера.
    Остальные счетчики (активные заявки) высчитываются динамически в TicketManager.
    """
    current_ticket = instance
    previous_ticket = getattr(current_ticket, "_previous", None)

    # 1. Если заявка только что создана и сразу в статусе "Решена" (крайне редкий кейс, но лучше учесть)
    if created and current_ticket.status == Ticket.Status.RESOLVED and current_ticket.assigned_engineer:
        engineer = current_ticket.assigned_engineer
        engineer.last_ticket_resolved_at = timezone.now()
        engineer.save(update_fields=['last_ticket_resolved_at', 'updated_at'])
        return

    # 2. Если заявка была обновлена и ее статус изменился
    if previous_ticket and previous_ticket.status != current_ticket.status:
        # Если новый статус — "Решена"
        if current_ticket.status == Ticket.Status.RESOLVED and current_ticket.assigned_engineer:
            engineer = current_ticket.assigned_engineer
            engineer.last_ticket_resolved_at = timezone.now()
            engineer.save(update_fields=['last_ticket_resolved_at', 'updated_at'])

@receiver(post_save, sender=Category)
def create_default_sla_for_new_category(sender, instance, created, **kwargs):
    """
    Сигнал срабатывает после сохранения модели Category.
    Если категория новая (created=True), генерируем для нее дефолтные правила SLA.
    """
    if created:
        priorities = Priority.objects.all()
        sla_parameters_to_create = []

        for priority in priorities:
            # Пытаемся найти любое существующее правило SLA для этого приоритета,
            # чтобы скопировать из него логичные тайминги
            reference_sla = SLAParameter.objects.filter(priority=priority).first()

            if reference_sla:
                resp_time = reference_sla.response_time_min
                resol_time = reference_sla.resolution_time_min
            else:
                # Если в системе вообще еще нет SLA для этого приоритета, 
                # задаем базовые "заглушки" (60 минут реакция, 240 минут решение)
                resp_time = 60
                resol_time = 240

            # Создаем объект, но НЕ сохраняем его сразу в базу
            sla_parameters_to_create.append(
                SLAParameter(
                    priority=priority,
                    category=instance,
                    response_time_min=resp_time,
                    resolution_time_min=resol_time,
                    comment="Автоматически создано системой (требует проверки админом)"
                )
            )

        # Сохраняем все подготовленные правила ОДНИМ запросом в БД
        if sla_parameters_to_create:
            SLAParameter.objects.bulk_create(sla_parameters_to_create)
