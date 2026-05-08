from datetime import date
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from core.models import ShiftSchedule, SupportEngineer
from core.serializers.shifts import ShiftScheduleSerializer
from core.permissions import IsShiftOwnerOrAdmin

class ShiftScheduleViewSet(viewsets.ModelViewSet):
    """
    Управление расписанием смен (/helpdesk/shifts/)
    """
    serializer_class = ShiftScheduleSerializer
    permission_classes = [IsShiftOwnerOrAdmin]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['engineer', 'shift_date', 'is_active']

    def get_queryset(self):
        # Оптимизируем запросы через select_related
        qs = ShiftSchedule.objects.select_related('engineer__user').order_by('-shift_date', 'shift_start')
        
        if self.request.user.role == 'admin':
            return qs
        # Инженер видит только свои записи в общем списке
        return qs.filter(engineer__user=self.request.user)

    def perform_create(self, serializer):
        # Если админ не указал инженера явно, или это создает сам инженер
        if self.request.user.role == 'engineer':
            engineer_profile = SupportEngineer.objects.get(user=self.request.user)
            serializer.save(engineer=engineer_profile)
        else:
            serializer.save()

    @action(detail=False, methods=['get'])
    def today(self, request):
        """Список всех активных смен на сегодня (для координации команды)"""
        qs = ShiftSchedule.objects.select_related('engineer__user').filter(
            shift_date=date.today(), 
            is_active=True
        ).order_by('shift_start')
        
        serializer = self.get_serializer(qs, many=True)
        return Response({
            "count": qs.count(),
            "results": serializer.data
        })
        