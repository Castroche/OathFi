from __future__ import annotations

import json
from time import perf_counter
from typing import Any

from app.services.ai.base import AIProvider, AIProviderError, timed_result
from app.services.ai.json_repair import repair_and_parse_json
from app.services.ai.openai_compatible import _post_json
from app.services.ai.schemas import GenerateJsonResult, ProviderConfig


class OllamaProvider(AIProvider):
    def __init__(self, config: ProviderConfig) -> None:
        super().__init__(config)
        self.base_url = (config.base_url or "http://127.0.0.1:11434").rstrip("/")

    def generate_text(self, *, prompt: str, model: str | None = None, timeout: int = 45) -> str:
        try:
            payload = _post_json(
                f"{self.base_url}/api/generate",
                headers={},
                body={"model": model or self.model, "prompt": prompt, "stream": False},
                timeout=timeout,
            )
        except AIProviderError as exc:
            raise AIProviderError(f"Ollama unavailable: {exc}", error_type="ollama_unavailable", raw_text=exc.raw_text) from exc
        return str(payload.get("response", ""))

    def generate_json(self, *, prompt: str, schema: dict[str, Any], model: str | None = None, timeout: int = 45) -> GenerateJsonResult:
        started = perf_counter()
        resolved_model = model or self.model
        try:
            text = self.generate_text(prompt=f"{prompt}\nReturn only JSON matching this schema:\n{json.dumps(schema, ensure_ascii=False)}", model=resolved_model, timeout=timeout)
            ok, parsed, error = repair_and_parse_json(text)
            return GenerateJsonResult(ok=ok, provider=self.provider_name, model=resolved_model, content=parsed, raw_text=text, error_type=None if ok else "json_parse_failed", error_message=None if ok else error, latency_ms=timed_result(started))
        except AIProviderError as exc:
            return GenerateJsonResult(ok=False, provider=self.provider_name, model=resolved_model, raw_text=exc.raw_text[:500], error_type=exc.error_type, error_message=str(exc), latency_ms=timed_result(started))
