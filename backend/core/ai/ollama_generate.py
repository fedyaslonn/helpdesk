from __future__ import annotations

import json
import os
import urllib.error
import urllib.request


def _env(name: str, default: str | None = None) -> str | None:
    value = os.getenv(name)
    return value if value not in (None, "") else default


def generate_text(prompt: str) -> str:
    base_url = _env("OLLAMA_BASE_URL", "http://ollama:11434")
    model = _env("OLLAMA_MODEL", "llama3")
    timeout_s = float(_env("OLLAMA_TIMEOUT_SECONDS", "20") or 20)

    if not base_url or not model:
        raise RuntimeError("OLLAMA_BASE_URL / OLLAMA_MODEL is not set")

    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
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
    text = str(outer.get("response") or "").strip()
    if not text:
        raise RuntimeError("Empty response from Ollama")
    return text

