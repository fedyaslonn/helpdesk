from core.models import ShiftSchedule
from rest_framework import serializers

class ShiftScheduleSerializer(serializers.ModelSerializer):
    engineer_name = serializers.CharField(source='engineer.user.full_name', read_only=True)
    
    class Meta:
        model = ShiftSchedule
        fields = [
            'id', 'engineer', 'engineer_name', 
            'shift_date', 'shift_start', 'shift_end', 'is_active'
        ]