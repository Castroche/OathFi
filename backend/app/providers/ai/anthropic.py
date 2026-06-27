from __future__ import annotations

from typing import Any

from app.core.config import settings
from app.providers.ai.base import AIProvider, AIProviderError, extract_json_object, normalize_analysis_payload, post_json
from app.schemas.ai import AIAnalyzeRequest


class AnthropicProvider(AIProvider):
    name = "anthropic"

    def __init__(self, *, api_key: str | None = None, model: str | None = None, api_base: str | None = None) -> None:
        self.api_key = api_key or settings.anthropic_api_key
        self.model = model or settings.anthropic_model
        self.api_base = (api_base or "https://api.anthropic.com/v1").rstrip("/")

    def analyze(self, request: AIAnalyzeRequest, *, prompt: str, output_schema: dict[str, Any]):
        if not self.api_key:
            raise AIProviderError("ANTHROPIC_API_KEY is not configured.")
        payload = post_json(
            f"{self.api_base}/messages",
            headers={
                "x-api-key": self.api_key,
                "anthropic-version": "2023-06-01",
            },
            body={
                "model": self.model,
                "max_tokens": 1200,
                "temperature": 0.2,
                "system": "Return only one valid JSON object matching the requested schema.",
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=settings.ai_timeout_seconds,
        )
        content_parts = payload.get("content", [])
        text = ""
        if isinstance(content_parts, list):
            text = "\n".join(str(part.get("text", "")) for part in content_parts if isinstance(part, dict))
        parsed = extract_json_object(text)
        parsed["token_usage"] = payload.get("usage")
        return normalize_analysis_payload(parsed, provider=self.name, model=self.model, task=request.task, is_mock=False)
