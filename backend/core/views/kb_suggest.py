from __future__ import annotations

from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.ai.ollama_generate import generate_text
from core.kb.elasticsearch_client import search_kb
from core.models import KnowledgeBaseArticle, Ticket, User


def _excerpt(text: str, max_len: int = 220) -> str:
    t = (text or "").strip().replace("\n", " ")
    return t if len(t) <= max_len else t[: max_len - 1].rstrip() + "…"


class KBSuggestView(APIView):
    """
    GET /helpdesk/kb/suggest/?ticket_id=ID
    Синхронный поиск в Elasticsearch + (опционально) RAG-черновик через Ollama.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        ticket_id = request.query_params.get("ticket_id")
        if not ticket_id:
            return Response({"detail": "ticket_id is required"}, status=400)

        try:
            ticket = Ticket.objects.select_related("assigned_engineer__user").get(pk=int(ticket_id))
        except Exception:
            return Response({"detail": "Ticket not found"}, status=404)

        user: User = request.user
        is_admin = user.role == User.Role.ADMIN
        is_engineer = user.role == User.Role.ENGINEER
        is_assignee = bool(ticket.assigned_engineer_id and ticket.assigned_engineer.user_id == user.id)
        if not (is_admin or (is_engineer and is_assignee)):
            return Response({"detail": "Forbidden"}, status=403)

        query = ticket.description or ""
        is_published_only = False  # для инженера показываем и внутренние статьи тоже
        hits = search_kb(query=query, size=3, is_published_only=is_published_only)

        article_ids = [h["id"] for h in hits]
        articles_by_id = {
            a.id: a
            for a in KnowledgeBaseArticle.objects.select_related("category")
            .filter(id__in=article_ids)
        }

        articles_payload = []
        for h in hits:
            a = articles_by_id.get(h["id"])
            if not a:
                continue
            articles_payload.append(
                {
                    "id": a.id,
                    "title": a.title,
                    "category_name": a.category.name if a.category_id else None,
                    "score": h["score"],
                    "excerpt": _excerpt(a.content),
                    "content": a.content,
                    "helpful_count": a.helpful_count,
                }
            )

        draft = None
        top_article_id = articles_payload[0]["id"] if articles_payload else None

        # RAG (опционально): только если есть статьи
        if articles_payload:
            context_blocks = []
            for a in articles_payload:
                context_blocks.append(f"### {a['title']}\n{a['content']}\n")
            context = "\n".join(context_blocks)

            prompt = (
                "You are a helpdesk support engineer.\n"
                "Write a ready-to-send answer to the CLIENT in Russian.\n"
                "Use ONLY the information from the provided Knowledge Base articles.\n"
                "Be concise, actionable, and include step-by-step instructions.\n"
                "If data is insufficient, ask 1-2 clarifying questions at the end.\n"
                "\n"
                "Ticket description:\n"
                f"{query}\n"
                "\n"
                "Knowledge Base articles:\n"
                f"{context}\n"
            )
            try:
                draft = generate_text(prompt)
            except Exception:
                draft = None

        return Response(
            {
                "ticket_id": ticket.id,
                "generated_draft": draft,
                "top_article_id": top_article_id,
                "articles": articles_payload,
                "generated_at": timezone.now().isoformat(),
            }
        )

