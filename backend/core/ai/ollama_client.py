from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class OllamaResult:
    priority_name: str
    resolution_minutes: int
    confidence: float | None
    matched_phrases: list[str]
    reasoning: str | None


def _env(name: str, default: str | None = None) -> str | None:
    value = os.getenv(name)
    return value if value not in (None, "") else default


def _extract_json_object(text: str) -> dict[str, Any]:
    """
    Ollama can occasionally wrap JSON with extra text.
    We extract the first {...} object and parse it.
    """
    text = text.strip()
    if text.startswith("{") and text.endswith("}"):
        return json.loads(text)

    m = re.search(r"\{[\s\S]*\}", text)
    if not m:
        raise ValueError("No JSON object found in model output")
    return json.loads(m.group(0))


def classify_with_ollama(prompt: str) -> OllamaResult:
    base_url = _env("OLLAMA_BASE_URL", "http://ollama:11434")
    model = _env("OLLAMA_MODEL", "llama3")
    timeout_s = float(_env("OLLAMA_TIMEOUT_SECONDS", "300") or 300)

    if not base_url or not model:
        raise RuntimeError("OLLAMA_BASE_URL / OLLAMA_MODEL is not set")

    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "format": "json",
        "options": {
            "temperature": float(_env("OLLAMA_TEMPERATURE", "0.2") or 0.2),
        },
    }
    data = json.dumps(payload).encode("utf-8")

    req = urllib.request.Request(
        url=f"{base_url.rstrip('/')}/api/generate",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout_s) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace") if hasattr(e, "read") else ""
        raise RuntimeError(f"Ollama HTTP {e.code}: {body}") from e
    except Exception as e:
        raise RuntimeError(f"Ollama call failed: {e}") from e

    outer = json.loads(raw)
    response_text = str(outer.get("response") or "").strip()

    print(f"\n--- СЫРОЙ ОТВЕТ OLLAMA ---\n{response_text}\n--------------------------\n")

    if not response_text:
        raise RuntimeError("Empty response from Ollama")

    obj = _extract_json_object(response_text)

    priority_name = str(obj.get("priority_name") or "").strip()
    resolution_minutes = int(obj.get("resolution_minutes"))
    confidence = obj.get("confidence")
    confidence_f = float(confidence) if confidence is not None else None
    matched_phrases = obj.get("matched_phrases") or []
    if not isinstance(matched_phrases, list):
        matched_phrases = []
    matched_phrases_s = [str(x) for x in matched_phrases][:10]
    reasoning = obj.get("reasoning")
    reasoning_s = str(reasoning) if reasoning is not None else None

    if not priority_name:
        raise ValueError("Model returned empty priority_name")
    if resolution_minutes <= 0:
        raise ValueError("Model returned non-positive resolution_minutes")

    return OllamaResult(
        priority_name=priority_name,
        resolution_minutes=resolution_minutes,
        confidence=confidence_f,
        matched_phrases=matched_phrases_s,
        reasoning=reasoning_s,
    )

