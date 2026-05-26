from rest_framework import serializers
from core.models import ResolutionResult # Укажи правильное имя своей модели

class ResolutionResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResolutionResult
        fields = [
            'id', 'ticket', 'resolution_type', 'root_cause', 
            'solution_description', 'prevention_notes', 
            'is_sla_met', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
