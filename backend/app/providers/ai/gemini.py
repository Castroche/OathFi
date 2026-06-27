from __future__ import annotations

from typing import Any

from app.core.config import settings
from app.providers.ai.base import AIProvider, AIProviderError, extract_json_object, normalize_analysis_payload, post_json
from app.schemas.ai import AIAnalyzeRequest


class GeminiProvider(AIProvider):
    name = "gemini"

    def __init__(self, *, api_key: str | None = None, model: str | None = None, api_base: str | None = None) -> None:
        self.api_key = api_key or settings.gemini_api_key
        self.model = model or settings.gemini_model
        self.api_base = (api_base or "https://generativelanguage.googleapis.com/v1beta").rstrip("/")

    def analyze(self, request: AIAnalyzeRequest, *, prompt: str, output_schema: dict[str, Any]):
        if not self.api_key:
            raise AIProviderError("GEMINI_API_KEY is not configured.")
        payload = post_json(
            f"{self.api_base}/models/{self.model}:generateContent",
            headers={"x-goog-api-key": self.api_key},
            body={
                "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.2,
                    "responseMimeType": "application/json",
                },
            },
            timeout=settings.ai_timeout_seconds,
        )
        parts = payload.get("candidates", [{}])[0].get("content", {}).get("parts", [])
        text = "\n".join(str(part.get("text", "")) for part in parts if isinstance(part, dict))
        parsed = extract_json_object(text)
        parsed["token_usage"] = payload.get("usageMetadata")
        return normalize_analysis_payload(parsed, provider=self.name, model=self.model, task=request.task, is_mock=False)
