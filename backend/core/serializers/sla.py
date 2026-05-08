from rest_framework import serializers
from core.models import SLAParameter

class SLAParameterSerializer(serializers.ModelSerializer):
    # Подтягиваем названия для красивого отображения на фронтенде
    priority_name = serializers.CharField(source='priority.name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = SLAParameter
        fields = [
            'id', 'priority', 'priority_name', 'category', 'category_name',
            'response_time_min', 'resolution_time_min', 'comment'
        ]
        