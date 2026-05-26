import django_filters
from django.db import models
from django.utils import timezone
from core.models import Ticket

class TicketFilter(django_filters.FilterSet):
    sla_breached = django_filters.BooleanFilter(method='filter_sla_breached')
    has_assignee = django_filters.BooleanFilter(method='filter_has_assignee')
    created_after = django_filters.IsoDateTimeFilter(field_name='created_at', lookup_expr='gte')

    class Meta:
        model = Ticket
        fields = ['status', 'category', 'assigned_engineer']

    def filter_sla_breached(self, queryset, name, value):
        """Фильтр просроченных заявок"""
        now = timezone.now()
        active_statuses = [Ticket.Status.OPEN, Ticket.Status.IN_PROGRESS, Ticket.Status.WAITING]
        if value:
            return queryset.filter(sla_deadline__lt=now, status__in=active_statuses)
        return queryset.filter(
            models.Q(sla_deadline__gte=now) | models.Q(sla_deadline__isnull=True)
        )

    def filter_has_assignee(self, queryset, name, value):
        """Фильтр: назначен инженер или нет"""
        if value:
            return queryset.filter(assigned_engineer__isnull=False)
        return queryset.filter(assigned_engineer__isnull=True)
