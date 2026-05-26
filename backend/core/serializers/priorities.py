from rest_framework import serializers
from core.models import Priority

class PrioritySerializer(serializers.ModelSerializer):
    class Meta:
        model = Priority
        fields = ['id', 'name', 'level']
        