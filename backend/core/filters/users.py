import django_filters
from core.models import User

class UserFilter(django_filters.FilterSet):
    # Позволяем искать по роли
    role = django_filters.CharFilter(lookup_expr='iexact')
    # Позволяем фильтровать по верификации
    is_verified = django_filters.BooleanFilter()

    class Meta:
        model = User
        fields = ['role', 'is_verified']
