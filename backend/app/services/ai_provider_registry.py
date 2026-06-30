from __future__ import annotations

from dataclasses import dataclass
from typing import Literal


ProviderId = Literal[
    "openai",
    "anthropic",
    "gemini",
    "xai",
    "mistral",
    "ollama",
    "deepseek",
    "qwen",
    "zhipu",
    "moonshot",
    "baidu_qianfan",
    "tencent_hunyuan",
    "minimax",
]


@dataclass(frozen=True)
class SettingsAIProviderDefinition:
    id: ProviderId
    display_name: str
    base_url: str
    auth_type: str
    api_key_env_name: str
    model_options: tuple[str, ...]
    default_model: str
    supports_structured_output: bool
    supports_tool_calling: bool
    supports_reasoning_mode: bool
    supports_vision: bool
    supports_streaming: bool
    region: str
    compatibility_notes: str


AI_PROVIDER_REGISTRY: tuple[SettingsAIProviderDefinition, ...] = (
    SettingsAIProviderDefinition(
        id="deepseek",
        display_name="DeepSeek",
        base_url="https://api.deepseek.com",
        auth_type="api_key",
        api_key_env_name="DEEPSEEK_API_KEY",
        model_options=("deepseek-v4-flash", "deepseek-chat", "deepseek-reasoner"),
        default_model="deepseek-v4-flash",
        supports_structured_output=True,
        supports_tool_calling=False,
        supports_reasoning_mode=True,
        supports_vision=False,
        supports_streaming=True,
        region="china",
        compatibility_notes="OpenAI-compatible chat API; reasoning model available separately.",
    ),
    SettingsAIProviderDefinition(
        id="openai",
        display_name="OpenAI",
        base_url="https://api.openai.com/v1",
        auth_type="api_key",
        api_key_env_name="OPENAI_API_KEY",
        model_options=("gpt-4.1", "gpt-4.1-mini", "gpt-4o", "gpt-4o-mini"),
        default_model="gpt-4.1",
        supports_structured_output=True,
        supports_tool_calling=True,
        supports_reasoning_mode=True,
        supports_vision=True,
        supports_streaming=True,
        region="global",
        compatibility_notes="Native OpenAI API provider.",
    ),
    SettingsAIProviderDefinition(
        id="anthropic",
        display_name="Anthropic Claude",
        base_url="https://api.anthropic.com/v1",
        auth_type="api_key",
        api_key_env_name="ANTHROPIC_API_KEY",
        model_options=("claude-3-5-sonnet-latest", "claude-3-5-haiku-latest"),
        default_model="claude-3-5-sonnet-latest",
        supports_structured_output=True,
        supports_tool_calling=True,
        supports_reasoning_mode=True,
        supports_vision=True,
        supports_streaming=True,
        region="global",
        compatibility_notes="Claude Messages API provider.",
    ),
    SettingsAIProviderDefinition(
        id="gemini",
        display_name="Google Gemini",
        base_url="https://generativelanguage.googleapis.com/v1beta",
        auth_type="api_key",
        api_key_env_name="GEMINI_API_KEY",
        model_options=("gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.0-flash"),
        default_model="gemini-1.5-pro",
        supports_structured_output=True,
        supports_tool_calling=True,
        supports_reasoning_mode=True,
        supports_vision=True,
        supports_streaming=True,
        region="global",
        compatibility_notes="Gemini API provider.",
    ),
    SettingsAIProviderDefinition(
        id="xai",
        display_name="xAI Grok",
        base_url="https://api.x.ai/v1",
        auth_type="api_key",
        api_key_env_name="XAI_API_KEY",
        model_options=("grok-2-latest", "grok-2-mini-latest"),
        default_model="grok-2-latest",
        supports_structured_output=True,
        supports_tool_calling=True,
        supports_reasoning_mode=True,
        supports_vision=False,
        supports_streaming=True,
        region="global",
        compatibility_notes="OpenAI-compatible Grok API.",
    ),
    SettingsAIProviderDefinition(
        id="mistral",
        display_name="Mistral",
        base_url="https://api.mistral.ai/v1",
        auth_type="api_key",
        api_key_env_name="MISTRAL_API_KEY",
        model_options=("mistral-large-latest", "mistral-small-latest"),
        default_model="mistral-large-latest",
        supports_structured_output=True,
        supports_tool_calling=True,
        supports_reasoning_mode=False,
        supports_vision=False,
        supports_streaming=True,
        region="global",
        compatibility_notes="OpenAI-compatible Mistral endpoint.",
    ),
    SettingsAIProviderDefinition(
        id="ollama",
        display_name="Ollama / Local",
        base_url="http://localhost:11434",
        auth_type="local",
        api_key_env_name="OLLAMA_BASE_URL",
        model_options=("qwen2.5:7b", "llama3.1:8b", "deepseek-r1:7b"),
        default_model="qwen2.5:7b",
        supports_structured_output=False,
        supports_tool_calling=False,
        supports_reasoning_mode=True,
        supports_vision=False,
        supports_streaming=True,
        region="local",
        compatibility_notes="Local provider; availability depends on installed Ollama models.",
    ),
    SettingsAIProviderDefinition(
        id="qwen",
        display_name="Qwen / DashScope / Alibaba Bailian",
        base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        auth_type="api_key",
        api_key_env_name="QWEN_API_KEY",
        model_options=("qwen-plus", "qwen-turbo", "qwen-max"),
        default_model="qwen-plus",
        supports_structured_output=True,
        supports_tool_calling=True,
        supports_reasoning_mode=True,
        supports_vision=True,
        supports_streaming=True,
        region="china",
        compatibility_notes="DashScope OpenAI-compatible endpoint.",
    ),
    SettingsAIProviderDefinition(
        id="zhipu",
        display_name="Zhipu GLM",
        base_url="https://open.bigmodel.cn/api/paas/v4",
        auth_type="api_key",
        api_key_env_name="ZHIPU_API_KEY",
        model_options=("glm-4-plus", "glm-4-flash"),
        default_model="glm-4-plus",
        supports_structured_output=True,
        supports_tool_calling=True,
        supports_reasoning_mode=False,
        supports_vision=True,
        supports_streaming=True,
        region="china",
        compatibility_notes="OpenAI-compatible GLM API.",
    ),
    SettingsAIProviderDefinition(
        id="moonshot",
        display_name="Moonshot Kimi",
        base_url="https://api.moonshot.cn/v1",
        auth_type="api_key",
        api_key_env_name="MOONSHOT_API_KEY",
        model_options=("moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"),
        default_model="moonshot-v1-32k",
        supports_structured_output=True,
        supports_tool_calling=False,
        supports_reasoning_mode=False,
        supports_vision=False,
        supports_streaming=True,
        region="china",
        compatibility_notes="OpenAI-compatible Moonshot endpoint.",
    ),
    SettingsAIProviderDefinition(
        id="baidu_qianfan",
        display_name="Baidu Qianfan / ERNIE",
        base_url="https://qianfan.baidubce.com/v2",
        auth_type="api_key",
        api_key_env_name="BAIDU_QIANFAN_API_KEY",
        model_options=("ernie-4.0-turbo-8k", "ernie-3.5-8k"),
        default_model="ernie-4.0-turbo-8k",
        supports_structured_output=True,
        supports_tool_calling=True,
        supports_reasoning_mode=False,
        supports_vision=True,
        supports_streaming=True,
        region="china",
        compatibility_notes="Qianfan/ERNIE provider configuration.",
    ),
    SettingsAIProviderDefinition(
        id="tencent_hunyuan",
        display_name="Tencent Hunyuan",
        base_url="https://hunyuan.tencentcloudapi.com",
        auth_type="ak_sk",
        api_key_env_name="TENCENT_SECRET_ID",
        model_options=("hunyuan-turbo", "hunyuan-large"),
        default_model="hunyuan-turbo",
        supports_structured_output=True,
        supports_tool_calling=True,
        supports_reasoning_mode=False,
        supports_vision=True,
        supports_streaming=True,
        region="china",
        compatibility_notes="Tencent Cloud credential flow.",
    ),
    SettingsAIProviderDefinition(
        id="minimax",
        display_name="MiniMax",
        base_url="https://api.minimax.chat/v1",
        auth_type="api_key",
        api_key_env_name="MINIMAX_API_KEY",
        model_options=("abab6.5s-chat", "abab6.5-chat"),
        default_model="abab6.5s-chat",
        supports_structured_output=True,
        supports_tool_calling=False,
        supports_reasoning_mode=False,
        supports_vision=False,
        supports_streaming=True,
        region="china",
        compatibility_notes="MiniMax chat provider.",
    ),
)

