from __future__ import annotations

import json
from time import perf_counter
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.base import now_utc, prefixed_id
from app.models.ai_analysis import AIAnalysis
from app.models.user_settings import UserSettings
from app.schemas.ai import AIAnalyzeRequest
from app.services.ai import AIProviderRegistry
from app.providers.ai.base import AIProviderResponse
from app.services.workflow_service import log_action, new_workflow_id


class AIGatewayError(RuntimeError):
    def __init__(
        self,
        message: str,
        *,
        ai_analysis_id: str | None = None,
        provider: str | None = None,
        error_type: str = "provider_error",
        raw_output_preview: str = "",
    ) -> None:
        super().__init__(message)
        self.ai_analysis_id = ai_analysis_id
        self.provider = provider
        self.error_type = error_type
        self.raw_output_preview = raw_output_preview


ANALYSIS_OUTPUT_SCHEMA: dict[str, Any] = {
    "type": "object",
    "required": ["summary", "signals", "risks", "recommendation", "confidence"],
    "properties": {
        "summary": {"type": "string"},
        "signals": {"type": "array", "items": {"type": "string"}},
        "risks": {"type": "array", "items": {"type": "string"}},
        "recommendation": {
            "type": "string",
            "enum": ["wait_for_confirmation", "no_trade", "watch", "reduce_size", "needs_backtest"],
        },
        "confidence": {"type": "integer", "minimum": 0, "maximum": 100},
    },
}

HYPOTHESIS_OUTPUT_SCHEMA: dict[str, Any] = {
    "type": "object",
    "required": [
        "direction",
        "entry_condition",
        "invalid_condition",
        "stop_loss",
        "take_profit",
        "confidence",
        "feasibility",
        "risk",
        "long_confidence",
        "short_confidence",
        "summary",
        "reasons",
        "warnings",
    ],
    "properties": {
        "direction": {"type": "string", "enum": ["long", "short", "neutral", "no_trade"]},
        "entry_condition": {"type": "string"},
        "invalid_condition": {"type": "string"},
        "stop_loss": {"type": ["number", "null"]},
        "take_profit": {"type": ["number", "null"]},
        "confidence": {"type": "integer", "minimum": 0, "maximum": 100},
        "feasibility": {"type": "integer", "minimum": 0, "maximum": 100},
        "risk": {"type": "integer", "minimum": 0, "maximum": 100},
        "long_confidence": {"type": "integer", "minimum": 0, "maximum": 100},
        "short_confidence": {"type": "integer", "minimum": 0, "maximum": 100},
        "summary": {"type": "string"},
        "reasons": {"type": "array", "items": {"type": "string"}},
        "warnings": {"type": "array", "items": {"type": "string"}},
    },
}

