from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.base import now_utc, prefixed_id
from app.models.user_settings import UserSettings
from app.schemas.settings import SettingsUpdate
from app.services.workflow_service import log_action


class SettingsService:
    def get_settings(self, db: Session) -> UserSettings:
        existing = db.scalar(select(UserSettings).order_by(UserSettings.created_at.desc()).limit(1))
        if existing:
            return existing
        defaults = SettingsUpdate(
            default_ai_provider=settings.default_ai_provider,
            paper_trading_enabled=settings.paper_trading_enabled,
            real_trading_enabled=False,
        )
        return self.update_settings(db, defaults)

    def update_settings(self, db: Session, request: SettingsUpdate) -> UserSettings:
        existing = db.scalar(select(UserSettings).order_by(UserSettings.created_at.desc()).limit(1))
        payload = request.model_dump()
        payload["real_trading_enabled"] = False
        if existing is None:
            existing = UserSettings(id=prefixed_id("settings"), created_at=now_utc(), updated_at=now_utc(), settings_json={})
            db.add(existing)
        existing.default_symbol = payload["default_symbol"]
        existing.default_timeframe = payload["default_timeframe"]
        existing.demo_mode = False
        existing.default_ai_provider = self._normalize_provider(payload["default_ai_provider"])
        existing.paper_trading_enabled = payload["paper_trading_enabled"]
        existing.real_trading_enabled = False
        existing.language = payload["language"]
        payload["demo_mode"] = False
        payload["default_ai_provider"] = existing.default_ai_provider
        settings_json = self._sanitize_settings_json(payload.get("settings_json", {}))
        settings_json.update({key: value for key, value in payload.items() if key != "settings_json"})
        existing.settings_json = settings_json
        existing.updated_at = now_utc()
        log_action(
            db,
            action_type="UPDATE_SETTINGS",
            entity_type="user_settings",
            entity_id=existing.id,
            message="Saved settings with real trading disabled.",
            payload={"real_trading_enabled": False},
        )
        db.commit()
        db.refresh(existing)
        return existing

    def _normalize_provider(self, provider: str) -> str:
        normalized = (provider or settings.default_ai_provider or "deepseek").strip().lower()
        return normalized

    def _sanitize_settings_json(self, value: dict) -> dict:
        if not isinstance(value, dict):
            return {}
        ai_providers = value.get("ai_providers")
        if not isinstance(ai_providers, dict):
            return {**value, "ai_providers": {}}
        sanitized_providers: dict[str, dict] = {}
        for name, config in ai_providers.items():
            if not isinstance(config, dict):
                continue
            provider_name = self._normalize_provider(str(name))
            sanitized_providers[provider_name] = {
                "api_key": str(config.get("api_key", "")),
                "api_base": str(config.get("api_base", "")),
                "model": str(config.get("model", "")),
            }
        return {**value, "ai_providers": sanitized_providers}
