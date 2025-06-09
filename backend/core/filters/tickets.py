from mailcap import lookup

from django_filters import rest_framework as filters
from core.models import Ticket, User


class TicketFilter(filters.FilterSet):
    status = filters.MultipleChoiceFilter(
        choices=Ticket.Status.choices,
        field_name='status',
    )

    assignee = filters.ModelMultipleChoiceFilter(
        queryset=User.objects.all(),
        field_name="assignee__username",
        to_field_name="username",
        lookup_expr="iexact",
    )

    class Meta:
        model = Ticket
        fields = ["status", "created_at", "assignee"]


    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        if hasattr(self, 'request') and self.request.user.is_authenticated:
            self.filters['assignee'].always_filter = False

            self.filters['assignee'].queryset = User.objects.filter(organization=self.request.user.organization)