AGENT_HYPOTHESES_OUTPUT_SCHEMA: dict[str, Any] = {
    "type": "object",
    "required": ["summary", "validity", "overall_confidence", "hypotheses"],
    "properties": {
        "summary": {"type": "string"},
        "validity": {"type": "string", "enum": ["low", "moderate", "high", "invalid"]},
        "overall_confidence": {"type": "integer", "minimum": 0, "maximum": 100},
        "hypotheses": {
            "type": "array",
            "minItems": 1,
            "maxItems": 3,
            "items": {
                "type": "object",
                "required": [
                    "label",
                    "direction",
                    "setup_type",
                    "confidence",
                    "market_regime",
                    "thesis_summary",
                    "evidence",
                    "entry_plan",
                    "risk_notes",
                    "why_not_opposite_direction",
                    "invalidation_conditions",
                    "backtest_rule",
                    "audit_summary",
                    "limitations",
                ],
                "properties": {
                    "label": {"type": "string"},
                    "direction": {"type": "string", "enum": ["long", "short", "neutral", "no_trade"]},
                    "setup_type": {
                        "type": "string",
                        "enum": ["breakout", "pullback", "range", "momentum", "mean_reversion", "no_trade"],
                    },
                    "confidence": {"type": "integer", "minimum": 0, "maximum": 100},
                    "market_regime": {"type": "string"},
                    "thesis_summary": {"type": "string"},
                    "evidence": {
                        "type": "object",
                        "required": [
                            "kline_evidence",
                            "indicator_evidence",
                            "orderbook_evidence",
                            "volume_evidence",
                            "risk_evidence",
                        ],
                        "properties": {
                            "kline_evidence": {"type": "string"},
                            "indicator_evidence": {"type": "string"},
                            "orderbook_evidence": {"type": "string"},
                            "volume_evidence": {"type": "string"},
                            "risk_evidence": {"type": "string"},
                        },
                    },
                    "entry_plan": {
                        "type": "object",
                        "required": [
                            "entry_type",
                            "trigger_price",
                            "confirmation_condition",
                            "invalidation_price",
                            "stop_loss",
                            "take_profit_1",
                            "take_profit_2",
                            "expected_rr",
                        ],
                        "properties": {
                            "entry_type": {"type": "string"},
                            "trigger_price": {"type": ["number", "null"]},
                            "confirmation_condition": {"type": "string"},
                            "invalidation_price": {"type": ["number", "null"]},
                            "stop_loss": {"type": ["number", "null"]},
                            "take_profit_1": {"type": ["number", "null"]},
                            "take_profit_2": {"type": ["number", "null"]},
                            "expected_rr": {"type": ["number", "string", "null"]},
                        },
                    },
                    "risk_notes": {"type": "string"},
                    "why_not_opposite_direction": {"type": "string"},
                    "invalidation_conditions": {"type": "string"},
                    "backtest_rule": {
                        "type": "object",
                        "required": ["entry_rule", "exit_rule", "stop_rule", "take_profit_rule", "position_sizing_rule"],
                        "properties": {
                            "entry_rule": {"type": "string"},
                            "exit_rule": {"type": "string"},
                            "stop_rule": {"type": "string"},
                            "take_profit_rule": {"type": "string"},
                            "position_sizing_rule": {"type": "string"},
                        },
                    },
                    "audit_summary": {"type": "string"},
                    "limitations": {"type": "string"},
                },
            },
        },
    },
}


