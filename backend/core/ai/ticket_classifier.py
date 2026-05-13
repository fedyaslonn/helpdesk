from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from django.db.models import QuerySet

from core.ai.mongo_rules import ClassificationRule, list_enabled_rules
from core.ai.ollama_client import OllamaResult, classify_with_ollama
from core.models import Priority


@dataclass(frozen=True)
class ClassificationDecision:
    priority: Priority
    resolution_minutes: int
    source: str  # "ollama" | "fallback"
    matched_phrases: list[str]
    confidence: float | None


def _render_rules_for_prompt(rules: Iterable[ClassificationRule]) -> str:
    lines = []
    for r in rules:
        lines.append(
            f'- phrase: "{r.phrase}" => priority_name: "{r.priority_name}", resolution_minutes: {r.resolution_minutes}'
        )
    return "\n".join(lines)


def build_prompt(ticket_text: str, rules: list[ClassificationRule], available_priorities: QuerySet[Priority]) -> str:
    priorities_txt = ", ".join([p.name for p in available_priorities.order_by("level")])
    rules_txt = _render_rules_for_prompt(rules)

    return (
        "You are a strict ticket classifier for a Helpdesk.\n"
        "Your job: determine (1) priority_name and (2) resolution_minutes SLA based ONLY on provided rules.\n"
        "If multiple rules match, choose the one with the highest business impact (prefer higher urgency).\n"
        "If no rules match, choose the lowest urgency priority and set resolution_minutes to 1440.\n"
        "\n"
        f"Allowed priority_name values: [{priorities_txt}]\n"
        "\n"
        "Rules (admin-managed):\n"
        f"{rules_txt if rules_txt else '(no rules)'}\n"
        "\n"
        "Ticket text:\n"
        f"{ticket_text}\n"
        "\n"
        "Return ONLY a JSON object with this exact schema:\n"
        '{\n'
        '  "priority_name": "string",\n'
        '  "resolution_minutes": 60,\n'
        '  "confidence": 0.0,\n'
        '  "matched_phrases": ["string"],\n'
        '  "reasoning": "short string"\n'
        '}\n'
    )


def classify_ticket(ticket_text: str) -> ClassificationDecision:
    rules = list_enabled_rules()
    priorities = Priority.objects.all()
    lowest = priorities.order_by("-level").first() or priorities.order_by("level").first()
    if not lowest:
        raise RuntimeError("No priorities configured in SQL database")

    prompt = build_prompt(ticket_text=ticket_text, rules=rules, available_priorities=priorities)
    try:
        res: OllamaResult = classify_with_ollama(prompt)
        priority = priorities.filter(name__iexact=res.priority_name).first()
        if not priority:
            priority = lowest
        return ClassificationDecision(
            priority=priority,
            resolution_minutes=int(res.resolution_minutes),
            source="ollama",
            matched_phrases=res.matched_phrases,
            confidence=res.confidence,
        )
    except Exception as e:
        print(f"!!! ОШИБКА OLLAMA !!!: {str(e)}")
        return ClassificationDecision(
            priority=lowest,
            resolution_minutes=1440,
            source="fallback",
            matched_phrases=[],
            confidence=None,
        )