DEFAULT_SETTINGS_AI_PROVIDER = "deepseek"

DISPLAY_NAME_ALIASES = {
    "OpenAI": "openai",
    "Anthropic": "anthropic",
    "Claude": "anthropic",
    "Google Gemini": "gemini",
    "Gemini": "gemini",
    "xAI Grok": "xai",
    "Grok": "xai",
    "Mistral": "mistral",
    "Ollama": "ollama",
    "Local / Ollama": "ollama",
    "DeepSeek": "deepseek",
    "Qwen": "qwen",
    "Qwen / DashScope / Alibaba Bailian": "qwen",
    "Kimi": "moonshot",
    "Moonshot Kimi": "moonshot",
    "Zhipu GLM": "zhipu",
    "GLM": "zhipu",
    "Baidu Qianfan / ERNIE": "baidu_qianfan",
    "Tencent Hunyuan": "tencent_hunyuan",
    "MiniMax": "minimax",
}


def provider_ids() -> tuple[str, ...]:
    return tuple(provider.id for provider in AI_PROVIDER_REGISTRY)


def get_settings_ai_provider(provider_id: str | None) -> SettingsAIProviderDefinition:
    normalized = normalize_provider_id(provider_id)
    return next(provider for provider in AI_PROVIDER_REGISTRY if provider.id == normalized)


def normalize_provider_id(provider_id: str | None) -> str:
    raw = (provider_id or DEFAULT_SETTINGS_AI_PROVIDER).strip()
    if raw in DISPLAY_NAME_ALIASES:
        return DISPLAY_NAME_ALIASES[raw]
    lowered = raw.lower()
    if lowered in provider_ids():
        return lowered
    return DEFAULT_SETTINGS_AI_PROVIDER


def normalize_provider_model(provider_id: str | None, model: str | None) -> tuple[str, str]:
    provider = get_settings_ai_provider(provider_id)
    if model and model in provider.model_options:
        return provider.id, model
    return provider.id, provider.default_model


def is_model_allowed(provider_id: str | None, model: str | None) -> bool:
    provider = get_settings_ai_provider(provider_id)
    return bool(model and model in provider.model_options)
