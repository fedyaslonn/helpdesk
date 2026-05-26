from __future__ import annotations

from rest_framework import serializers


class ClassificationRuleSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    phrase = serializers.CharField(max_length=300)
    priority_name = serializers.CharField(max_length=50)
    resolution_minutes = serializers.IntegerField(min_value=1)
    enabled = serializers.BooleanField(default=True)
    weight = serializers.IntegerField(default=0)

