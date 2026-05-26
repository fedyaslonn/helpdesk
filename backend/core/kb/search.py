from __future__ import annotations

import re
from typing import Any

from django.contrib.postgres.search import SearchQuery, SearchRank, SearchVector
from django.db.models import F, Value

from core.models import KnowledgeBaseArticle

FTS_CONFIG = "russian"
_MAX_QUERY_TERMS = 12
_MIN_TERM_LEN = 3


def _combined_search_vector(article: KnowledgeBaseArticle) -> SearchVector:
    """tsvector: заголовок (A), текст (B), теги (C), категория (D)."""
    vector = (
        SearchVector(Value(article.title or ""), weight="A", config=FTS_CONFIG)
        + SearchVector(Value(article.content or ""), weight="B", config=FTS_CONFIG)
        + SearchVector(Value(article.tags or ""), weight="C", config=FTS_CONFIG)
    )
    if article.category_id and article.category:
        vector = vector + SearchVector(
            Value(article.category.name), weight="D", config=FTS_CONFIG
        )
    return vector


def refresh_search_vector(article_id: int) -> None:
    article = KnowledgeBaseArticle.objects.select_related("category").get(pk=article_id)
    KnowledgeBaseArticle.objects.filter(pk=article_id).update(
        search_vector=_combined_search_vector(article)
    )


def refresh_all_search_vectors() -> int:
    count = 0
    for article in KnowledgeBaseArticle.objects.select_related("category").iterator():
        KnowledgeBaseArticle.objects.filter(pk=article.pk).update(
            search_vector=_combined_search_vector(article)
        )
        count += 1
    return count


def _extract_terms(query: str) -> list[str]:
    terms = [t for t in re.split(r"\W+", (query or "").lower()) if len(t) >= _MIN_TERM_LEN]
    seen: set[str] = set()
    unique: list[str] = []
    for term in terms:
        if term not in seen:
            seen.add(term)
            unique.append(term)
        if len(unique) >= _MAX_QUERY_TERMS:
            break
    return unique


def _build_search_queries(query: str) -> list[SearchQuery]:
    """Несколько tsquery: OR по терминам, websearch и plain для коротких фраз."""
    queries: list[SearchQuery] = []
    terms = _extract_terms(query)

    if terms:
        or_expr = " | ".join(terms)
        queries.append(SearchQuery(or_expr, config=FTS_CONFIG, search_type="raw"))

    stripped = (query or "").strip()
    if stripped:
        queries.append(
            SearchQuery(stripped, config=FTS_CONFIG, search_type="websearch")
        )
        if len(terms) <= 4:
            queries.append(SearchQuery(stripped, config=FTS_CONFIG, search_type="plain"))

    return queries


def _run_fts_query(
    qs,
    search_query: SearchQuery,
    *,
    size: int,
) -> list[KnowledgeBaseArticle]:
    return list(
        qs.annotate(rank=SearchRank(F("search_vector"), search_query))
        .filter(search_vector=search_query)
        .order_by("-rank", "-helpful_count", "-view_count")[:size]
    )


def search_kb(
    query: str, *, size: int = 3, is_published_only: bool = False
) -> list[dict[str, Any]]:
    """
    Полнотекстовый поиск статей БЗ (PostgreSQL tsvector + tsquery + ts_rank).
    Возвращает список {id, score, article}.
    """
    qs = KnowledgeBaseArticle.objects.select_related("category").exclude(
        search_vector__isnull=True
    )
    if is_published_only:
        qs = qs.filter(is_published=True)

    if not (query or "").strip():
        articles = list(qs.order_by("-helpful_count", "-view_count")[:size])
        return [_article_hit(a, 0.0) for a in articles]

    seen_ids: set[int] = set()
    ranked: list[KnowledgeBaseArticle] = []

    for search_query in _build_search_queries(query):
        for article in _run_fts_query(qs, search_query, size=size):
            if article.id in seen_ids:
                continue
            seen_ids.add(article.id)
            ranked.append(article)
            if len(ranked) >= size:
                break
        if len(ranked) >= size:
            break

    return [_article_hit(a, float(getattr(a, "rank", 0.0) or 0.0)) for a in ranked]


def _article_hit(article: KnowledgeBaseArticle, score: float) -> dict[str, Any]:
    return {"id": article.id, "score": score, "article": article}
