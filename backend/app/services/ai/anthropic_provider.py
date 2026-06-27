from __future__ import annotations

import json
from time import perf_counter
from typing import Any

from app.services.ai.base import AIProvider, AIProviderError, timed_result
from app.services.ai.json_repair import repair_and_parse_json
from app.services.ai.openai_compatible import _post_json
from app.services.ai.schemas import GenerateJsonResult, ProviderConfig


class AnthropicProvider(AIProvider):
    def __init__(self, config: ProviderConfig) -> None:
        super().__init__(config)
        self.api_key = config.api_key
        self.base_url = (config.base_url or "https://api.anthropic.com/v1").rstrip("/")

    def generate_text(self, *, prompt: str, model: str | None = None, timeout: int = 45) -> str:
        if not self.api_key:
            raise AIProviderError("ANTHROPIC_API_KEY is not configured.", error_type="not_configured")
        payload = _post_json(
            f"{self.base_url}/messages",
            headers={"x-api-key": self.api_key, "anthropic-version": "2023-06-01"},
            body={"model": model or self.model, "max_tokens": 1200, "temperature": 0.2, "messages": [{"role": "user", "content": prompt}]},
            timeout=timeout,
        )
        return "\n".join(str(part.get("text", "")) for part in payload.get("content", []) if isinstance(part, dict))

    def generate_json(self, *, prompt: str, schema: dict[str, Any], model: str | None = None, timeout: int = 45) -> GenerateJsonResult:
        started = perf_counter()
        resolved_model = model or self.model
        try:
            text = self.generate_text(
                prompt=f"{prompt}\nReturn only JSON matching this schema:\n{json.dumps(schema, ensure_ascii=False)}",
                model=resolved_model,
                timeout=timeout,
            )
            ok, parsed, error = repair_and_parse_json(text)
            return GenerateJsonResult(
                ok=ok,
                provider=self.provider_name,
                model=resolved_model,
                content=parsed,
                raw_text=text,
                error_type=None if ok else "json_parse_failed",
                error_message=None if ok else error,
                latency_ms=timed_result(started),
            )
        except AIProviderError as exc:
            return GenerateJsonResult(ok=False, provider=self.provider_name, model=resolved_model, raw_text=exc.raw_text[:500], error_type=exc.error_type, error_message=str(exc), latency_ms=timed_result(started))
