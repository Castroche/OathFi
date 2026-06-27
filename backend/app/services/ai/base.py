from __future__ import annotations

from abc import ABC, abstractmethod
from time import perf_counter
from typing import Any

from app.services.ai.schemas import GenerateJsonResult, ProviderCapabilities, ProviderConfig


class AIProviderError(RuntimeError):
    def __init__(self, message: str, *, error_type: str = "provider_error", raw_text: str = "") -> None:
        super().__init__(message)
        self.error_type = error_type
        self.raw_text = raw_text


class AIProvider(ABC):
    provider_name: str
    supports_streaming: bool = False
    supports_json_mode: bool = False
    supports_tools: bool = False
    supports_vision: bool = False
    supports_reasoning: bool = False

    def __init__(self, config: ProviderConfig) -> None:
        self.config = config
        self.provider_name = config.name
        self.model = config.default_model

    @property
    def capabilities(self) -> ProviderCapabilities:
        return self.config.capabilities

    @abstractmethod
    def generate_text(self, *, prompt: str, model: str | None = None, timeout: int = 45) -> str:
        raise NotImplementedError

    @abstractmethod
    def generate_json(self, *, prompt: str, schema: dict[str, Any], model: str | None = None, timeout: int = 45) -> GenerateJsonResult:
        raise NotImplementedError


def timed_result(started: float) -> int:
    return int((perf_counter() - started) * 1000)


def classify_provider_error(message: str, status_code: int | None = None) -> str:
    lowered = message.lower()
    if status_code in {401, 403} or "unauthorized" in lowered or "invalid api key" in lowered or "api key" in lowered and "invalid" in lowered:
        return "auth_failed"
    if status_code == 404 or "model" in lowered and ("not found" in lowered or "does not exist" in lowered or "not exist" in lowered):
        return "model_not_found"
    if "timeout" in lowered or "timed out" in lowered:
        return "timeout"
    if "not configured" in lowered or "api key is not configured" in lowered:
        return "not_configured"
    return "provider_error"
