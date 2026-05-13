from __future__ import annotations

from bson import ObjectId
from rest_framework import status, viewsets
from rest_framework.response import Response

from core.ai.mongo_rules import delete_rule, upsert_rule
from core.permissions import IsAdmin
from core.serializers.classification_rules import ClassificationRuleSerializer


class TicketClassificationRuleViewSet(viewsets.ViewSet):
    permission_classes = [IsAdmin]

    def list(self, request):
        from core.ai.mongo_rules import list_enabled_rules, _collection  # local import

        coll = _collection()
        docs = list(coll.find({}).sort([("weight", -1), ("updated_at", -1), ("phrase", 1)]).limit(500))
        data = []
        for d in docs:
            data.append(
                {
                    "id": str(d.get("_id")),
                    "phrase": d.get("phrase"),
                    "priority_name": d.get("priority_name"),
                    "resolution_minutes": d.get("resolution_minutes"),
                    "enabled": d.get("enabled", True),
                    "weight": d.get("weight", 0),
                }
            )
        return Response(data)

    def create(self, request):
        serializer = ClassificationRuleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        doc = upsert_rule(serializer.validated_data)
        out = {**serializer.validated_data, "id": str(doc["_id"])}
        return Response(out, status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        serializer = ClassificationRuleSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        payload = {"_id": ObjectId(pk), **serializer.validated_data}
        doc = upsert_rule(payload)

        out = {
            "id": str(doc["_id"]),
            "phrase": doc.get("phrase"),
            "priority_name": doc.get("priority_name"),
            "resolution_minutes": doc.get("resolution_minutes"),
            "enabled": doc.get("enabled", True),
            "weight": doc.get("weight", 0),
        }
        return Response(out, status=status.HTTP_200_OK)

    def destroy(self, request, pk=None):
        ok = delete_rule(ObjectId(pk))
        return Response(status=status.HTTP_204_NO_CONTENT if ok else status.HTTP_404_NOT_FOUND)

