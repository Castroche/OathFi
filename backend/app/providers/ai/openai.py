from __future__ import annotations

from typing import Any

from app.core.config import settings
from app.providers.ai.base import AIProvider, AIProviderError, extract_json_object, normalize_analysis_payload, post_json
from app.schemas.ai import AIAnalyzeRequest


class OpenAIProvider(AIProvider):
    name = "openai"

    def __init__(self, *, api_key: str | None = None, model: str | None = None, api_base: str | None = None, name: str | None = None) -> None:
        self.name = name or self.name
        self.api_key = api_key or settings.openai_api_key
        self.model = model or settings.openai_model
        self.api_base = (api_base or "https://api.openai.com/v1").rstrip("/")

    def analyze(self, request: AIAnalyzeRequest, *, prompt: str, output_schema: dict[str, Any]):
        if not self.api_key:
            raise AIProviderError("OPENAI_API_KEY is not configured.")
        payload = post_json(
            f"{self.api_base}/chat/completions",
            headers={"Authorization": f"Bearer {self.api_key}"},
            body={
                "model": self.model,
                "messages": [
                    {"role": "system", "content": "Return only one valid JSON object matching the requested schema."},
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.2,
                "response_format": {"type": "json_object"},
            },
            timeout=settings.ai_timeout_seconds,
        )
        content = payload.get("choices", [{}])[0].get("message", {}).get("content", "")
        parsed = extract_json_object(str(content))
        parsed["token_usage"] = payload.get("usage")
        return normalize_analysis_payload(parsed, provider=self.name, model=self.model, task=request.task, is_mock=False)
