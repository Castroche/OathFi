from __future__ import annotations

from time import perf_counter
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.base import now_utc, prefixed_id
from app.models.user_settings import UserSettings
from app.providers.market import MarketProviderError
from app.schemas.settings import (
    SettingsRead,
    SettingsTestAIProviderResult,
    SettingsTestMarketSourceResult,
    SettingsUpdate,
)
from app.services.ai import AIProviderRegistry
from app.services.ai_provider_registry import (
    DEFAULT_SETTINGS_AI_PROVIDER,
    get_settings_ai_provider,
    is_model_allowed,
    normalize_provider_id,
    normalize_provider_model,
)
from app.services.credential_service import CredentialService
from app.services.market_data_service import MarketDataService
from app.services.workflow_service import log_action


class SettingsService:
    def __init__(self) -> None:
        self.market_data = MarketDataService()
        self.ai_registry = AIProviderRegistry()
        self.credentials = CredentialService()

    def get_settings(self, db: Session) -> UserSettings:
        existing = self._latest(db)
        if existing:
            return self._ensure_runtime_defaults(db, existing)
        return self.update_settings(db, self.default_settings())

    def update_settings(self, db: Session, request: SettingsUpdate) -> UserSettings:
        existing = self._latest(db)
        payload = request.model_dump()
        payload["live_trading_enabled"] = False
        payload["real_trading_enabled"] = False
        payload["demo_mode"] = bool(payload["demo_mode_enabled"])
        provider_id, model_name = normalize_provider_model(payload.get("model_provider"), payload.get("model_name"))
        payload["model_provider"] = provider_id
        payload["model_name"] = model_name
        payload["default_ai_provider"] = provider_id
        payload["settings_json"] = self._sanitize_settings_json(payload.get("settings_json", {}))

        if existing is None:
            existing = UserSettings(
                id=prefixed_id("settings"),
                created_at=now_utc(),
                updated_at=now_utc(),
                settings_json={},
            )
            db.add(existing)

        for key, value in payload.items():
            if hasattr(existing, key):
                setattr(existing, key, value)

        existing.default_ai_provider = payload["default_ai_provider"]
        existing.default_symbol = payload["default_symbol"]
        existing.default_timeframe = payload["default_timeframe"]
        existing.demo_mode = payload["demo_mode"]
        existing.real_trading_enabled = False
        existing.live_trading_enabled = False
        existing.updated_at = now_utc()

        merged_json = self._settings_json(existing, payload)
        existing.settings_json = merged_json
        log_action(
            db,
            action_type="UPDATE_SETTINGS",
            entity_type="user_settings",
            entity_id=existing.id,
            message="Saved Settings control plane with live trading disabled.",
            payload={"live_trading_enabled": False, "paper_trading_enabled": existing.paper_trading_enabled},
        )
        db.commit()
        db.refresh(existing)
        return existing

    def reset_settings(self, db: Session) -> UserSettings:
        return self.update_settings(db, self.default_settings())

    def test_market_source(self, db: Session) -> SettingsTestMarketSourceResult:
        stored = self.get_settings(db)
        started = perf_counter()
        checked_at = now_utc()
        try:
            ticker = self.market_data.get_ticker(stored.default_symbol)
            latency_ms = int((perf_counter() - started) * 1000)
            is_mock = bool(ticker.get("is_mock"))
            provider_status = str(ticker.get("status") or "live")
            status = "connected" if not is_mock and provider_status in {"live", "ok"} else "degraded"
            return SettingsTestMarketSourceResult(
                status=status,
                provider=stored.primary_data_source,
                latency_ms=latency_ms,
                checked_at=checked_at,
                error_message=None,
            )
        except MarketProviderError as exc:
            return SettingsTestMarketSourceResult(
                status="disconnected",
                provider=stored.primary_data_source,
                latency_ms=int((perf_counter() - started) * 1000),
                checked_at=checked_at,
                error_message=str(exc),
            )

    def test_ai_provider(self, db: Session) -> SettingsTestAIProviderResult:
        stored = self.get_settings(db)
        provider_key = normalize_provider_id(stored.model_provider)
        provider_definition = get_settings_ai_provider(provider_key)
        credential_config = self.credentials.decrypted_config(db, provider_key)
        config = self.ai_registry.config_for_with_credentials(
            provider_key,
            api_key=credential_config.get("api_key") if credential_config else None,
            base_url=credential_config.get("base_url") if credential_config else None,
            model=stored.model_name,
        )
        checked_at = now_utc()
        if not is_model_allowed(provider_key, stored.model_name):
            return SettingsTestAIProviderResult(
                status="Unsupported Model",
                provider=provider_definition.id,
                display_name=provider_definition.display_name,
                model=stored.model_name,
                checked_at=checked_at,
                error_type="unsupported_model",
                error_message=f"{stored.model_name} is not registered for {provider_definition.display_name}.",
            )
        if config is None:
            return SettingsTestAIProviderResult(
                status="Planned",
                provider=provider_definition.id,
                display_name=provider_definition.display_name,
                model=stored.model_name,
                checked_at=checked_at,
                error_type="provider_not_registered",
                error_message="Provider connector is planned but not registered.",
            )
        if not config.configured:
            return SettingsTestAIProviderResult(
                status="Not Configured",
                provider=provider_definition.id,
                display_name=provider_definition.display_name,
                model=stored.model_name,
                checked_at=checked_at,
                error_type="missing_api_key",
                error_message=f"Missing API Key: {provider_definition.api_key_env_name}.",
            )
        provider = self.ai_registry.provider_from_config(config)
        if provider is None:
            return SettingsTestAIProviderResult(
                status="Planned",
                provider=provider_definition.id,
                display_name=provider_definition.display_name,
                model=stored.model_name,
                checked_at=checked_at,
                error_type="provider_not_registered",
                error_message="Provider connector is planned but not registered.",
            )
        started = perf_counter()
        result = provider.generate_json(
            prompt='Return exactly this JSON object: {"status":"ok"}',
            schema={"type": "object", "required": ["status"], "properties": {"status": {"type": "string"}}},
            model=stored.model_name,
            timeout=min(settings.ai_timeout_seconds, 20),
        )
        latency_ms = result.latency_ms or int((perf_counter() - started) * 1000)
        self.ai_registry.mark_health(provider_key, healthy=result.ok, last_error=result.error_message)
        return SettingsTestAIProviderResult(
            status="Connection OK" if result.ok else "Connection Failed",
            provider=provider_definition.id,
            display_name=provider_definition.display_name,
            model=stored.model_name,
            latency_ms=latency_ms,
            checked_at=checked_at,
            error_type=result.error_type,
            error_message=result.error_message,
        )

    def to_read(self, stored: UserSettings) -> SettingsRead:
        return SettingsRead.model_validate(stored, from_attributes=True)

    def default_settings(self) -> SettingsUpdate:
        default_provider = get_settings_ai_provider(DEFAULT_SETTINGS_AI_PROVIDER)
        return SettingsUpdate(
            default_symbol="ETH/USDT",
            default_timeframe="15m",
            primary_data_source="HTX",
            connection_type="Hybrid",
            fallback_method="REST fallback",
            latency_monitor_enabled=True,
            latency_warning_ms=800,
            latency_critical_ms=2000,
            auto_reconnect_enabled=True,
            model_provider=default_provider.id,
            model_name=default_provider.default_model,
            output_mode="Structured",
            confidence_calibration="Balanced",
            structured_hypothesis_enabled=True,
            max_risk_per_trade=0.01,
            max_daily_loss=0.03,
            max_consecutive_losses=3,
            position_size_mode="Risk Based",
            stop_loss_enforcement=True,
            paper_trading_enabled=settings.paper_trading_enabled,
            live_trading_enabled=False,
            real_trading_enabled=False,
            demo_mode_enabled=True,
            demo_mode=True,
            use_sample_account=True,
            paper_execution_only=True,
            guided_demo_flow=True,
            demo_scenario="pass",
            language="en",
            default_ai_provider=default_provider.id,
            settings_json={},
        )

    def _latest(self, db: Session) -> UserSettings | None:
        return db.scalar(select(UserSettings).order_by(UserSettings.created_at.desc()).limit(1))

    def _ensure_runtime_defaults(self, db: Session, stored: UserSettings) -> UserSettings:
        changed = False
        defaults = self.default_settings().model_dump()
        for key, value in defaults.items():
            if hasattr(stored, key) and getattr(stored, key, None) is None:
                setattr(stored, key, value)
                changed = True
        if stored.live_trading_enabled or stored.real_trading_enabled:
            stored.live_trading_enabled = False
            stored.real_trading_enabled = False
            changed = True
        provider_id, model_name = normalize_provider_model(stored.model_provider, stored.model_name)
        if stored.model_provider != provider_id or stored.model_name != model_name or stored.default_ai_provider != provider_id:
            stored.model_provider = provider_id
            stored.model_name = model_name
            stored.default_ai_provider = provider_id
            changed = True
        if changed:
            stored.updated_at = now_utc()
            db.commit()
            db.refresh(stored)
        return stored

    def _provider_key(self, display_name: str) -> str:
        return normalize_provider_id(display_name)

    def _sanitize_settings_json(self, value: Any) -> dict[str, Any]:
        if not isinstance(value, dict):
            return {}
        sanitized = self._strip_secret_values(value)
        ai_providers = sanitized.get("ai_providers")
        if isinstance(ai_providers, dict):
            sanitized["ai_providers"] = {
                str(name): {
                    "model": str(config.get("model", "")),
                    "api_base": str(config.get("api_base", "")),
                    "configured": bool(config.get("configured", False)),
                }
                for name, config in ai_providers.items()
                if isinstance(config, dict)
            }
        return sanitized

    def _strip_secret_values(self, value: Any) -> Any:
        if isinstance(value, dict):
            return {
                key: self._strip_secret_values(item)
                for key, item in value.items()
                if "api_key" not in key.lower() and "secret" not in key.lower()
            }
        if isinstance(value, list):
            return [self._strip_secret_values(item) for item in value]
        return value

    def _settings_json(self, stored: UserSettings, payload: dict[str, Any]) -> dict[str, Any]:
        sanitized = self._sanitize_settings_json(payload.get("settings_json", {}))
        sanitized["data_source"] = {
            "primary_data_source": stored.primary_data_source,
            "connection_type": stored.connection_type,
            "fallback_method": stored.fallback_method,
            "latency_monitor_enabled": stored.latency_monitor_enabled,
            "latency_warning_ms": stored.latency_warning_ms,
            "latency_critical_ms": stored.latency_critical_ms,
            "auto_reconnect_enabled": stored.auto_reconnect_enabled,
        }
        sanitized["agent"] = {
            "model_provider": stored.model_provider,
            "model_name": stored.model_name,
            "output_mode": stored.output_mode,
            "confidence_calibration": stored.confidence_calibration,
            "structured_hypothesis_enabled": stored.structured_hypothesis_enabled,
            "default_confidence_bands": stored.default_confidence_bands,
        }
        sanitized["risk"] = {
            "risk_per_trade": stored.max_risk_per_trade,
            "daily_loss_limit": stored.max_daily_loss,
            "max_consecutive_losses": stored.max_consecutive_losses,
            "position_size_mode": stored.position_size_mode,
            "stop_loss_enforcement": stored.stop_loss_enforcement,
        }
        sanitized["execution"] = {
            "paper_trading_enabled": stored.paper_trading_enabled,
            "live_trading_enabled": False,
            "paper_execution_only": stored.paper_execution_only,
        }
        sanitized["demo"] = {
            "demo_mode_enabled": stored.demo_mode_enabled,
            "use_sample_account": stored.use_sample_account,
            "guided_demo_flow": stored.guided_demo_flow,
            "demo_scenario": stored.demo_scenario,
        }
        return sanitized
