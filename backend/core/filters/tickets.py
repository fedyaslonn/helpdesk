from django_filters import rest_framework as filters

from core.models import Ticket, User


class TicketFilter(filters.FilterSet):
    status = filters.MultipleChoiceFilter(
        choices=Ticket.Status.choices,
        field_name="status",
    )
    assignee = filters.CharFilter(method="filter_by_assignee_username")

    class Meta:
        model = Ticket
        fields = ["status", "assignee"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def filter_by_assignee_username(self, queryset, name, value):
        if value == "unassigned":
            return queryset.filter(assignee__isnull=True)

        elif value:
            return queryset.filter(assignee__username__iexact=value)

        return queryset
