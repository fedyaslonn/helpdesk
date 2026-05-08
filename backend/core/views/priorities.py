from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from core.models import Priority
from core.serializers.priorities import PrioritySerializer
from core.permissions import IsAdminOrReadOnly # Твой кастомный пермишен

class PriorityViewSet(viewsets.ModelViewSet):
    """
    API для управления справочником приоритетов.
    """
    queryset = Priority.objects.all().order_by('level')
    serializer_class = PrioritySerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    
    # Пагинация для справочников обычно отключается или ставится большой, 
    # но оставим стандартную архитектуру DRF.
    