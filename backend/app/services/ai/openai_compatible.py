from __future__ import annotations

import json
from time import perf_counter
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.services.ai.base import AIProvider, AIProviderError, classify_provider_error, timed_result
from app.services.ai.json_repair import repair_and_parse_json
from app.services.ai.schemas import GenerateJsonResult, ProviderConfig


def _post_json(url: str, *, headers: dict[str, str], body: dict[str, Any], timeout: int) -> dict[str, Any]:
    request = Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json", **headers},
        method="POST",
    )
    try:
        with urlopen(request, timeout=timeout) as response:
            text = response.read().decode("utf-8", errors="replace")
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise AIProviderError(
            f"Provider HTTP {exc.code}: {detail[:500]}",
            error_type=classify_provider_error(detail, exc.code),
            raw_text=detail,
        ) from exc
    except TimeoutError as exc:
        raise AIProviderError("Provider request timed out.", error_type="timeout") from exc
    except URLError as exc:
        raise AIProviderError(f"Provider network error: {exc.reason}", error_type="provider_error") from exc

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError as exc:
        raise AIProviderError("Provider returned invalid JSON response.", error_type="provider_error", raw_text=text) from exc
    if not isinstance(parsed, dict):
        raise AIProviderError("Provider response was not a JSON object.", error_type="provider_error", raw_text=text)
    return parsed


class OpenAICompatibleProvider(AIProvider):
    supports_streaming = True
    supports_json_mode = True

    def __init__(self, config: ProviderConfig) -> None:
        super().__init__(config)
        self.api_key = config.api_key
        self.base_url = config.base_url.rstrip("/")

    def _chat(self, *, prompt: str, model: str, timeout: int, json_mode: bool) -> dict[str, Any]:
        if not self.api_key:
            raise AIProviderError(f"{self.provider_name.upper()}_API_KEY is not configured.", error_type="not_configured")
        body: dict[str, Any] = {
            "model": model,
            "messages": [
                {"role": "system", "content": "Return only one valid JSON object. Do not use markdown."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
        }
        if json_mode:
            body["response_format"] = {"type": "json_object"}
        return _post_json(
            f"{self.base_url}/chat/completions",
            headers={"Authorization": f"Bearer {self.api_key}"},
            body=body,
            timeout=timeout,
        )

    def generate_text(self, *, prompt: str, model: str | None = None, timeout: int = 45) -> str:
        resolved_model = model or self.model
        payload = self._chat(prompt=prompt, model=resolved_model, timeout=timeout, json_mode=False)
        return str(payload.get("choices", [{}])[0].get("message", {}).get("content", ""))

    def generate_json(self, *, prompt: str, schema: dict[str, Any], model: str | None = None, timeout: int = 45) -> GenerateJsonResult:
        started = perf_counter()
        resolved_model = model or self.model
        strict_prompt = "\n".join(
            [
                prompt,
                "Output contract:",
                json.dumps(schema, ensure_ascii=False),
                "Only output JSON. No markdown, no prose, no code fences.",
            ]
        )
        try:
            try:
                payload = self._chat(prompt=strict_prompt, model=resolved_model, timeout=timeout, json_mode=True)
            except AIProviderError as exc:
                if "response_format" not in str(exc).lower():
                    raise
                payload = self._chat(prompt=strict_prompt, model=resolved_model, timeout=timeout, json_mode=False)
            raw_text = str(payload.get("choices", [{}])[0].get("message", {}).get("content", ""))
            ok, parsed, error = repair_and_parse_json(raw_text)
            if not ok or parsed is None:
                return GenerateJsonResult(
                    ok=False,
                    provider=self.provider_name,
                    model=resolved_model,
                    raw_text=raw_text[:500],
                    error_type="json_parse_failed",
                    error_message=error or "Provider output was not parseable JSON.",
                    usage=payload.get("usage") if isinstance(payload.get("usage"), dict) else {},
                    latency_ms=timed_result(started),
                )
            return GenerateJsonResult(
                ok=True,
                provider=self.provider_name,
                model=resolved_model,
                content=parsed,
                raw_text=raw_text,
                usage=payload.get("usage") if isinstance(payload.get("usage"), dict) else {},
                latency_ms=timed_result(started),
            )
        except AIProviderError as exc:
            return GenerateJsonResult(
                ok=False,
                provider=self.provider_name,
                model=resolved_model,
                raw_text=exc.raw_text[:500],
                error_type=exc.error_type,
                error_message=str(exc),
                latency_ms=timed_result(started),
            )
