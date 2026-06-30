from __future__ import annotations

import json
import re
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.base import now_utc, prefixed_id
from app.models.agent_run import AgentRun
from app.models.ai_analysis import AIAnalysis
from app.models.hypothesis import Hypothesis
from app.models.user_settings import UserSettings
from app.schemas.agent import AgentHypothesisGenerateRequest, AgentHypothesisPatchRequest
from app.schemas.ai import AIAnalyzeRequest
from app.services.agent_context_service import AgentContextService
from app.services.ai import AIProviderRegistry
from app.services.ai_gateway import AIGateway, AIGatewayError
from app.services.ai_provider_registry import normalize_provider_model
from app.services.executable_strategy import build_executable_strategy, no_trade_strategy, validate_executable_strategy
from app.services.translation_service import TranslationService
from app.services.workflow_service import log_action, new_workflow_id


class AgentEvidenceOutput(BaseModel):
    model_config = ConfigDict(extra="ignore")

    kline_evidence: str
    indicator_evidence: str
    orderbook_evidence: str
    volume_evidence: str
    risk_evidence: str


class AgentEntryPlanOutput(BaseModel):
    model_config = ConfigDict(extra="ignore")

    entry_type: str
    trigger_price: float | None = None
    confirmation_condition: str
    invalidation_price: float | None = None
    stop_loss: float | None = None
    take_profit_1: float | None = None
    take_profit_2: float | None = None
    expected_rr: float | str | None = None


class AgentBacktestRuleOutput(BaseModel):
    model_config = ConfigDict(extra="ignore")

    entry_rule: str
    exit_rule: str
    stop_rule: str
    take_profit_rule: str
    position_sizing_rule: str


class AgentHypothesisOutput(BaseModel):
    model_config = ConfigDict(extra="ignore")

    label: str
    direction: Literal["long", "short", "neutral", "no_trade"]
    setup_type: Literal["breakout", "pullback", "range", "momentum", "mean_reversion", "no_trade"]
    confidence: int
    market_regime: str
    thesis_summary: str
    evidence: AgentEvidenceOutput
    entry_plan: AgentEntryPlanOutput
    risk_notes: str
    why_not_opposite_direction: str
    invalidation_conditions: str
    backtest_rule: AgentBacktestRuleOutput
    executable_strategy: dict[str, Any] | None = None
    audit_summary: str
    limitations: str

    @field_validator("confidence")
    @classmethod
    def score_range(cls, value: int) -> int:
        return max(0, min(int(value), 100))


class AgentOutput(BaseModel):
    model_config = ConfigDict(extra="ignore")

    summary: str
    validity: Literal["low", "moderate", "high", "invalid"]
    overall_confidence: int
    hypotheses: list[AgentHypothesisOutput] = Field(min_length=1, max_length=3)

    @field_validator("overall_confidence")
    @classmethod
    def overall_range(cls, value: int) -> int:
        return max(0, min(int(value), 100))


