from __future__ import annotations

from typing import Any

from app.core.config import settings
from app.services.ai.anthropic_provider import AnthropicProvider
from app.services.ai.base import AIProvider
from app.services.ai.gemini_provider import GeminiProvider
from app.services.ai.ollama_provider import OllamaProvider
from app.services.ai.openai_compatible import OpenAICompatibleProvider
from app.services.ai.schemas import ProviderCapabilities, ProviderConfig, ProviderStatus


_HEALTH_CACHE: dict[str, dict[str, Any]] = {}


class AIProviderRegistry:
    def __init__(self) -> None:
        self._display_names = {
            "deepseek": "DeepSeek",
            "openai": "OpenAI",
            "anthropic": "Anthropic",
            "gemini": "Gemini",
            "qwen": "Qwen",
            "moonshot": "Kimi",
            "zhipu": "GLM",
            "doubao": "Doubao",
            "minimax": "MiniMax",
            "baidu_qianfan": "Baidu Qianfan",
            "tencent_hunyuan": "Tencent Hunyuan",
            "baichuan": "Baichuan",
            "siliconflow": "SiliconFlow",
            "xai": "xAI",
            "mistral": "Mistral",
            "openrouter": "OpenRouter",
            "groq": "Groq",
            "together": "Together",
            "fireworks": "Fireworks",
            "ollama": "Ollama",
        }
        self._openai_compatible = {
            "deepseek",
            "openai",
            "qwen",
            "moonshot",
            "zhipu",
            "doubao",
            "minimax",
            "baichuan",
            "siliconflow",
            "xai",
            "mistral",
            "openrouter",
            "groq",
            "together",
            "fireworks",
        }

    def provider_names(self) -> list[str]:
        return list(self._display_names)

    def get(self, name: str) -> AIProvider | None:
        config = self.config_for(name)
        return self.provider_from_config(config)

    def provider_from_config(self, config: ProviderConfig | None) -> AIProvider | None:
        if config is None:
            return None
        if config.name == "anthropic":
            return AnthropicProvider(config)
        if config.name == "gemini":
            return GeminiProvider(config)
        if config.name == "ollama":
            return OllamaProvider(config)
        if config.openai_compatible:
            return OpenAICompatibleProvider(config)
        return None

    def config_for_with_credentials(
        self,
        name: str,
        *,
        api_key: str | None = None,
        base_url: str | None = None,
        model: str | None = None,
    ) -> ProviderConfig | None:
        config = self.config_for(name)
        if config is None:
            return None
        return config.model_copy(
            update={
                "api_key": api_key or config.api_key,
                "base_url": base_url or config.base_url,
                "default_model": model or config.default_model,
                "configured": bool(api_key or config.api_key) or config.name == "ollama",
            }
        )

    def config_for(self, name: str) -> ProviderConfig | None:
        normalized = name.strip().lower()
        if normalized not in self._display_names:
            return None
        api_key = self._api_key(normalized)
        base_url = self._base_url(normalized)
        model = self.default_model(normalized)
        configured = bool(api_key) or normalized == "ollama"
        return ProviderConfig(
            name=normalized,
            display_name=self._display_names[normalized],
            api_key=api_key,
            base_url=base_url,
            default_model=model,
            configured=configured,
            openai_compatible=normalized in self._openai_compatible,
            capabilities=self._capabilities(normalized),
        )

    def default_provider(self) -> str:
        return (settings.default_ai_provider or "deepseek").strip().lower()

    def default_model(self, provider: str) -> str:
        provider = provider.strip().lower()
        task_model = settings.default_ai_task_model.strip()
        if task_model and ":" in task_model:
            task_provider, task_model_name = task_model.split(":", 1)
            if task_provider.strip().lower() == provider and task_model_name.strip():
                return task_model_name.strip()
        if provider == "deepseek":
            return settings.deepseek_default_model or settings.deepseek_model
        if provider == "openai":
            return settings.openai_default_model or settings.openai_model
        if provider == "anthropic":
            return settings.anthropic_default_model or settings.anthropic_model
        if provider == "gemini":
            return settings.gemini_default_model or settings.gemini_model
        mapping = {
            "qwen": settings.qwen_default_model,
            "moonshot": settings.moonshot_default_model,
            "zhipu": settings.zhipu_default_model,
            "doubao": settings.doubao_default_model,
            "minimax": settings.minimax_default_model,
            "baidu_qianfan": settings.baidu_qianfan_default_model,
            "tencent_hunyuan": settings.tencent_hunyuan_default_model,
            "baichuan": settings.baichuan_default_model,
            "siliconflow": settings.siliconflow_default_model,
            "xai": settings.xai_default_model,
            "mistral": settings.mistral_default_model,
            "openrouter": settings.openrouter_default_model,
            "groq": settings.groq_default_model,
            "together": settings.together_default_model,
            "fireworks": settings.fireworks_default_model,
            "ollama": settings.ollama_default_model,
        }
        return mapping.get(provider, "") or ""

    def statuses(self) -> list[ProviderStatus]:
        rows = []
        for name in self.provider_names():
            config = self.config_for(name)
            if config is None:
                continue
            cached = _HEALTH_CACHE.get(name, {})
            healthy = cached.get("healthy")
            if healthy is None:
                healthy = True if config.configured else False
            rows.append(
                ProviderStatus(
                    name=name,
                    configured=config.configured,
                    healthy=healthy,
                    default_model=config.default_model,
                    base_url=config.base_url,
                    capabilities=config.capabilities,
                    last_error=cached.get("last_error"),
                )
            )
        return rows

    def mark_health(self, provider: str, *, healthy: bool, last_error: str | None = None) -> None:
        _HEALTH_CACHE[provider] = {"healthy": healthy, "last_error": last_error}

    def models_for(self, provider: str) -> dict[str, Any]:
        config = self.config_for(provider)
        if config is None:
            return {"provider": provider, "configured": False, "models": [], "default_model": ""}
        models = [item for item in [config.default_model] if item]
        if config.name == "openrouter" and settings.openrouter_fallback_models:
            models.extend([item.strip() for item in settings.openrouter_fallback_models.split(",") if item.strip()])
        return {
            "provider": config.name,
            "configured": config.configured,
            "models": list(dict.fromkeys(models)),
            "default_model": config.default_model,
        }

    def safe_debug_config(self) -> dict[str, Any]:
        deepseek = self.config_for("deepseek")
        return {
            "default_ai_provider": self.default_provider(),
            "ai_mock_mode": settings.ai_mock_mode,
            "deepseek_configured": bool(deepseek and deepseek.configured),
            "deepseek_model": deepseek.default_model if deepseek else "",
            "deepseek_base_url": deepseek.base_url if deepseek else "",
            "paper_trading_enabled": settings.paper_trading_enabled,
            "real_trading_enabled": settings.real_trading_enabled,
        }

    def _api_key(self, provider: str) -> str:
        mapping = {
            "deepseek": settings.deepseek_api_key,
            "openai": settings.openai_api_key,
            "anthropic": settings.anthropic_api_key,
            "gemini": settings.gemini_api_key,
            "qwen": settings.qwen_api_key,
            "moonshot": settings.moonshot_api_key,
            "zhipu": settings.zhipu_api_key,
            "doubao": settings.volcengine_api_key,
            "minimax": settings.minimax_api_key,
            "baidu_qianfan": settings.baidu_qianfan_api_key,
            "tencent_hunyuan": settings.tencent_secret_id,
            "baichuan": settings.baichuan_api_key,
            "siliconflow": settings.siliconflow_api_key,
            "xai": settings.xai_api_key,
            "mistral": settings.mistral_api_key,
            "openrouter": settings.openrouter_api_key,
            "groq": settings.groq_api_key,
            "together": settings.together_api_key,
            "fireworks": settings.fireworks_api_key,
        }
        return mapping.get(provider, "") or ""

    def _base_url(self, provider: str) -> str:
        mapping = {
            "deepseek": settings.deepseek_base_url,
            "openai": settings.openai_base_url,
            "anthropic": settings.anthropic_base_url,
            "gemini": settings.gemini_base_url,
            "qwen": settings.qwen_base_url,
            "moonshot": settings.moonshot_base_url,
            "zhipu": settings.zhipu_base_url,
            "doubao": settings.volcengine_base_url,
            "minimax": settings.minimax_base_url,
            "baidu_qianfan": settings.baidu_qianfan_base_url,
            "baichuan": settings.baichuan_base_url,
            "siliconflow": settings.siliconflow_base_url,
            "xai": settings.xai_base_url,
            "mistral": settings.mistral_base_url,
            "openrouter": settings.openrouter_base_url,
            "groq": settings.groq_base_url,
            "together": settings.together_base_url,
            "fireworks": settings.fireworks_base_url,
            "ollama": settings.ollama_base_url,
        }
        return mapping.get(provider, "") or ""

    def _capabilities(self, provider: str) -> ProviderCapabilities:
        return ProviderCapabilities(
            streaming=provider in self._openai_compatible or provider in {"anthropic", "gemini", "ollama"},
            json_mode=provider in self._openai_compatible or provider == "gemini",
            tools=provider in {"openai", "anthropic", "gemini"},
            vision=provider in {"openai", "anthropic", "gemini"},
            reasoning=provider in {"openai", "anthropic", "deepseek", "xai", "gemini"},
        )
