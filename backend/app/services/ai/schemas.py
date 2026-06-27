from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ProviderCapabilities(BaseModel):
    streaming: bool = False
    json_mode: bool = False
    tools: bool = False
    vision: bool = False
    reasoning: bool = False


class ProviderStatus(BaseModel):
    name: str
    configured: bool
    healthy: bool | None = None
    default_model: str
    base_url: str
    capabilities: ProviderCapabilities
    last_error: str | None = None


class GenerateJsonResult(BaseModel):
    model_config = ConfigDict(extra="allow")

    ok: bool
    provider: str
    model: str
    content: dict[str, Any] | None = None
    raw_text: str = ""
    error_type: str | None = None
    error_message: str | None = None
    usage: dict[str, Any] = Field(default_factory=dict)
    latency_ms: int = 0


class ProviderConfig(BaseModel):
    name: str
    display_name: str
    api_key: str = ""
    base_url: str = ""
    default_model: str = ""
    configured: bool = False
    openai_compatible: bool = False
    capabilities: ProviderCapabilities = Field(default_factory=ProviderCapabilities)