class AgentService:
    def __init__(self) -> None:
        self.context = AgentContextService()
        self.ai_gateway = AIGateway()
        self.provider_registry = AIProviderRegistry()
        self.translations = TranslationService()

    def context_for(self, db: Session, symbol: str, timeframe: str) -> dict[str, Any]:
        return self.context.get_context(db, symbol=symbol, timeframe=timeframe)

    def generate(self, db: Session, request: AgentHypothesisGenerateRequest) -> dict[str, Any]:
        workflow_id = new_workflow_id()
        language = self._language(request.language)
        context = self.context.get_context(db, symbol=request.symbol, timeframe=request.timeframe)
        if request.context:
            context = {**context, "operator_context": request.context}
        context = {**context, "language": language}
        ai_context = self._json_safe(self._agent_input_context(context, language=language))
        settings_provider, settings_model = self._settings_provider_model(db)
        provider_name = (settings_provider or request.provider or self.provider_registry.default_provider()).strip().lower()
        provider_config = self.provider_registry.config_for(provider_name)
        provider_configured = bool(provider_config and provider_config.configured)
        model = settings_model or request.model or (provider_config.default_model if provider_config else "")

        agent_run = AgentRun(
            id=prefixed_id("run"),
            workflow_id=workflow_id,
            symbol=context["symbol"],
            timeframe=context["timeframe"],
            current_task=(
                "基于实时市场上下文生成结构化交易研究假设。"
                if language == "zh-CN"
                else "Generate structured trading research hypotheses from live market context."
            ),
            input_sources_json=["htx_rest:ticker", "htx_rest:kline", "htx_rest:orderbook", "htx_rest:trades", "news:rss"],
            output_mode="strict_json",
            confidence_calibration=(
                "0 表示没有可用证据，100 表示高质量共振；仍然只能进入模拟交易。"
                if language == "zh-CN"
                else "0 means no usable evidence, 100 means high-quality confluence; paper trading remains mandatory."
            ),
            context_json=ai_context,
            source="backend",
            status="running",
            is_mock=False,
            provider=provider_name,
            model=model,
            provider_configured=provider_configured,
            provider_healthy=False,
            analysis_mode="ai" if request.mode == "ai" else "rule_based",
            context_loaded=True,
            is_mock_context=bool(context.get("is_mock")),
            created_at=now_utc(),
            updated_at=now_utc(),
        )
        db.add(agent_run)
        db.flush()

        ai_result: dict[str, Any]
        error_type: str | None = None
        error_message: str | None = None
        raw_output_preview: str | None = None
        provider_raw_output: dict[str, Any] | None = None
        latency_ms: int | None = None

        if request.mode == "rule_based" or settings.ai_mock_mode or not provider_configured:
            ai_output = self._rule_based_output(context, language=language)
            error_type = None if request.mode == "rule_based" else "not_configured"
            error_message = None if request.mode == "rule_based" else self._not_configured_message(provider_name, language)
            ai_result = self._fallback_result(provider_name, model, error_type=error_type, error_message=error_message)
        else:
            try:
                ai_result = self.ai_gateway.run_analysis(
                    db,
                    AIAnalyzeRequest(
                        symbol=context["symbol"],
                        task="agent_hypotheses_generation",
                        provider=provider_name,
                        model=model,
                        context={**ai_context, "language": language},
                    ),
                    workflow_id=workflow_id,
                )
                latency_ms = ai_result.get("latency_ms")
                provider_raw_output = self._provider_output_with_metadata(
                    ai_result.get("raw_output"),
                    provider=provider_name,
                    model=model,
                    latency_ms=latency_ms,
                )
                ai_result = {
                    **ai_result,
                    "provider": provider_name,
                    "model": model,
                    "analysis_mode": "ai",
                    "is_ai_generated": True,
                }
                validated_output = AgentOutput.model_validate(ai_result["raw_output"])
                raw_output_preview = json.dumps(provider_raw_output, ensure_ascii=False, default=str)[:500] if provider_raw_output else None
                sanity_error = self._provider_output_sanity_error(validated_output, context, language=language)
                if sanity_error:
                    error_type = "provider_output_invalid"
                    error_message = sanity_error
                    if ai_result.get("ai_analysis_id"):
                        self.ai_gateway.mark_analysis_failed(db, analysis_id=ai_result["ai_analysis_id"], error_message=error_message)
                    ai_output = self._rule_based_output(context, language=language)
                    ai_result = self._fallback_result(provider_name, model, error_type=error_type, error_message=error_message)
                else:
                    ai_output = self._localized_agent_output(validated_output, language=language)
                    agent_run.provider_healthy = True
            except ValidationError as exc:
                error_type = "schema_validation_failed"
                error_message = (
                    f"Agent 假设输出未通过结构校验：{exc}"
                    if language == "zh-CN"
                    else f"Agent hypotheses output failed schema validation: {exc}"
                )
                if "ai_result" in locals() and ai_result.get("ai_analysis_id"):
                    self.ai_gateway.mark_analysis_failed(db, analysis_id=ai_result["ai_analysis_id"], error_message=error_message)
                if "ai_result" in locals() and isinstance(ai_result.get("raw_output"), dict):
                    latency_ms = ai_result.get("latency_ms")
                    provider_raw_output = self._provider_output_with_metadata(
                        ai_result["raw_output"],
                        provider=provider_name,
                        model=model,
                        latency_ms=latency_ms,
                    )
                    raw_output_preview = json.dumps(provider_raw_output, ensure_ascii=False, default=str)[:500]
                ai_output = self._rule_based_output(context, language=language)
                ai_result = self._fallback_result(provider_name, model, error_type=error_type, error_message=error_message)
            except AIGatewayError as exc:
                error_type = exc.error_type
                error_message = self._human_provider_error(provider_name, exc.error_type, str(exc), language=language)
                raw_output_preview = exc.raw_output_preview[:500]
                ai_output = self._rule_based_output(context, language=language)
                ai_result = self._fallback_result(provider_name, model, error_type=error_type, error_message=error_message)

        fallback_reason = error_message if not ai_result.get("is_ai_generated") else None
        provider_status = self._provider_status(provider_configured, bool(ai_result.get("is_ai_generated")), error_type)
        agent_run.ai_analysis_id = ai_result.get("ai_analysis_id")
        agent_run.summary = ai_output.summary
        agent_run.validity = ai_output.validity
        agent_run.overall_confidence = ai_output.overall_confidence
        agent_run.source = ai_result["source"]
        agent_run.status = "completed"
        agent_run.is_mock = ai_result["is_mock"]
        agent_run.provider = provider_name
        agent_run.model = model
        agent_run.provider_configured = provider_configured
        agent_run.provider_healthy = bool(ai_result.get("is_ai_generated"))
        agent_run.analysis_mode = ai_result["analysis_mode"]
        agent_run.raw_output_preview = raw_output_preview
        agent_run.error_type = error_type
        agent_run.error_message = error_message
        agent_run.updated_at = now_utc()

        hypotheses = [
            self._store_hypothesis(
                db,
                request=request,
                context=context,
                workflow_id=workflow_id,
                agent_run=agent_run,
                ai_result=ai_result,
                output=item,
                provider_raw_output=provider_raw_output,
                fallback_reason=fallback_reason,
                provider_status=provider_status,
                latency_ms=latency_ms,
            )
            for item in ai_output.hypotheses
        ]
        log_action(
            db,
            action_type="CREATE_AGENT_RUN",
            entity_type="agent_run",
            entity_id=agent_run.id,
            workflow_id=workflow_id,
            message="Stored structured Agent Lab run with generated hypotheses.",
            payload={"ai_analysis_id": ai_result["ai_analysis_id"], "hypothesis_count": len(hypotheses)},
            source=agent_run.source,
            status="completed",
            is_mock=agent_run.is_mock,
        )
        db.commit()
        db.refresh(agent_run)
        for hypothesis in hypotheses:
            db.refresh(hypothesis)

        serialized = [self.serialize_hypothesis(db, hypothesis) for hypothesis in hypotheses]
        return {
            "provider_configured": provider_configured,
            "provider_healthy": bool(ai_result.get("is_ai_generated")),
            "provider": provider_name,
            "model": model,
            "context_loaded": True,
            "run_created": True,
            "hypotheses_count": len(hypotheses),
            "run_id": agent_run.id,
            "analysis_mode": ai_result["analysis_mode"],
            "is_ai_generated": bool(ai_result.get("is_ai_generated")),
            "error_type": error_type,
            "error_message": error_message,
            "fallback_reason": fallback_reason,
            "provider_status": provider_status,
            "provider_raw_output": provider_raw_output,
            "structured_hypothesis": serialized[0].get("structured_hypothesis") if serialized else None,
            "latency_ms": latency_ms,
            "raw_output_preview": raw_output_preview,
            "agent_run": self.serialize_run(agent_run),
            "context": self.serialize_context(context),
            "summary": agent_run.summary,
            "validity": agent_run.validity,
            "overall_confidence": agent_run.overall_confidence,
            "hypotheses": serialized,
        }

    def get_hypothesis(self, db: Session, hypothesis_id: str) -> dict[str, Any] | None:
        hypothesis = db.get(Hypothesis, hypothesis_id)
        if hypothesis is None:
            return None
        return self.serialize_hypothesis(db, hypothesis)

    def translate_hypothesis(self, db: Session, hypothesis_id: str, *, target_language: str) -> dict[str, Any] | None:
        hypothesis = db.get(Hypothesis, hypothesis_id)
        if hypothesis is None:
            return None
        serialized = self.serialize_hypothesis(db, hypothesis)
        texts = self._hypothesis_translation_texts(serialized)
        translations = self.translations.ensure_translations(
            db,
            texts,
            target_language=target_language,
            provider=hypothesis.provider,
            model=hypothesis.model,
        )
        return {
            "hypothesis_id": hypothesis.id,
            "target_language": self.translations.normalize_language(target_language),
            "translations": translations,
        }

    def list_hypotheses(self, db: Session, *, workflow_id: str | None = None, limit: int = 20) -> list[dict[str, Any]]:
        stmt = select(Hypothesis).order_by(Hypothesis.created_at.desc()).limit(limit)
        if workflow_id:
            stmt = stmt.where(Hypothesis.workflow_id == workflow_id)
        return [self.serialize_hypothesis(db, hypothesis) for hypothesis in db.scalars(stmt)]

    def patch_hypothesis(self, db: Session, hypothesis_id: str, request: AgentHypothesisPatchRequest) -> dict[str, Any] | None:
        hypothesis = db.get(Hypothesis, hypothesis_id)
        if hypothesis is None:
            return None
        if request.trigger is not None:
            hypothesis.trigger = request.trigger
            hypothesis.entry_condition = request.trigger
        if request.invalidation is not None:
            hypothesis.invalidation = request.invalidation
            hypothesis.invalid_condition = request.invalidation
        if request.risk is not None:
            hypothesis.risk_note = request.risk
        if request.backtest_rule is not None:
            hypothesis.backtest_rule = request.backtest_rule
        if request.suggested_action is not None:
            hypothesis.suggested_action = request.suggested_action
            hypothesis.summary = request.suggested_action
        if request.confidence is not None:
            hypothesis.confidence = request.confidence
            hypothesis.feasibility = request.confidence
        if request.status is not None:
            hypothesis.status = request.status
        hypothesis.raw_json = {
            **(hypothesis.raw_json or {}),
            "trigger": hypothesis.trigger,
            "invalidation": hypothesis.invalidation,
            "risk": hypothesis.risk_note,
            "backtest_rule_text": hypothesis.backtest_rule,
            "suggested_action": hypothesis.suggested_action,
            "confidence": hypothesis.confidence,
        }
        hypothesis.updated_at = now_utc()
        log_action(
            db,
            action_type="PATCH_AGENT_HYPOTHESIS",
            entity_type="hypothesis",
            entity_id=hypothesis.id,
            workflow_id=hypothesis.workflow_id,
            message="Updated Agent Lab hypothesis fields.",
            payload=request.model_dump(exclude_none=True),
            source=hypothesis.source,
            status="completed",
            is_mock=hypothesis.is_mock,
        )
        db.commit()
        db.refresh(hypothesis)
        return self.serialize_hypothesis(db, hypothesis)

    def reject_hypothesis(self, db: Session, hypothesis_id: str) -> dict[str, Any] | None:
        hypothesis = db.get(Hypothesis, hypothesis_id)
        if hypothesis is None:
            return None
        hypothesis.status = "rejected"
        hypothesis.updated_at = now_utc()
        log_action(
            db,
            action_type="REJECT_AGENT_HYPOTHESIS",
            entity_type="hypothesis",
            entity_id=hypothesis.id,
            workflow_id=hypothesis.workflow_id,
            message="Rejected Agent Lab hypothesis.",
            payload={"status": "rejected"},
            source=hypothesis.source,
            status="completed",
            is_mock=hypothesis.is_mock,
        )
        db.commit()
        db.refresh(hypothesis)
        return self.serialize_hypothesis(db, hypothesis)

    def serialize_context(self, context: dict[str, Any]) -> dict[str, Any]:
        ticker = context.get("ticker") or {}
        orderbook = context.get("order_book_summary") or {}
        indicators = context.get("indicators") or {}
        closes = [float(row["close"]) for row in (context.get("klines") or {}).get("klines", []) if row.get("close") is not None]
        return {
            "symbol": context["symbol"],
            "timeframe": context["timeframe"],
            "asset": context["asset"],
            "current_price": context.get("current_price"),
            "price": context.get("current_price"),
            "last": context.get("current_price"),
            "change_24h": ticker.get("change_24h"),
            "volume_24h": ticker.get("volume_24h"),
            "high_24h": ticker.get("high_24h"),
            "low_24h": ticker.get("low_24h"),
            "spread": orderbook.get("spread"),
            "imbalance": orderbook.get("imbalance"),
            "orderbook_summary": orderbook,
            "trend": self._trend_label(context),
            "ma": {
                "ma20": indicators.get("ma20"),
                "ma50": indicators.get("ma50"),
                "ma200": indicators.get("ma200"),
            },
            "volatility": self._volatility(closes),
            "key_levels": context["key_levels"],
            "volume": context["volume"],
            "rsi": context.get("rsi"),
            "macd": context["macd"],
            "order_book_summary": context["order_book_summary"],
            "btc_correlation": context["btc_correlation"],
            "funding_rate": context["funding_rate"],
            "recent_events": context["recent_events"],
            "ticker": context.get("ticker"),
            "indicators": context.get("indicators"),
            "updated_at": context["updated_at"],
            "source": context["source"],
            "status": context["status"],
            "is_mock": context["is_mock"],
        }

    def serialize_run(self, agent_run: AgentRun) -> dict[str, Any]:
        return {
            "id": agent_run.id,
            "workflow_id": agent_run.workflow_id,
            "ai_analysis_id": agent_run.ai_analysis_id,
            "symbol": agent_run.symbol,
            "timeframe": agent_run.timeframe,
            "current_task": agent_run.current_task,
            "input_sources": agent_run.input_sources_json,
            "output_mode": agent_run.output_mode,
            "confidence_calibration": agent_run.confidence_calibration,
            "summary": agent_run.summary,
            "validity": agent_run.validity,
            "overall_confidence": agent_run.overall_confidence,
            "created_at": agent_run.created_at,
            "source": agent_run.source,
            "status": agent_run.status,
            "is_mock": agent_run.is_mock,
            "provider": agent_run.provider,
            "model": agent_run.model,
            "provider_configured": agent_run.provider_configured,
            "provider_healthy": agent_run.provider_healthy,
            "analysis_mode": agent_run.analysis_mode,
            "raw_output_preview": agent_run.raw_output_preview,
            "error_type": agent_run.error_type,
            "error_message": agent_run.error_message,
            "fallback_reason": agent_run.error_message if agent_run.analysis_mode == "rule_based" else None,
            "provider_status": self._provider_status(agent_run.provider_configured, agent_run.provider_healthy, agent_run.error_type),
            "latency_ms": None,
            "context_loaded": agent_run.context_loaded,
            "is_mock_context": agent_run.is_mock_context,
        }

    def serialize_hypothesis(self, db: Session, hypothesis: Hypothesis) -> dict[str, Any]:
        analysis = db.get(AIAnalysis, hypothesis.ai_analysis_id) if hypothesis.ai_analysis_id else None
        raw = hypothesis.raw_json or {}
        structured = raw.get("structured_hypothesis") if isinstance(raw.get("structured_hypothesis"), dict) else self._legacy_structured_hypothesis(hypothesis)
        provider_raw_output = raw.get("provider_raw_output")
        if provider_raw_output is None and analysis and isinstance(analysis.output_json, dict):
            provider_raw_output = analysis.output_json
        return {
            "id": hypothesis.id,
            "hypothesis_id": hypothesis.id,
            "workflow_id": hypothesis.workflow_id,
            "market_event_id": hypothesis.market_event_id,
            "ai_analysis_id": hypothesis.ai_analysis_id,
            "agent_run_id": hypothesis.agent_run_id,
            "provider": hypothesis.provider or (analysis.provider if analysis else hypothesis.source),
            "model": hypothesis.model or (analysis.model if analysis else "unknown"),
            "is_ai_generated": hypothesis.is_ai_generated,
            "analysis_mode": hypothesis.analysis_mode,
            "provider_status": raw.get("provider_status") or self._provider_status(bool(hypothesis.provider), hypothesis.is_ai_generated, None),
            "fallback_reason": raw.get("fallback_reason"),
            "provider_raw_output": provider_raw_output,
            "structured_hypothesis": structured,
            "translations": self.translations.cached_translations(db, self._hypothesis_translation_texts_from_parts(hypothesis, structured), target_language="zh-CN"),
            "latency_ms": raw.get("latency_ms") if raw.get("latency_ms") is not None else (analysis.latency_ms if analysis else None),
            "bias": hypothesis.bias,
            "suggested_rule": hypothesis.suggested_rule_json,
            "symbol": hypothesis.symbol,
            "timeframe": hypothesis.timeframe,
            "title": hypothesis.label or "Hypothesis",
            "label": hypothesis.label or "Hypothesis",
            "side": hypothesis.direction,
            "type": hypothesis.hypothesis_type or hypothesis.direction,
            "direction": hypothesis.direction,
            "thesis": hypothesis.summary,
            "trigger": hypothesis.trigger or hypothesis.entry_condition,
            "invalidation": hypothesis.invalidation or hypothesis.invalid_condition,
            "risk": hypothesis.risk_note or str(hypothesis.risk),
            "backtest_rule": hypothesis.backtest_rule or "",
            "suggested_action": hypothesis.suggested_action or hypothesis.summary,
            "confidence": hypothesis.confidence,
            "feasibility": hypothesis.feasibility,
            "risk_score": hypothesis.risk,
            "entry_condition": hypothesis.entry_condition,
            "invalid_condition": hypothesis.invalid_condition,
            "stop_loss": hypothesis.stop_loss,
            "take_profit": hypothesis.take_profit,
            "summary": hypothesis.summary,
            "reasons": hypothesis.reasons_json,
            "warnings": hypothesis.warnings_json,
            "created_at": hypothesis.created_at,
            "latest_backtest_result_id": hypothesis.latest_backtest_result_id,
            "latest_risk_check_id": hypothesis.latest_risk_check_id,
            "latest_paper_order_id": hypothesis.latest_paper_order_id,
            "source": hypothesis.source,
            "status": hypothesis.status,
            "is_mock": hypothesis.is_mock,
        }

    def _hypothesis_translation_texts(self, hypothesis: dict[str, Any]) -> dict[str, str]:
        structured = hypothesis.get("structured_hypothesis") if isinstance(hypothesis.get("structured_hypothesis"), dict) else {}
        texts = {
            "summary": hypothesis.get("summary"),
            "thesis": hypothesis.get("thesis"),
            "trigger": hypothesis.get("trigger"),
            "invalidation": hypothesis.get("invalidation"),
            "risk": hypothesis.get("risk"),
            "backtest_rule": hypothesis.get("backtest_rule"),
            "suggested_action": hypothesis.get("suggested_action"),
            "structured_hypothesis.market_regime": structured.get("market_regime"),
            "structured_hypothesis.thesis_summary": structured.get("thesis_summary"),
            "structured_hypothesis.risk_notes": structured.get("risk_notes"),
            "structured_hypothesis.why_not_opposite_direction": structured.get("why_not_opposite_direction"),
            "structured_hypothesis.invalidation_conditions": structured.get("invalidation_conditions"),
            "structured_hypothesis.audit_summary": structured.get("audit_summary"),
            "structured_hypothesis.limitations": structured.get("limitations"),
        }
        evidence = structured.get("evidence") if isinstance(structured.get("evidence"), dict) else {}
        for key in ("kline_evidence", "indicator_evidence", "orderbook_evidence", "volume_evidence", "risk_evidence"):
            texts[f"structured_hypothesis.evidence.{key}"] = evidence.get(key)
        entry_plan = structured.get("entry_plan") if isinstance(structured.get("entry_plan"), dict) else {}
        texts["structured_hypothesis.entry_plan.confirmation_condition"] = entry_plan.get("confirmation_condition")
        backtest_rule = structured.get("backtest_rule") if isinstance(structured.get("backtest_rule"), dict) else {}
        for key in ("entry_rule", "exit_rule", "stop_rule", "take_profit_rule", "position_sizing_rule"):
            texts[f"structured_hypothesis.backtest_rule.{key}"] = backtest_rule.get(key)
        return {key: str(value).strip() for key, value in texts.items() if value is not None and str(value).strip()}

    def _hypothesis_translation_texts_from_parts(self, hypothesis: Hypothesis, structured: dict[str, Any]) -> dict[str, str]:
        return self._hypothesis_translation_texts(
            {
                "summary": hypothesis.summary,
                "thesis": hypothesis.summary,
                "trigger": hypothesis.trigger or hypothesis.entry_condition,
                "invalidation": hypothesis.invalidation or hypothesis.invalid_condition,
                "risk": hypothesis.risk_note or str(hypothesis.risk),
                "backtest_rule": hypothesis.backtest_rule or "",
                "suggested_action": hypothesis.suggested_action or hypothesis.summary,
                "structured_hypothesis": structured,
            }
        )

    def _store_hypothesis(
        self,
        db: Session,
        *,
        request: AgentHypothesisGenerateRequest,
        context: dict[str, Any],
        workflow_id: str,
        agent_run: AgentRun,
        ai_result: dict[str, Any],
        output: AgentHypothesisOutput,
        provider_raw_output: dict[str, Any] | None,
        fallback_reason: str | None,
        provider_status: str,
        latency_ms: int | None,
    ) -> Hypothesis:
        executable_strategy = output.executable_strategy or build_executable_strategy(
            direction=output.direction,
            entry_type=output.entry_plan.entry_type,
            trigger_price=output.entry_plan.trigger_price,
            stop_loss=output.entry_plan.stop_loss,
            take_profit_1=output.entry_plan.take_profit_1,
            take_profit_2=output.entry_plan.take_profit_2,
            expected_rr=output.entry_plan.expected_rr,
        )
        validation = validate_executable_strategy(executable_strategy, hypothesis_direction=output.direction)
        output_dump = output.model_dump()
        direction = output.direction
        if not validation.valid:
            executable_strategy = no_trade_strategy(";".join(validation.reasons))
            direction = "no_trade"
            output_dump["direction"] = "no_trade"
            output_dump["setup_type"] = "no_trade"
            output_dump["thesis_summary"] = "Executable strategy is invalid, so this hypothesis is not tradeable."
            output_dump["limitations"] = "; ".join([output.limitations, *validation.reasons])
            output_dump["entry_plan"] = {
                **output_dump["entry_plan"],
                "entry_type": "no_trade",
                "trigger_price": None,
                "invalidation_price": None,
                "stop_loss": None,
                "take_profit_1": None,
                "take_profit_2": None,
                "expected_rr": None,
            }
        output_dump["executable_strategy"] = executable_strategy
        structured = {
            **output_dump,
            "provider": ai_result.get("provider"),
            "model": ai_result.get("model"),
            "provider_status": provider_status,
            "latency_ms": latency_ms,
        }
        evidence = structured["evidence"]
        entry_plan = structured["entry_plan"]
        backtest_rule = structured["backtest_rule"]
        risk_score = max(0, min(100, 100 - output.confidence + 35))
        trigger = entry_plan.get("confirmation_condition") or output.entry_plan.confirmation_condition
        invalidation = structured.get("invalidation_conditions") or output.invalidation_conditions
        backtest_rule_text = self._rule_text(backtest_rule)
        source_evidence = {
            "kline_evidence": evidence["kline_evidence"],
            "indicator_evidence": evidence["indicator_evidence"],
            "orderbook_evidence": evidence["orderbook_evidence"],
            "volume_evidence": evidence["volume_evidence"],
            "risk_evidence": evidence["risk_evidence"],
        }
        suggested_rule = {
            **backtest_rule,
            "invalidation_condition": invalidation,
            "source_evidence": source_evidence,
            "entry_plan": entry_plan,
            "market_regime": output.market_regime,
            "setup_type": structured.get("setup_type"),
            "executable_strategy": executable_strategy,
        }
        hypothesis = Hypothesis(
            id=prefixed_id("hyp"),
            workflow_id=workflow_id,
            market_event_id=request.market_event_id or self._first_market_event_id(context),
            ai_analysis_id=ai_result["ai_analysis_id"],
            agent_run_id=agent_run.id,
            symbol=context["symbol"],
            timeframe=context["timeframe"],
            label=output.label,
            hypothesis_type=structured.get("setup_type") or output.setup_type,
            direction=direction,
            trigger=trigger,
            invalidation=invalidation,
            risk_note=output.risk_notes,
            backtest_rule=backtest_rule_text,
            suggested_action=structured.get("thesis_summary") or output.thesis_summary,
            entry_condition=trigger,
            invalid_condition=invalidation,
            stop_loss=entry_plan.get("stop_loss"),
            take_profit=entry_plan.get("take_profit_1"),
            confidence=output.confidence,
            feasibility=output.confidence,
            risk=risk_score,
            long_confidence=output.confidence if direction == "long" else None,
            short_confidence=output.confidence if direction == "short" else None,
            summary=structured.get("thesis_summary") or output.thesis_summary,
            reasons_json=list(source_evidence.values()),
            warnings_json=[structured.get("limitations") or output.limitations],
            raw_json={
                "structured_hypothesis": structured,
                "provider_raw_output": provider_raw_output,
                "fallback_reason": fallback_reason,
                "provider_status": provider_status,
                "model": ai_result.get("model"),
                "latency_ms": latency_ms,
            },
            source=ai_result["source"],
            status="ready_for_rule",
            is_mock=ai_result["is_mock"],
            provider=ai_result.get("provider"),
            model=ai_result.get("model"),
            is_ai_generated=bool(ai_result.get("is_ai_generated")),
            analysis_mode=ai_result.get("analysis_mode", "ai"),
            bias=direction,
            suggested_rule_json=suggested_rule,
            created_at=now_utc(),
            updated_at=now_utc(),
        )
        db.add(hypothesis)
        log_action(
            db,
            action_type="STORE_AGENT_HYPOTHESIS",
            entity_type="hypothesis",
            entity_id=hypothesis.id,
            workflow_id=workflow_id,
            message=f"Stored {output.label} from structured Agent run.",
            payload=structured,
            source=ai_result["source"],
            status="completed",
            is_mock=ai_result["is_mock"],
        )
        return hypothesis

    def _rule_based_output(self, context: dict[str, Any], *, language: str = "en") -> AgentOutput:
        zh = language == "zh-CN"
        symbol = context["symbol"]
        price = self._float(context.get("current_price"))
        levels = context.get("key_levels") or {}
        volume = context.get("volume") or {}
        orderbook = context.get("order_book_summary") or {}
        macd = context.get("macd") or {}
        rsi = self._float(context.get("rsi"))
        ma20 = self._float(levels.get("ma20"))
        ma50 = self._float(levels.get("ma50"))
        support = self._float(levels.get("recent_low")) or (price * 0.985 if price else None)
        resistance = self._float(levels.get("recent_high")) or (price * 1.015 if price else None)
        spread = self._float(orderbook.get("spread"))
        imbalance = self._float(orderbook.get("imbalance"))
        volatility = self._volatility([float(row["close"]) for row in (context.get("klines") or {}).get("klines", []) if row.get("close") is not None])
        volume_ratio = self._float(volume.get("ratio_to_20ma"))
        macd_status = str(macd.get("status") or "unknown")

        evidence_ready = bool(price and ma20 and support and resistance and rsi is not None)
        bullish = evidence_ready and price > ma20 and rsi >= 52 and macd_status == "bullish" and (imbalance is None or imbalance >= -0.1)
        bearish = evidence_ready and price < ma20 and rsi <= 48 and macd_status == "bearish" and (imbalance is None or imbalance <= 0.1)
        direction: Literal["long", "short", "neutral", "no_trade"] = "long" if bullish else ("short" if bearish else "neutral")
        setup_type: Literal["breakout", "pullback", "range", "momentum", "mean_reversion", "no_trade"] = "momentum" if direction in {"long", "short"} else "no_trade"
        if not evidence_ready:
            direction = "neutral"
            setup_type = "no_trade"

        confidence = 42 if setup_type == "no_trade" else 58
        if ma20 and ma50 and ((direction == "long" and ma20 > ma50) or (direction == "short" and ma20 < ma50)):
            confidence += 8
        if volume_ratio and volume_ratio >= 1.1:
            confidence += 5
        if imbalance is not None:
            confidence += min(7, int(abs(imbalance) * 20))
        confidence = max(35, min(confidence, 78))

        if direction == "short":
            trigger_price = min(price * 0.999, support) if price and support else price
            invalidation_price = resistance if resistance else (price * 1.01 if price else None)
            stop_loss = invalidation_price
            take_profit_1 = trigger_price - abs((stop_loss or trigger_price) - trigger_price) * 1.5 if trigger_price and stop_loss else None
            take_profit_2 = trigger_price - abs((stop_loss or trigger_price) - trigger_price) * 2.2 if trigger_price and stop_loss else None
        elif direction == "long":
            trigger_price = max(price * 1.001, resistance) if price and resistance else price
            invalidation_price = support if support else (price * 0.99 if price else None)
            stop_loss = invalidation_price
            take_profit_1 = trigger_price + abs(trigger_price - (stop_loss or trigger_price)) * 1.5 if trigger_price and stop_loss else None
            take_profit_2 = trigger_price + abs(trigger_price - (stop_loss or trigger_price)) * 2.2 if trigger_price and stop_loss else None
        else:
            trigger_price = None
            invalidation_price = None
            stop_loss = None
            take_profit_1 = None
            take_profit_2 = None
        expected_rr = self._expected_rr(price, stop_loss, take_profit_1, direction)
        regime = self._market_regime(context)

        if zh:
            no_trade_reason = "当前证据不足，不生成交易假设。"
            thesis = (
                no_trade_reason
                if setup_type == "no_trade"
                else f"{symbol} 价格 {self._fmt(price)} 相对 MA20={self._fmt(ma20)} 与 RSI={self._fmt(rsi)} 形成同向证据，适合仅作为模拟交易研究假设。"
            )
            evidence = AgentEvidenceOutput(
                kline_evidence=f"最近高点 {self._fmt(resistance)}、低点 {self._fmt(support)}；现价 {self._fmt(price)} 相对 MA20={self._fmt(ma20)}、MA50={self._fmt(ma50)}。",
                indicator_evidence=f"RSI={self._fmt(rsi)}，MACD 状态为 {self._label(macd_status, zh=True)}，波动率约 {self._fmt(volatility)}。",
                orderbook_evidence=f"点差 {self._fmt(spread)}，订单簿 imbalance={self._fmt(imbalance)}，流动性分数 {self._fmt(orderbook.get('liquidity_score'))}。",
                volume_evidence=f"成交量相对 20 均量倍数为 {self._fmt(volume_ratio)}，24h 成交量 {self._fmt(volume.get('volume_24h'))}。",
                risk_evidence="实盘交易已禁用；仅允许模拟交易；任何订单必须先经过回测和风险检查。",
            )
            confirmation = (
                no_trade_reason
                if setup_type == "no_trade"
                else f"触发价 {self._fmt(trigger_price)}，同时 RSI 维持在 {'52 以上' if direction == 'long' else '48 以下'}，点差不高于 {self._fmt(spread)}。"
            )
            invalidation = (
                "若缺少 MA20、RSI、盘口或近期高低点任一关键证据，则假设保持无交易。"
                if setup_type == "no_trade"
                else f"若价格触及 {self._fmt(invalidation_price)} 或 MACD 转为反向状态，则假设失效。"
            )
            risk_notes = "风险来自点差、订单簿失衡、波动率变化和均线失守；实盘交易已禁用，仅允许模拟交易。"
            opposite = "证据不足时不选择反方向；当前盘口、均线与 RSI 未形成反向共振。"
            entry_rule = confirmation
            exit_rule = invalidation
            stop_rule = f"止损固定在 {self._fmt(stop_loss)}，来源于近期支撑/阻力或 MA20 失守。"
            take_profit_rule = f"第一止盈 {self._fmt(take_profit_1)}，第二止盈 {self._fmt(take_profit_2)}，基于止损距离的倍数。"
            sizing_rule = "单笔风险不超过账户权益的 1%，且仅允许模拟交易仓位。"
            summary = f"规则 fallback 已生成保守结构化研究：{thesis}"
            limitations = "规则 fallback 只使用公开行情、指标和盘口快照，不能替代真实研究员复核。"
            audit = "已记录 fallback 原因、证据链、进出场规则和仅模拟交易限制。"
            label = "假设 A"
        else:
            no_trade_reason = "Current evidence is insufficient, so no trading hypothesis is generated."
            thesis = (
                no_trade_reason
                if setup_type == "no_trade"
                else f"{symbol} price {self._fmt(price)} aligns with MA20={self._fmt(ma20)} and RSI={self._fmt(rsi)} for a paper-only research setup."
            )
            evidence = AgentEvidenceOutput(
                kline_evidence=f"Recent high {self._fmt(resistance)}, recent low {self._fmt(support)}; price {self._fmt(price)} versus MA20={self._fmt(ma20)} and MA50={self._fmt(ma50)}.",
                indicator_evidence=f"RSI={self._fmt(rsi)}, MACD status={macd_status}, volatility={self._fmt(volatility)}.",
                orderbook_evidence=f"Spread {self._fmt(spread)}, orderbook imbalance={self._fmt(imbalance)}, liquidity score {self._fmt(orderbook.get('liquidity_score'))}.",
                volume_evidence=f"Volume ratio to 20-period average is {self._fmt(volume_ratio)}, 24h volume {self._fmt(volume.get('volume_24h'))}.",
                risk_evidence="Live Trading Disabled; Paper Trading Only; any order must pass backtest and risk check first.",
            )
            confirmation = (
                no_trade_reason
                if setup_type == "no_trade"
                else f"Trigger price {self._fmt(trigger_price)} with RSI holding {'above 52' if direction == 'long' else 'below 48'} and spread no wider than {self._fmt(spread)}."
            )
            invalidation = (
                "If MA20, RSI, orderbook, or recent high/low evidence is missing, keep no_trade."
                if setup_type == "no_trade"
                else f"Invalidate if price touches {self._fmt(invalidation_price)} or MACD flips against the setup."
            )
            risk_notes = "Risk comes from spread, orderbook imbalance, volatility shifts, and moving-average failure; Live Trading Disabled, Paper Trading Only."
            opposite = "The opposite side is not preferred because orderbook, moving average, and RSI evidence do not align in that direction."
            entry_rule = confirmation
            exit_rule = invalidation
            stop_rule = f"Stop at {self._fmt(stop_loss)}, based on recent support/resistance or MA20 failure."
            take_profit_rule = f"Take profit 1 {self._fmt(take_profit_1)}, take profit 2 {self._fmt(take_profit_2)}, based on stop distance multiples."
            sizing_rule = "Risk no more than 1% account equity per trade and use paper-only position sizing."
            summary = f"Rule-based fallback generated conservative structured research: {thesis}"
            limitations = "Rule fallback uses only public market, indicator, and orderbook snapshots."
            audit = "Fallback reason, evidence chain, executable rules, and Paper Trading Only limits are recorded."
            label = "Hypothesis A"

        output = AgentHypothesisOutput(
            label=label,
            direction=direction,
            setup_type=setup_type,
            confidence=confidence,
            market_regime=regime if not zh else self._label(regime, zh=True),
            thesis_summary=thesis,
            evidence=evidence,
            entry_plan=AgentEntryPlanOutput(
                entry_type="no_trade" if setup_type == "no_trade" else ("breakout_trigger" if direction == "long" else "breakdown_trigger"),
                trigger_price=trigger_price,
                confirmation_condition=confirmation,
                invalidation_price=invalidation_price,
                stop_loss=stop_loss,
                take_profit_1=take_profit_1,
                take_profit_2=take_profit_2,
                expected_rr=expected_rr,
            ),
            risk_notes=risk_notes,
            why_not_opposite_direction=opposite,
            invalidation_conditions=invalidation,
            backtest_rule=AgentBacktestRuleOutput(
                entry_rule=entry_rule,
                exit_rule=exit_rule,
                stop_rule=stop_rule,
                take_profit_rule=take_profit_rule,
                position_sizing_rule=sizing_rule,
            ),
            audit_summary=audit,
            limitations=limitations,
        )
        return AgentOutput(
            summary=summary,
            validity="low" if setup_type == "no_trade" else "moderate",
            overall_confidence=confidence,
            hypotheses=[output],
        )

    def _agent_input_context(self, context: dict[str, Any], *, language: str) -> dict[str, Any]:
        ticker = context.get("ticker") or {}
        orderbook = context.get("order_book_summary") or {}
        levels = context.get("key_levels") or {}
        indicators = context.get("indicators") or {}
        volume = context.get("volume") or {}
        klines = (context.get("klines") or {}).get("klines", [])
        recent = klines[-80:]
        closes = [self._float(row.get("close")) for row in recent if isinstance(row, dict)]
        closes = [item for item in closes if item is not None]
        price = self._float(context.get("current_price"))
        ma20 = self._float(levels.get("ma20") or indicators.get("ma20"))
        ma50 = self._float(levels.get("ma50") or indicators.get("ma50"))
        vwap = self._float(indicators.get("vwap"))
        operator_context = context.get("operator_context") or {}
        return {
            "symbol": context["symbol"],
            "timeframe": context["timeframe"],
            "language": language,
            "market_snapshot": {
                "symbol": context["symbol"],
                "timeframe": context["timeframe"],
                "last_price": price,
                "change_24h": ticker.get("change_24h"),
                "recent_high": levels.get("recent_high"),
                "recent_low": levels.get("recent_low"),
                "ma20": ma20,
                "ma50": ma50,
                "spread": orderbook.get("spread"),
                "orderbook_imbalance": orderbook.get("imbalance"),
                "volume": volume.get("latest") or ticker.get("volume_24h"),
                "volatility": self._volatility(closes),
                "liquidity_score": orderbook.get("liquidity_score"),
            },
            "kline_context": {
                "sample_size": len(recent),
                "summary": self._kline_summary(recent),
                "price_vs_ma20": self._distance(price, ma20),
                "price_vs_ma50": self._distance(price, ma50),
                "price_vs_vwap": self._distance(price, vwap),
                "support": levels.get("recent_low"),
                "resistance": levels.get("recent_high"),
                "breakout_state": self._breakout_state(price, levels),
                "market_regime": self._market_regime(context),
            },
            "indicator_context": {
                "rsi": context.get("rsi"),
                "rsi_status": self._rsi_status(self._float(context.get("rsi"))),
                "macd": context.get("macd"),
                "volume_change": volume.get("ratio_to_20ma"),
                "volatility": self._volatility(closes),
                "btc_correlation": context.get("btc_correlation"),
                "orderbook_imbalance": orderbook.get("imbalance"),
            },
            "orderbook_context": {
                "bid_depth": orderbook.get("bid_depth"),
                "ask_depth": orderbook.get("ask_depth"),
                "bid_ask_imbalance": orderbook.get("imbalance"),
                "spread": orderbook.get("spread"),
                "liquidity_shift": orderbook.get("liquidity_shift"),
                "best_bid": orderbook.get("best_bid"),
                "best_ask": orderbook.get("best_ask"),
            },
            "risk_context": {
                "max_risk_per_trade": "1%",
                "stop_loss_enforcement": True,
                "paper_trading_only": True,
                "live_trading_disabled": not settings.real_trading_enabled,
            },
            "demo_context": {
                "demo_scenario": operator_context.get("demo_scenario", "pass"),
                "output_language": language,
            },
            "recent_events": context.get("recent_events") or [],
        }

    @staticmethod
    def _fallback_result(provider: str, model: str, *, error_type: str | None, error_message: str | None) -> dict[str, Any]:
        return {
            "ai_analysis_id": None,
            "provider": provider,
            "model": model,
            "source": "rule_based",
            "is_mock": False,
            "is_ai_generated": False,
            "analysis_mode": "rule_based",
            "error_type": error_type,
            "error_message": error_message,
        }

    @staticmethod
    def _not_configured_message(provider: str, language: str) -> str:
        display = provider[:1].upper() + provider[1:]
        if language == "zh-CN":
            return f"{display} 尚未配置，已改用规则 fallback；这不是 AI provider 输出。"
        return f"{display} is not configured; generated rule-based fallback instead of provider output."

    @staticmethod
    def _settings_provider_model(db: Session) -> tuple[str | None, str | None]:
        stored = db.scalar(select(UserSettings).order_by(UserSettings.created_at.desc()).limit(1))
        if stored is None:
            return None, None
        provider, model = normalize_provider_model(stored.model_provider, stored.model_name)
        return provider, model

    @staticmethod
    def _human_provider_error(provider: str, error_type: str, message: str, *, language: str = "en") -> str:
        display = provider[:1].upper() + provider[1:]
        if language == "zh-CN":
            if error_type == "auth_failed":
                return "API Key 无效或权限不足，已改用规则 fallback。"
            if error_type == "model_not_found":
                return "模型不存在或已下线，已改用规则 fallback。"
            if error_type == "timeout":
                return "Provider 请求超时，已改用规则 fallback。"
            if error_type == "json_parse_failed":
                return "AI 返回格式错误，无法解析为 JSON，已改用规则 fallback。"
            if error_type == "not_configured":
                return f"{display} 尚未配置，请在 backend/.env 配置 Provider API Key。"
            return f"{display} 已配置，但本次 Agent 分析失败，已改用规则 fallback：{message}"
        if error_type == "auth_failed":
            return "API Key is invalid or permission is insufficient; rule-based fallback was used."
        if error_type == "model_not_found":
            return "Model does not exist or has been deprecated; rule-based fallback was used."
        if error_type == "timeout":
            return "Provider request timed out; rule-based fallback was used."
        if error_type == "json_parse_failed":
            return "AI returned a format error and JSON could not be parsed; rule-based fallback was used."
        if error_type == "not_configured":
            return f"{display} is not configured. Configure the provider API key in backend/.env."
        return f"{display} is configured, but this Agent analysis failed; rule-based fallback was used: {message}"

    @staticmethod
    def _provider_status(provider_configured: bool, provider_healthy: bool, error_type: str | None) -> str:
        if provider_healthy:
            return "provider_success"
        if not provider_configured:
            return "fallback_not_configured"
        if error_type:
            return f"fallback_{error_type}"
        return "rule_based"

    def _provider_output_sanity_error(self, output: AgentOutput, context: dict[str, Any], *, language: str) -> str | None:
        if language == "zh-CN" and self._has_untranslated_english(output):
            return "Provider 返回了未翻译的英文内容，已改用中文规则 fallback。"

        price = self._float(context.get("current_price") or (context.get("ticker") or {}).get("price"))
        if price is None or price <= 0:
            for item in output.hypotheses:
                if item.direction not in {"neutral", "no_trade"}:
                    return (
                        "无法取得有效 last_price，Provider 输出了方向性交易假设，已改用规则 fallback。"
                        if language == "zh-CN"
                        else "No valid last_price is available, but the provider returned a directional setup; rule-based fallback was used."
                    )
            return None

        max_deviation = 0.2
        for item in output.hypotheses:
            is_directional = item.direction in {"long", "short"} and item.setup_type != "no_trade"
            entry = item.entry_plan
            price_fields = {
                "trigger_price": entry.trigger_price,
                "invalidation_price": entry.invalidation_price,
                "stop_loss": entry.stop_loss,
                "take_profit_1": entry.take_profit_1,
                "take_profit_2": entry.take_profit_2,
            }
            populated = [(name, self._float(value)) for name, value in price_fields.items() if value is not None]
            if is_directional and not populated:
                return (
                    "Provider 输出缺少可校验的入场/止损/止盈价位，已改用规则 fallback。"
                    if language == "zh-CN"
                    else "Provider output did not include verifiable entry/stop/take-profit prices; rule-based fallback was used."
                )
            for name, value in populated:
                if value is None or value <= 0:
                    return (
                        f"Provider 输出的 {name}={value} 不是有效价格，已改用规则 fallback。"
                        if language == "zh-CN"
                        else f"Provider output {name}={value} is not a valid price; rule-based fallback was used."
                    )
                deviation = abs(value - price) / price
                if deviation > max_deviation:
                    return (
                        f"Provider 输出的 {name}={self._fmt(value)} 与 last_price={self._fmt(price)} 偏离 {deviation:.1%}，已标记 provider_output_invalid 并改用真实行情规则 fallback。"
                        if language == "zh-CN"
                        else f"Provider output {name}={self._fmt(value)} deviates {deviation:.1%} from last_price={self._fmt(price)}; provider_output_invalid was marked and rule-based fallback was used."
                    )
        return None

    @classmethod
    def _has_untranslated_english(cls, output: AgentOutput) -> bool:
        allowed_tokens = {
            "ai",
            "api",
            "atr",
            "btc",
            "eth",
            "htx",
            "json",
            "macd",
            "ma",
            "ma20",
            "ma50",
            "ma200",
            "provider",
            "rest",
            "rsi",
            "usdt",
            "websocket",
        }

        def walk(value: Any) -> list[str]:
            if isinstance(value, str):
                return [value]
            if isinstance(value, list):
                return [text for item in value for text in walk(item)]
            if isinstance(value, dict):
                return [text for item in value.values() for text in walk(item)]
            return []

        for text in walk(output.model_dump()):
            if not text or re.search(r"[\u4e00-\u9fff]", text):
                continue
            words = [word.lower() for word in re.findall(r"[A-Za-z][A-Za-z-]{2,}", text)]
            meaningful = [word for word in words if word not in allowed_tokens and not re.fullmatch(r"ma\d+", word)]
            if len(meaningful) >= 4:
                return True
        return False

    @classmethod
    def _localized_agent_output(cls, output: AgentOutput, *, language: str) -> AgentOutput:
        if language != "zh-CN":
            return output

        def localize(value: Any) -> Any:
            if isinstance(value, str):
                text = value
                text = text.replace("Live Trading Disabled", "实盘交易已禁用")
                text = text.replace("Paper Trading Only", "仅允许模拟交易")
                text = text.replace("Paper trading only", "仅允许模拟交易")
                text = text.replace("paper trading only", "仅允许模拟交易")
                text = text.replace("Hypothesis A", "假设 A")
                text = text.replace("Hypothesis B", "假设 B")
                text = text.replace("Hypothesis C", "假设 C")
                text = text.replace("Backtest rule", "回测规则")
                text = text.replace("Provider output", "Provider 原始输出")
                return text
            if isinstance(value, list):
                return [localize(item) for item in value]
            if isinstance(value, dict):
                return {key: localize(item) for key, item in value.items()}
            return value

        return AgentOutput.model_validate(localize(output.model_dump()))

    @staticmethod
    def _provider_output_with_metadata(value: Any, *, provider: str, model: str, latency_ms: int | None) -> dict[str, Any] | None:
        if not isinstance(value, dict):
            return None
        return {
            **value,
            "provider": provider,
            "model": model,
            "latency_ms": latency_ms,
        }

    @staticmethod
    def _first_market_event_id(context: dict[str, Any]) -> str | None:
        for event in context.get("recent_events") or []:
            event_id = str(event.get("id") or "")
            if event_id.startswith("evt_"):
                return event_id
        return None

    @staticmethod
    def _language(value: str | None) -> str:
        return "zh-CN" if str(value or "").lower().startswith("zh") else "en"

    @staticmethod
    def _trend_label(context: dict[str, Any]) -> str:
        price = context.get("current_price")
        levels = context.get("key_levels") or {}
        ma20 = levels.get("ma20")
        ma50 = levels.get("ma50")
        if isinstance(price, (int, float)) and isinstance(ma20, (int, float)) and isinstance(ma50, (int, float)):
            if price > ma20 > ma50:
                return "uptrend"
            if price < ma20 < ma50:
                return "downtrend"
        return "range"

    @staticmethod
    def _volatility(closes: list[float]) -> float | None:
        if len(closes) < 3:
            return None
        sample = closes[-60:]
        returns = []
        for index in range(1, len(sample)):
            previous = sample[index - 1]
            if previous:
                returns.append((sample[index] - previous) / previous)
        if not returns:
            return None
        mean = sum(returns) / len(returns)
        variance = sum((item - mean) ** 2 for item in returns) / len(returns)
        return variance ** 0.5

    @staticmethod
    def _json_safe(value: Any) -> Any:
        return json.loads(json.dumps(value, default=str))

    @staticmethod
    def _float(value: Any) -> float | None:
        try:
            if value is None:
                return None
            return float(value)
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _fmt(value: Any) -> str:
        number = AgentService._float(value)
        if number is None:
            return "n/a"
        if abs(number) >= 100:
            return f"{number:.2f}"
        if abs(number) >= 1:
            return f"{number:.4f}"
        return f"{number:.6f}"

    @staticmethod
    def _distance(price: float | None, reference: float | None) -> dict[str, Any]:
        if price is None or reference in (None, 0):
            return {"reference": reference, "distance_pct": None}
        return {"reference": reference, "distance_pct": (price - reference) / reference}

    @staticmethod
    def _breakout_state(price: float | None, levels: dict[str, Any]) -> str:
        high = AgentService._float(levels.get("recent_high"))
        low = AgentService._float(levels.get("recent_low"))
        if price is None or high is None or low is None:
            return "insufficient_data"
        if price > high:
            return "breakout"
        if price < low:
            return "breakdown"
        if high and low and (high - low) / max(price, 1e-9) < 0.015:
            return "range"
        return "inside_recent_range"

    @staticmethod
    def _rsi_status(rsi: float | None) -> str:
        if rsi is None:
            return "insufficient_data"
        if rsi >= 70:
            return "overbought"
        if rsi <= 30:
            return "oversold"
        if rsi >= 55:
            return "bullish"
        if rsi <= 45:
            return "bearish"
        return "neutral"

    @staticmethod
    def _market_regime(context: dict[str, Any]) -> str:
        trend = AgentService._trend_label(context)
        state = AgentService._breakout_state(AgentService._float(context.get("current_price")), context.get("key_levels") or {})
        if state in {"breakout", "breakdown"}:
            return state
        return trend

    @staticmethod
    def _kline_summary(klines: list[dict[str, Any]]) -> dict[str, Any]:
        closes = [AgentService._float(row.get("close")) for row in klines if isinstance(row, dict)]
        closes = [item for item in closes if item is not None]
        if not closes:
            return {"direction": "insufficient_data", "first_close": None, "last_close": None}
        first = closes[0]
        last = closes[-1]
        direction = "up" if last > first else ("down" if last < first else "flat")
        return {
            "direction": direction,
            "first_close": first,
            "last_close": last,
            "change_pct": (last - first) / first if first else None,
            "bars": len(closes),
        }

    @staticmethod
    def _expected_rr(price: float | None, stop_loss: float | None, take_profit: float | None, direction: str) -> float | None:
        if price is None or stop_loss is None or take_profit is None:
            return None
        risk = abs(price - stop_loss)
        reward = abs(take_profit - price)
        if risk <= 0:
            return None
        return round(reward / risk, 2)

    @staticmethod
    def _rule_text(rule: dict[str, Any]) -> str:
        return " | ".join(
            [
                f"entry_rule: {rule.get('entry_rule')}",
                f"exit_rule: {rule.get('exit_rule')}",
                f"stop_rule: {rule.get('stop_rule')}",
                f"take_profit_rule: {rule.get('take_profit_rule')}",
                f"position_sizing_rule: {rule.get('position_sizing_rule')}",
            ]
        )

    @staticmethod
    def _label(value: str, *, zh: bool) -> str:
        if not zh:
            return value
        labels = {
            "uptrend": "上行趋势",
            "downtrend": "下行趋势",
            "range": "震荡区间",
            "breakout": "向上突破",
            "breakdown": "向下跌破",
            "inside_recent_range": "区间内运行",
            "bullish": "偏多",
            "bearish": "偏空",
            "neutral": "中性",
            "unknown": "未知",
            "insufficient_data": "证据不足",
        }
        return labels.get(value, value)

    @staticmethod
    def _legacy_structured_hypothesis(hypothesis: Hypothesis) -> dict[str, Any]:
        return {
            "direction": hypothesis.direction,
            "setup_type": hypothesis.hypothesis_type or hypothesis.direction,
            "confidence": hypothesis.confidence,
            "market_regime": "",
            "thesis_summary": hypothesis.summary,
            "evidence": {
                "kline_evidence": "",
                "indicator_evidence": "",
                "orderbook_evidence": "",
                "volume_evidence": "",
                "risk_evidence": hypothesis.risk_note or "",
            },
            "entry_plan": {
                "entry_type": "legacy",
                "trigger_price": None,
                "confirmation_condition": hypothesis.trigger or hypothesis.entry_condition,
                "invalidation_price": None,
                "stop_loss": hypothesis.stop_loss,
                "take_profit_1": hypothesis.take_profit,
                "take_profit_2": None,
                "expected_rr": None,
            },
            "risk_notes": hypothesis.risk_note or "",
            "why_not_opposite_direction": "",
            "invalidation_conditions": hypothesis.invalidation or hypothesis.invalid_condition,
            "backtest_rule": {
                "entry_rule": hypothesis.entry_condition,
                "exit_rule": hypothesis.invalid_condition,
                "stop_rule": str(hypothesis.stop_loss or ""),
                "take_profit_rule": str(hypothesis.take_profit or ""),
                "position_sizing_rule": "",
            },
            "audit_summary": "",
            "limitations": "",
        }