class AIGateway:
    def __init__(self) -> None:
        self.registry = AIProviderRegistry()

    def analyze(self, db: Session, request: AIAnalyzeRequest) -> dict:
        return self.run_analysis(db, request)

    def run_analysis(self, db: Session, request: AIAnalyzeRequest, *, workflow_id: str | None = None) -> dict:
        workflow_id = workflow_id or new_workflow_id()
        output_schema = self._output_schema(request.task)
        prompt = self._build_prompt(request, output_schema)
        runtime_settings = self._runtime_settings(db)
        provider_name = self._provider_name(request.provider, runtime_settings)
        provider = self.registry.get(provider_name)
        if provider is None:
            error_message = f"Unsupported AI provider: {provider_name}"
            failure = self._persist_failed_analysis(
                db,
                request=request,
                workflow_id=workflow_id,
                provider_name=provider_name,
                model="unknown",
                source=provider_name,
                is_mock=False,
                error_message=error_message,
                latency_ms=0,
            )
            db.commit()
            raise AIGatewayError(error_message, ai_analysis_id=failure.id, provider=provider_name, error_type="provider_error")
        started = perf_counter()

        provider_response = self._run_provider(provider, request, prompt=prompt, output_schema=output_schema)
        if isinstance(provider_response, dict) and not provider_response["ok"]:
            latency_ms = int((perf_counter() - started) * 1000)
            failure = self._persist_failed_analysis(
                db,
                request=request,
                workflow_id=workflow_id,
                provider_name=provider.provider_name,
                model=provider_response["model"],
                source=provider.provider_name,
                is_mock=False,
                error_message=provider_response["error_message"],
                latency_ms=latency_ms,
            )
            db.commit()
            self.registry.mark_health(provider.provider_name, healthy=False, last_error=provider_response["error_message"])
            raise AIGatewayError(
                provider_response["error_message"],
                ai_analysis_id=failure.id,
                provider=provider.provider_name,
                error_type=provider_response["error_type"],
                raw_output_preview=provider_response.get("raw_text", "")[:500],
            )

        latency_ms = int((perf_counter() - started) * 1000)
        analysis = self._persist_completed_analysis(
            db,
            request=request,
            workflow_id=workflow_id,
            response=provider_response,
            latency_ms=latency_ms,
        )
        db.commit()
        db.refresh(analysis)
        self.registry.mark_health(provider.provider_name, healthy=True, last_error=None)
        return self._serialize_analysis(analysis, provider_response.raw_output)

    def mark_analysis_failed(self, db: Session, *, analysis_id: str, error_message: str) -> None:
        analysis = db.get(AIAnalysis, analysis_id)
        if not analysis:
            return
        analysis.status = "failed"
        analysis.error_message = error_message
        analysis.updated_at = now_utc()
        log_action(
            db,
            action_type="AI_ANALYSIS_FAILED",
            entity_type="ai_analysis",
            entity_id=analysis.id,
            workflow_id=analysis.workflow_id,
            message=error_message,
            payload={"provider": analysis.provider, "model": analysis.model},
            source=analysis.source,
            status="failed",
            is_mock=analysis.is_mock,
        )

    def _runtime_settings(self, db: Session) -> dict[str, Any]:
        stored = db.scalar(select(UserSettings).order_by(UserSettings.created_at.desc()).limit(1))
        if not stored or not isinstance(stored.settings_json, dict):
            return {}
        return stored.settings_json

    def _provider_name(self, requested: str | None, runtime_settings: dict[str, Any]) -> str:
        configured_default = runtime_settings.get("default_ai_provider")
        normalized = (requested or configured_default or settings.default_ai_provider or "deepseek").strip().lower()
        return normalized

    def _provider_config(self, provider_name: str, runtime_settings: dict[str, Any]) -> dict[str, str]:
        ai_providers = runtime_settings.get("ai_providers")
        if not isinstance(ai_providers, dict):
            return {}
        config = ai_providers.get(provider_name)
        if not isinstance(config, dict):
            return {}
        return {
            "api_key": str(config.get("api_key") or ""),
            "api_base": str(config.get("api_base") or ""),
            "model": str(config.get("model") or ""),
        }

    def _run_provider(self, provider: Any, request: AIAnalyzeRequest, *, prompt: str, output_schema: dict[str, Any]) -> AIProviderResponse | dict[str, Any]:
        model = self._requested_model(request, provider.provider_name) or provider.model
        result = provider.generate_json(
            prompt=prompt,
            schema=output_schema,
            model=model,
            timeout=settings.ai_timeout_seconds,
        )
        if not result.ok or result.content is None:
            return {
                "ok": False,
                "provider": provider.provider_name,
                "model": model,
                "error_type": result.error_type or "provider_error",
                "error_message": result.error_message or "AI provider failed.",
                "raw_text": result.raw_text[:500],
            }
        return self._normalize_provider_response(result.content, provider=provider.provider_name, model=model, task=request.task, usage=result.usage)

    def _requested_model(self, request: AIAnalyzeRequest, provider_name: str) -> str:
        raw_model = str(request.model or request.context.get("model") or "")
        if raw_model:
            return raw_model
        config = self.registry.config_for(provider_name)
        return config.default_model if config else ""

    def _normalize_provider_response(
        self,
        payload: dict[str, Any],
        *,
        provider: str,
        model: str,
        task: str,
        usage: dict[str, Any],
    ) -> AIProviderResponse:
        from app.providers.ai.base import normalize_analysis_payload

        if task == "agent_hypotheses_generation":
            confidence = payload.get("overall_confidence")
            hypotheses = payload.get("hypotheses") if isinstance(payload.get("hypotheses"), list) else []
            signals = [str(item.get("label") or item.get("type") or "Hypothesis") for item in hypotheses if isinstance(item, dict)]
            risks = [str(item.get("risk") or "") for item in hypotheses if isinstance(item, dict) and item.get("risk")]
            normalized = {
                **payload,
                "signals": signals,
                "risks": risks,
                "recommendation": "needs_backtest",
                "confidence": confidence,
                "token_usage": usage,
            }
            return normalize_analysis_payload(normalized, provider=provider, model=model, task=task, is_mock=False)
        normalized = {**payload, "token_usage": usage}
        return normalize_analysis_payload(normalized, provider=provider, model=model, task=task, is_mock=False)

    def _persist_completed_analysis(
        self,
        db: Session,
        *,
        request: AIAnalyzeRequest,
        workflow_id: str,
        response: AIProviderResponse,
        latency_ms: int,
        fallback_from: str | None = None,
    ) -> AIAnalysis:
        output_json = response.raw_output | {
            "provider": response.provider,
            "model": response.model,
            "task": response.task,
            "summary": response.summary,
            "signals": response.signals,
            "risks": response.risks,
            "recommendation": response.recommendation,
            "confidence": response.confidence,
            "is_mock": response.is_mock,
        }
        if fallback_from:
            output_json["fallback_from_ai_analysis_id"] = fallback_from
        analysis = AIAnalysis(
            id=prefixed_id("ai"),
            workflow_id=workflow_id,
            provider=response.provider,
            model=response.model,
            task=request.task,
            source=response.provider,
            input_json=request.model_dump(),
            output_json=output_json,
            summary=response.summary,
            confidence=response.confidence,
            status="completed",
            error_message=None,
            latency_ms=latency_ms,
            token_usage_json=response.token_usage,
            is_mock=response.is_mock,
            created_at=now_utc(),
            updated_at=now_utc(),
        )
        db.add(analysis)
        log_action(
            db,
            action_type="RUN_AI_ANALYSIS",
            entity_type="ai_analysis",
            entity_id=analysis.id,
            workflow_id=workflow_id,
            message="Stored structured AI analysis.",
            payload={"provider": response.provider, "model": response.model, "is_mock": response.is_mock},
            source=analysis.source,
            status="completed",
            is_mock=response.is_mock,
        )
        return analysis

    def _persist_failed_analysis(
        self,
        db: Session,
        *,
        request: AIAnalyzeRequest,
        workflow_id: str,
        provider_name: str,
        model: str,
        source: str,
        is_mock: bool,
        error_message: str,
        latency_ms: int,
    ) -> AIAnalysis:
        analysis = AIAnalysis(
            id=prefixed_id("ai"),
            workflow_id=workflow_id,
            provider=provider_name,
            model=model,
            task=request.task,
            source=source,
            input_json=request.model_dump(),
            output_json={},
            summary="AI provider failed before producing structured output.",
            confidence=0,
            status="failed",
            error_message=error_message,
            latency_ms=latency_ms,
            token_usage_json=None,
            is_mock=is_mock,
            created_at=now_utc(),
            updated_at=now_utc(),
        )
        db.add(analysis)
        log_action(
            db,
            action_type="AI_ANALYSIS_FAILED",
            entity_type="ai_analysis",
            entity_id=analysis.id,
            workflow_id=workflow_id,
            message=error_message,
            payload={"provider": provider_name, "model": model},
            source=analysis.source,
            status="failed",
            is_mock=analysis.is_mock,
        )
        return analysis

    def _serialize_analysis(self, analysis: AIAnalysis, raw_output: dict[str, Any]) -> dict:
        return {
            "id": analysis.id,
            "ai_analysis_id": analysis.id,
            "workflow_id": analysis.workflow_id,
            "provider": analysis.provider,
            "model": analysis.model,
            "latency_ms": analysis.latency_ms,
            "task": analysis.task,
            "summary": analysis.summary,
            "signals": raw_output.get("signals") or raw_output.get("reasons") or [],
            "risks": raw_output.get("risks") or raw_output.get("warnings") or [],
            "recommendation": raw_output.get("recommendation", "wait_for_confirmation"),
            "confidence": analysis.confidence,
            "raw_output": raw_output,
            "created_at": analysis.created_at,
            "is_mock": analysis.is_mock,
            "source": analysis.source,
            "status": analysis.status,
        }

    def _output_schema(self, task: str) -> dict[str, Any]:
        if task == "hypothesis_generation":
            return HYPOTHESIS_OUTPUT_SCHEMA
        if task == "agent_hypotheses_generation":
            return AGENT_HYPOTHESES_OUTPUT_SCHEMA
        return ANALYSIS_OUTPUT_SCHEMA

    def _build_prompt(self, request: AIAnalyzeRequest, output_schema: dict[str, Any]) -> str:
        context = request.context or {}
        language = "zh-CN" if str(context.get("language") or "").lower().startswith("zh") else "en"
        language_rule = (
            "Language constraint: all human-readable field values must use Simplified Chinese. Keep JSON keys in English. Technical names such as provider names, model IDs, HTX, USDT, API, REST, WebSocket, MACD, and RSI may remain in English."
            if language == "zh-CN"
            else "Language constraint: all human-readable field values must use English. Keep JSON keys in English."
        )
        risk_note_rule = (
            "For zh-CN, risk_notes must include this Chinese safety phrase: 实盘交易已禁用，仅允许模拟交易。 Do not write Live Trading Disabled or Paper Trading Only in Chinese human-readable fields."
            if language == "zh-CN"
            else "For English, risk_notes must explicitly mention: Live Trading Disabled, Paper Trading Only."
        )
        prompt_payload = {
            "symbol": request.symbol,
            "timeframe": context.get("timeframe") or context.get("kline_summary", {}).get("timeframe") or "unknown",
            "task": request.task,
            "language": language,
            "market_snapshot": context.get("market_snapshot") or {},
            "kline_context": context.get("kline_context") or context.get("kline_summary") or {},
            "indicator_context": context.get("indicator_context") or {},
            "orderbook_context": context.get("orderbook_context") or context.get("orderbook") or {},
            "demo_context": context.get("demo_context") or {},
            "ticker_summary": context.get("ticker") or {},
            "orderbook_summary": context.get("orderbook") or {},
            "market_events": context.get("market_events") or [],
            "news_summary": context.get("news") or [],
            "onchain_events": context.get("onchain") or [],
            "kline_summary": context.get("kline_summary") or {},
            "risk_context": context.get("risk_context") or {},
            "output_json_schema": output_schema,
        }
        return "\n".join(
            [
                "You are a crypto market structured research Agent for OathFi.",
                "You may analyze only the provided public market data, klines, indicators, orderbook, and risk rules.",
                "Do not invent missing prices, indicator values, volume, orderbook depth, news, backtest results, or risk approvals.",
                "Do not provide live trading advice. This system is for paper trading and audit demonstrations only.",
                language_rule,
                "For agent_hypotheses_generation, return structured JSON with 1 to 3 research hypotheses only when evidence supports them.",
                "You must judge the market structure: trend, range, breakout, pullback, and liquidity abnormality.",
                "Every conclusion must cite evidence from the input context.",
                "Entry triggers must include specific prices, indicators, volume, spread, or orderbook conditions. Avoid vague phrases such as 'wait for confirmation'.",
                "Never use example/template prices. trigger_price, invalidation_price, stop_loss, take_profit_1, and take_profit_2 must be derived from market_snapshot.last_price, recent_high, recent_low, MA20, MA50, volatility, spread, and orderbook imbalance.",
                "For spot-like symbols, concrete entry/stop/take-profit prices should remain in the same price region as market_snapshot.last_price; if support or resistance cannot be computed, return direction no_trade and setup_type no_trade.",
                "Invalidation must include a concrete price or indicator condition.",
                "Explain the basis for stop loss, take profit, and expected R/R.",
                "Explain why the opposite direction is not preferred.",
                "If evidence is insufficient, use direction no_trade and setup_type no_trade instead of forcing long or short.",
                "Backtest rules must be directly consumable as entry_rule, exit_rule, stop_rule, take_profit_rule, and position_sizing_rule.",
                risk_note_rule,
                "Return only one JSON object matching output_json_schema.",
                json.dumps(prompt_payload, ensure_ascii=False, default=str),
            ]
        )
