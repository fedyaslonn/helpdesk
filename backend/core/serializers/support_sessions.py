from rest_framework import serializers
from core.models import SupportSession


class SupportSessionSerializer(serializers.ModelSerializer):
    # Вытягиваем username через связи: engineer -> user -> username
    engineer_name = serializers.CharField(source='engineer.user.username', read_only=True)

    class Meta:
        model = SupportSession
        fields = '__all__' 
        # Убедись, что 'engineer_name' добавлено в fields, если там не '__all__'
        