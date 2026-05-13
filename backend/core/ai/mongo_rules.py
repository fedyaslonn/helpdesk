from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime
from functools import lru_cache
from typing import Any, Iterable

from pymongo import MongoClient


@dataclass(frozen=True)
class ClassificationRule:
    phrase: str
    priority_name: str
    resolution_minutes: int
    enabled: bool = True
    weight: int = 0


def _env(name: str, default: str | None = None) -> str | None:
    value = os.getenv(name)
    return value if value not in (None, "") else default


@lru_cache(maxsize=1)
def _mongo_client() -> MongoClient:
    uri = _env("MONGODB_URI", "mongodb://mongo:27017")
    if not uri:
        raise RuntimeError("MONGODB_URI is not set")
    return MongoClient(uri, serverSelectionTimeoutMS=800)


def _collection():
    db_name = _env("MONGODB_DB", "helpdesk")
    coll_name = _env("MONGODB_RULES_COLLECTION", "ticket_classification_rules")
    if not db_name or not coll_name:
        raise RuntimeError("MONGODB_DB / MONGODB_RULES_COLLECTION is not set")
    return _mongo_client()[db_name][coll_name]


def list_enabled_rules(limit: int = 200) -> list[ClassificationRule]:
    """
    Reads admin-managed rules from MongoDB.

    Document shape (example):
      {
        "_id": ObjectId(...),
        "phrase": "упал сервер",
        "priority_name": "Critical",
        "resolution_minutes": 60,
        "enabled": true,
        "weight": 100,
        "updated_at": ISODate(...)
      }
    """
    coll = _collection()
    cursor = (
        coll.find({"enabled": True})
        .sort([("weight", -1), ("updated_at", -1), ("phrase", 1)])
        .limit(int(limit))
    )
    rules: list[ClassificationRule] = []
    for doc in cursor:
        phrase = str(doc.get("phrase") or "").strip()
        priority_name = str(doc.get("priority_name") or "").strip()
        resolution_minutes = doc.get("resolution_minutes")
        enabled = bool(doc.get("enabled", True))
        weight = int(doc.get("weight", 0))

        if not phrase or not priority_name:
            continue
        try:
            resolution_minutes_int = int(resolution_minutes)
        except Exception:
            continue
        if resolution_minutes_int <= 0:
            continue

        rules.append(
            ClassificationRule(
                phrase=phrase,
                priority_name=priority_name,
                resolution_minutes=resolution_minutes_int,
                enabled=enabled,
                weight=weight,
            )
        )
    return rules


def upsert_rule(doc: dict[str, Any]) -> dict[str, Any]:
    coll = _collection()
    now = datetime.utcnow()
    payload = {
        "phrase": (doc.get("phrase") or "").strip(),
        "priority_name": (doc.get("priority_name") or "").strip(),
        "resolution_minutes": int(doc.get("resolution_minutes")),
        "enabled": bool(doc.get("enabled", True)),
        "weight": int(doc.get("weight", 0)),
        "updated_at": now,
        "created_at": doc.get("created_at") or now,
    }
    _id = doc.get("_id")
    if _id:
        coll.update_one({"_id": _id}, {"$set": payload}, upsert=False)
        return {"_id": _id, **payload}
    res = coll.insert_one(payload)
    return {"_id": res.inserted_id, **payload}


def delete_rule(rule_id) -> bool:
    coll = _collection()
    res = coll.delete_one({"_id": rule_id})
    return bool(res.deleted_count)

