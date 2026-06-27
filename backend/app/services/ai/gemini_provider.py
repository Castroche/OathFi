from __future__ import annotations

from time import perf_counter
from typing import Any

from app.services.ai.base import AIProvider, AIProviderError, timed_result
from app.services.ai.json_repair import repair_and_parse_json
from app.services.ai.openai_compatible import _post_json
from app.services.ai.schemas import GenerateJsonResult, ProviderConfig


class GeminiProvider(AIProvider):
    supports_json_mode = True

    def __init__(self, config: ProviderConfig) -> None:
        super().__init__(config)
        self.api_key = config.api_key
        self.base_url = (config.base_url or "https://generativelanguage.googleapis.com/v1beta").rstrip("/")

    def generate_text(self, *, prompt: str, model: str | None = None, timeout: int = 45) -> str:
        if not self.api_key:
            raise AIProviderError("GEMINI_API_KEY is not configured.", error_type="not_configured")
        resolved_model = model or self.model
        payload = _post_json(
            f"{self.base_url}/models/{resolved_model}:generateContent",
            headers={"x-goog-api-key": self.api_key},
            body={"contents": [{"role": "user", "parts": [{"text": prompt}]}], "generationConfig": {"temperature": 0.2, "responseMimeType": "application/json"}},
            timeout=timeout,
        )
        parts = payload.get("candidates", [{}])[0].get("content", {}).get("parts", [])
        return "\n".join(str(part.get("text", "")) for part in parts if isinstance(part, dict))

    def generate_json(self, *, prompt: str, schema: dict[str, Any], model: str | None = None, timeout: int = 45) -> GenerateJsonResult:
        started = perf_counter()
        resolved_model = model or self.model
        try:
            text = self.generate_text(prompt=prompt, model=resolved_model, timeout=timeout)
            ok, parsed, error = repair_and_parse_json(text)
            return GenerateJsonResult(ok=ok, provider=self.provider_name, model=resolved_model, content=parsed, raw_text=text, error_type=None if ok else "json_parse_failed", error_message=None if ok else error, latency_ms=timed_result(started))
        except AIProviderError as exc:
            return GenerateJsonResult(ok=False, provider=self.provider_name, model=resolved_model, raw_text=exc.raw_text[:500], error_type=exc.error_type, error_message=str(exc), latency_ms=timed_result(started))
