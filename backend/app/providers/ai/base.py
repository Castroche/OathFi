from __future__ import annotations

import json
from abc import ABC, abstractmethod
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.ai import AIAnalyzeRequest


class AIProviderError(RuntimeError):
    pass


class AIProviderResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    provider: str
    model: str
    task: str
    summary: str
    signals: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    recommendation: str = "wait_for_confirmation"
    confidence: int = 0
    raw_output: dict[str, Any] = Field(default_factory=dict)
    is_mock: bool = False
    token_usage: dict[str, Any] | None = None


class AIProvider(ABC):
    name: str
    model: str

    @abstractmethod
    def analyze(self, request: AIAnalyzeRequest, *, prompt: str, output_schema: dict[str, Any]) -> AIProviderResponse:
        raise NotImplementedError


def clamp_score(value: Any, default: int = 0) -> int:
    try:
        score = int(round(float(value)))
    except (TypeError, ValueError):
        score = default
    return max(0, min(score, 100))


def list_of_strings(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item) for item in value if item is not None]
    if isinstance(value, str) and value.strip():
        return [value.strip()]
    return []


def extract_json_object(text: str) -> dict[str, Any]:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:].strip()
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start < 0 or end <= start:
            raise AIProviderError("AI provider did not return a JSON object.") from None
        parsed = json.loads(cleaned[start : end + 1])
    if not isinstance(parsed, dict):
        raise AIProviderError("AI provider returned JSON, but not an object.")
    return parsed


def normalize_analysis_payload(payload: dict[str, Any], *, provider: str, model: str, task: str, is_mock: bool) -> AIProviderResponse:
    return AIProviderResponse(
        provider=provider,
        model=model,
        task=task,
        summary=str(payload.get("summary") or "No summary returned."),
        signals=list_of_strings(payload.get("signals")),
        risks=list_of_strings(payload.get("risks")),
        recommendation=str(payload.get("recommendation") or "wait_for_confirmation"),
        confidence=clamp_score(payload.get("confidence"), 0),
        raw_output=payload,
        is_mock=is_mock,
        token_usage=payload.get("token_usage") if isinstance(payload.get("token_usage"), dict) else None,
    )


def post_json(url: str, *, headers: dict[str, str], body: dict[str, Any], timeout: int) -> dict[str, Any]:
    request = Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json", **headers},
        method="POST",
    )
    try:
        with urlopen(request, timeout=timeout) as response:
            data = response.read().decode("utf-8")
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise AIProviderError(f"AI provider HTTP {exc.code}: {detail[:500]}") from exc
    except URLError as exc:
        raise AIProviderError(f"AI provider network error: {exc.reason}") from exc
    except TimeoutError as exc:
        raise AIProviderError("AI provider request timed out.") from exc

    try:
        parsed = json.loads(data)
    except json.JSONDecodeError as exc:
        raise AIProviderError("AI provider returned invalid JSON.") from exc
    if not isinstance(parsed, dict):
        raise AIProviderError("AI provider response was not a JSON object.")
    return parsed
