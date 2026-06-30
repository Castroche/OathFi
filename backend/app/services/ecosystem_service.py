from __future__ import annotations

from collections.abc import Callable
from typing import Any

from app.db.base import now_utc
from app.providers.market import HtxRestProvider, MarketProviderError
from app.services.credential_service import CredentialService
from app.services.ai import AIProviderRegistry
from app.services.ai_provider_registry import get_settings_ai_provider, normalize_provider_id
from app.services.settings_service import SettingsService
from sqlalchemy.orm import Session


class EcosystemService:
    def __init__(self) -> None:
        self.htx = HtxRestProvider()
        self.ai_registry = AIProviderRegistry()
        self.settings_service = SettingsService()
        self.credential_service = CredentialService()

    def get_htx_status(self, symbol: str = "ETH/USDT", timeframe: str = "1m") -> dict[str, Any]:
        checks = [
            self._market_check("ticker_data", lambda: self.htx.get_ticker(symbol)),
            self._market_check("kline_data", lambda: self.htx.get_klines(symbol, timeframe, 2)),
            self._market_check("order_book", lambda: self.htx.get_orderbook(symbol, 5)),
            self._market_check("trades", lambda: self.htx.get_trades(symbol, 5)),
        ]
        synced_at = now_utc()
        return {
            "api_environment": "production",
            "live_trading_status": "disabled",
            "account_read_only_status": "planned",
            "checks": checks,
            "last_sync": synced_at,
            "source": "htx_rest",
            "is_mock": False,
        }

    def get_ai_compute_status(self, db: Session) -> dict[str, Any]:
        stored = self.settings_service.get_settings(db)
        provider_name = normalize_provider_id(stored.model_provider)
        provider_definition = get_settings_ai_provider(provider_name)
        credential_status = self.credential_service.status(db, provider_name)
        provider_config = self.ai_registry.config_for_with_credentials(
            provider_name,
            api_key="configured" if credential_status.configured else None,
            base_url=credential_status.base_url,
            model=stored.model_name,
        )
        configured = bool(credential_status.configured or (provider_config and provider_config.configured))
        provider_status = "connected" if configured else "disabled"
        provider_model = stored.model_name or (provider_config.default_model if provider_config else None)
        capability_status = "connected" if configured else "disabled"
        return {
            "current_provider": provider_definition.display_name,
            "current_model": provider_model,
            "current_provider_status": provider_status,
            "credential_status": "configured" if credential_status.configured else "not_configured",
            "connection_status": provider_status,
            "last_tested_at": credential_status.updated_at,
            "planned_provider": "B.AI",
            "planned_provider_status": "planned",
            "capabilities": [
                {
                    "id": "agent_reasoning",
                    "status": capability_status,
                    "provider": provider_name,
                    "model": provider_model,
                    "detail": "structured_ai_gateway",
                },
                {
                    "id": "hypothesis_generation",
                    "status": capability_status,
                    "provider": provider_name,
                    "model": provider_model,
                    "detail": "structured_hypothesis_schema",
                },
                {
                    "id": "risk_explanation",
                    "status": capability_status,
                    "provider": provider_name,
                    "model": provider_model,
                    "detail": "risk_context_explanation",
                },
                {
                    "id": "report_generation",
                    "status": capability_status,
                    "provider": provider_name,
                    "model": provider_model,
                    "detail": "audit_report_summary",
                },
            ],
            "updated_at": now_utc(),
            "is_mock": False,
        }

    def get_utility_model(self) -> dict[str, Any]:
        roadmap = "roadmap"
        planned = "planned"
        return {
            "tiers": [
                {
                    "id": "free",
                    "status": roadmap,
                    "features": {
                        "ai_agent_access": planned,
                        "advanced_research": planned,
                        "backtest_quota": planned,
                        "priority_inference": planned,
                        "exclusive_reports": planned,
                        "agent_marketplace_access": planned,
                        "dao_governance_rights": planned,
                        "fee_discounts": planned,
                    },
                },
                {
                    "id": "htx_holder",
                    "status": roadmap,
                    "features": {
                        "ai_agent_access": planned,
                        "advanced_research": planned,
                        "backtest_quota": planned,
                        "priority_inference": planned,
                        "exclusive_reports": planned,
                        "agent_marketplace_access": planned,
                        "dao_governance_rights": planned,
                        "fee_discounts": planned,
                    },
                },
                {
                    "id": "htx_pro",
                    "status": roadmap,
                    "features": {
                        "ai_agent_access": planned,
                        "advanced_research": planned,
                        "backtest_quota": planned,
                        "priority_inference": planned,
                        "exclusive_reports": planned,
                        "agent_marketplace_access": planned,
                        "dao_governance_rights": planned,
                        "fee_discounts": planned,
                    },
                },
            ],
            "updated_at": now_utc(),
            "source": "roadmap",
            "is_mock": False,
        }

    def get_roadmap(self) -> dict[str, Any]:
        htx_status = "connected" if any(
            item["status"] == "connected" for item in self.get_htx_status()["checks"]
        ) else "planned"
        return {
            "items": [
                {
                    "id": "htx_market_data_integration",
                    "status": htx_status,
                    "target": "production",
                    "detail": "public_market_data_health_checks",
                },
                {"id": "b_ai_integration", "status": "planned", "target": "future", "detail": "provider_not_connected"},
                {"id": "htx_usage_tier", "status": "roadmap", "target": "future", "detail": "permissions_not_enabled"},
                {"id": "agent_marketplace", "status": "roadmap", "target": "future", "detail": "marketplace_not_enabled"},
                {"id": "dao_market_intelligence", "status": "roadmap", "target": "future", "detail": "dao_governance_not_enabled"},
            ],
            "updated_at": now_utc(),
            "source": "roadmap",
            "is_mock": False,
        }

    def _market_check(self, check_id: str, call: Callable[[], dict[str, Any]]) -> dict[str, Any]:
        checked_at = now_utc()
        try:
            payload = call()
            healthy = payload.get("status") == "live" and payload.get("is_mock") is False
            return {
                "id": check_id,
                "status": "connected" if healthy else "degraded",
                "source": str(payload.get("source") or "htx_rest"),
                "updated_at": payload.get("updated_at") or checked_at,
                "latency_ms": payload.get("latency_ms"),
                "detail": "real_htx_health_check",
                "error": None,
            }
        except MarketProviderError as exc:
            return {
                "id": check_id,
                "status": "disconnected",
                "source": "htx_rest",
                "updated_at": checked_at,
                "latency_ms": None,
                "detail": "real_htx_health_check_failed",
                "error": str(exc),
            }
