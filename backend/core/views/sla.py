from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend
from core.models import SLAParameter
from core.serializers.sla import SLAParameterSerializer
from core.permissions import IsAdminOrEngineerReadOnly # Тот же пермишен, что мы писали ранее

class SLAParameterViewSet(viewsets.ModelViewSet):
    """
    API для управления параметрами SLA.
    Эндпоинт: /helpdesk/sla-rules/
    """
    # select_related решает N+1 проблему
    queryset = SLAParameter.objects.select_related('priority', 'category').all().order_by('priority__level', 'category__name')
    serializer_class = SLAParameterSerializer
    permission_classes = [IsAdminOrEngineerReadOnly]
    
    # Включаем фильтрацию ?priority=3&category=2
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['priority', 'category']
    