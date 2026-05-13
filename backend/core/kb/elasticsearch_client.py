from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from typing import Any


def _env(name: str, default: str | None = None) -> str | None:
    value = os.getenv(name)
    return value if value not in (None, "") else default


def _es_base_url() -> str:
    return (_env("ELASTICSEARCH_URL", "http://elasticsearch:9200") or "http://elasticsearch:9200").rstrip("/")


def _es_index() -> str:
    return _env("ELASTICSEARCH_KB_INDEX", "kb_articles") or "kb_articles"


def _request(method: str, path: str, body: dict[str, Any] | None = None, timeout_s: float = 4.0) -> dict[str, Any]:
    url = f"{_es_base_url()}/{path.lstrip('/')}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url=url, data=data, method=method, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout_s) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace") if hasattr(e, "read") else ""
        raise RuntimeError(f"Elasticsearch HTTP {e.code}: {raw}") from e
    except Exception as e:
        raise RuntimeError(f"Elasticsearch request failed: {e}") from e


def ensure_kb_index() -> None:
    """
    Creates index with basic mapping/settings if missing.
    Safe to call repeatedly.
    """
    index = _es_index()
    try:
        _request("HEAD", f"{index}")
        return
    except Exception:
        pass

    body = {
        "settings": {
            "number_of_shards": 1,
            "number_of_replicas": 0,
        },
        "mappings": {
            "properties": {
                "title": {"type": "text"},
                "content": {"type": "text"},
                "category_name": {"type": "text"},
                "category_id": {"type": "integer"},
                "tags": {"type": "keyword"},
                "is_published": {"type": "boolean"},
                "updated_at": {"type": "date"},
            }
        },
    }
    _request("PUT", index, body=body)


def index_article(article_id: int, doc: dict[str, Any]) -> None:
    ensure_kb_index()
    index = _es_index()
    _request("PUT", f"{index}/_doc/{article_id}", body=doc)


def delete_article(article_id: int) -> None:
    index = _es_index()
    try:
        _request("DELETE", f"{index}/_doc/{article_id}")
    except Exception:
        # ignore missing index/doc
        return


def search_kb(query: str, *, size: int = 3, is_published_only: bool = False) -> list[dict[str, Any]]:
    ensure_kb_index()
    index = _es_index()

    must: list[dict[str, Any]] = [
        {
            "multi_match": {
                "query": query,
                "fields": ["title^3", "content", "category_name", "tags^2"],
                "type": "best_fields",
            }
        }
    ]
    if is_published_only:
        must.append({"term": {"is_published": True}})

    body = {
        "size": int(size),
        "_source": True,
        "query": {"bool": {"must": must}},
    }
    res = _request("POST", f"{index}/_search", body=body)
    hits = (res.get("hits") or {}).get("hits") or []
    out: list[dict[str, Any]] = []
    for h in hits:
        out.append(
            {
                "id": int(h.get("_id")),
                "score": float(h.get("_score") or 0.0),
                "source": h.get("_source") or {},
            }
        )
    return out

