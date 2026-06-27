from __future__ import annotations

import json
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.base import now_utc, prefixed_id
from app.core.config import settings
from app.models.agent_run import AgentRun
from app.models.ai_analysis import AIAnalysis
from app.models.hypothesis import Hypothesis
from app.schemas.agent import AgentHypothesisGenerateRequest, AgentHypothesisPatchRequest
from app.schemas.ai import AIAnalyzeRequest
from app.services.agent_context_service import AgentContextService
from app.services.ai import AIProviderRegistry
from app.services.ai_gateway import AIGateway, AIGatewayError
from app.services.workflow_service import log_action, new_workflow_id


class AgentHypothesisOutput(BaseModel):
    model_config = ConfigDict(extra="ignore")

    label: str
    type: str
    trigger: str
    invalidation: str
    risk: str
    backtest_rule: str
    suggested_action: str
    confidence: int

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

    def context_for(self, db: Session, symbol: str, timeframe: str) -> dict[str, Any]:
        return self.context.get_context(db, symbol=symbol, timeframe=timeframe)

    def generate(self, db: Session, request: AgentHypothesisGenerateRequest) -> dict[str, Any]:
        workflow_id = new_workflow_id()
        context = self.context.get_context(db, symbol=request.symbol, timeframe=request.timeframe)
        if request.context:
            context = {**context, "operator_context": request.context}
        ai_context = self._json_safe(context)
        provider_name = (request.provider or self.provider_registry.default_provider()).strip().lower()
        provider_config = self.provider_registry.config_for(provider_name)
        provider_configured = bool(provider_config and provider_config.configured)
        model = request.model or (provider_config.default_model if provider_config else "")
        agent_run = AgentRun(
            id=prefixed_id("run"),
            workflow_id=workflow_id,
            symbol=context["symbol"],
            timeframe=context["timeframe"],
            current_task="Generate structured A/B/C trading hypotheses from live market context.",
            input_sources_json=["htx_rest:ticker", "htx_rest:kline", "htx_rest:orderbook", "htx_rest:trades", "news:rss"],
            output_mode="strict_json",
            confidence_calibration="0 means no usable evidence, 100 means high-quality confluence; paper trading remains mandatory.",
            context_json=self._context_for_storage(context),
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
        if request.mode == "rule_based" or settings.ai_mock_mode or not provider_configured:
            ai_output = self._rule_based_output(context)
            error_type = None if request.mode == "rule_based" else "not_configured"
            error_message = None if request.mode == "rule_based" else f"{provider_name} is not configured; generated rule-based fallback."
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
                        context=ai_context,
                    ),
                    workflow_id=workflow_id,
                )
                ai_result = {
                    **ai_result,
                    "provider": provider_name,
                    "model": model,
                    "analysis_mode": "ai",
                    "is_ai_generated": True,
                }
                ai_output = AgentOutput.model_validate(ai_result["raw_output"])
                agent_run.provider_healthy = True
            except ValidationError as exc:
                error_type = "schema_validation_failed"
                error_message = f"Agent hypotheses output failed schema validation: {exc}"
                if "ai_result" in locals() and ai_result.get("ai_analysis_id"):
                    self.ai_gateway.mark_analysis_failed(
                        db,
                        analysis_id=ai_result["ai_analysis_id"],
                        error_message=error_message,
                    )
                ai_output = self._rule_based_output(context)
                raw_output_preview = str(ai_result.get("raw_output", ""))[:500] if "ai_result" in locals() else ""
                ai_result = self._fallback_result(provider_name, model, error_type=error_type, error_message=error_message)
            except AIGatewayError as exc:
                error_type = exc.error_type
                error_message = self._human_provider_error(provider_name, exc.error_type, str(exc))
                raw_output_preview = exc.raw_output_preview[:500]
                ai_output = self._rule_based_output(context)
                ai_result = self._fallback_result(provider_name, model, error_type=error_type, error_message=error_message)

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
            "raw_output_preview": raw_output_preview,
            "agent_run": self.serialize_run(agent_run),
            "context": self.serialize_context(context),
            "summary": agent_run.summary,
            "validity": agent_run.validity,
            "overall_confidence": agent_run.overall_confidence,
            "hypotheses": [self.serialize_hypothesis(db, hypothesis) for hypothesis in hypotheses],
        }

    def get_hypothesis(self, db: Session, hypothesis_id: str) -> dict[str, Any] | None:
        hypothesis = db.get(Hypothesis, hypothesis_id)
        if hypothesis is None:
            return None
        return self.serialize_hypothesis(db, hypothesis)

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
            "backtest_rule": hypothesis.backtest_rule,
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
            "context_loaded": agent_run.context_loaded,
            "is_mock_context": agent_run.is_mock_context,
        }

    def serialize_hypothesis(self, db: Session, hypothesis: Hypothesis) -> dict[str, Any]:
        analysis = db.get(AIAnalysis, hypothesis.ai_analysis_id) if hypothesis.ai_analysis_id else None
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
            "bias": hypothesis.bias,
            "suggested_rule": hypothesis.suggested_rule_json,
            "symbol": hypothesis.symbol,
            "timeframe": hypothesis.timeframe,
            "label": hypothesis.label or "Hypothesis",
            "type": hypothesis.hypothesis_type or hypothesis.direction,
            "direction": hypothesis.direction,
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
            "source": hypothesis.source,
            "status": hypothesis.status,
            "is_mock": hypothesis.is_mock,
        }

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
    ) -> Hypothesis:
        direction = self._direction_from_type(output.type)
        risk_score = max(0, min(100, 100 - output.confidence + 35))
        hypothesis = Hypothesis(
            id=prefixed_id("hyp"),
            workflow_id=workflow_id,
            market_event_id=request.market_event_id or self._first_market_event_id(context),
            ai_analysis_id=ai_result["ai_analysis_id"],
            agent_run_id=agent_run.id,
            symbol=context["symbol"],
            timeframe=context["timeframe"],
            label=output.label,
            hypothesis_type=output.type,
            direction=direction,
            trigger=output.trigger,
            invalidation=output.invalidation,
            risk_note=output.risk,
            backtest_rule=output.backtest_rule,
            suggested_action=output.suggested_action,
            entry_condition=output.trigger,
            invalid_condition=output.invalidation,
            stop_loss=None,
            take_profit=None,
            confidence=output.confidence,
            feasibility=output.confidence,
            risk=risk_score,
            long_confidence=output.confidence if direction == "long" else None,
            short_confidence=output.confidence if direction == "short" else None,
            summary=output.suggested_action,
            reasons_json=[output.backtest_rule],
            warnings_json=[],
            raw_json=output.model_dump(),
            source=ai_result["source"],
            status="ready_for_rule",
            is_mock=ai_result["is_mock"],
            provider=ai_result.get("provider"),
            model=ai_result.get("model"),
            is_ai_generated=bool(ai_result.get("is_ai_generated")),
            analysis_mode=ai_result.get("analysis_mode", "ai"),
            bias=direction if direction in {"long", "short"} else ("neutral" if direction == "neutral" else "no_trade"),
            suggested_rule_json={"entry": output.trigger, "exit": output.invalidation, "risk": output.risk, "backtest_rule": output.backtest_rule},
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
            payload=output.model_dump(),
            source=ai_result["source"],
            status="completed",
            is_mock=ai_result["is_mock"],
        )
        return hypothesis

    @staticmethod
    def _direction_from_type(value: str) -> str:
        normalized = value.lower()
        if "long" in normalized or "buy" in normalized:
            return "long"
        if "short" in normalized or "sell" in normalized:
            return "short"
        if "no_trade" in normalized or "reject" in normalized:
            return "no_trade"
        return "neutral"

    @staticmethod
    def _first_market_event_id(context: dict[str, Any]) -> str | None:
        for event in context.get("recent_events") or []:
            event_id = str(event.get("id") or "")
            if event_id.startswith("evt_"):
                return event_id
        return None

    def _fallback_result(self, provider: str, model: str, *, error_type: str | None, error_message: str | None) -> dict[str, Any]:
        return {
            "ai_analysis_id": None,
            "provider": "none" if error_type else provider,
            "model": model,
            "source": "rule_based",
            "is_mock": False,
            "is_ai_generated": False,
            "analysis_mode": "rule_based",
            "error_type": error_type,
            "error_message": error_message,
        }

    def _rule_based_output(self, context: dict[str, Any]) -> AgentOutput:
        price = float(context.get("current_price") or 0)
        rsi = context.get("rsi")
        levels = context.get("key_levels") or {}
        orderbook = context.get("order_book_summary") or {}
        ma20 = levels.get("ma20")
        ma50 = levels.get("ma50")
        imbalance = orderbook.get("imbalance")
        trend = self._trend_label(context)
        bias = "neutral"
        confidence = 54
        if price and ma20 and price > float(ma20) and (rsi or 50) >= 50:
            bias = "long"
            confidence += 8
        if price and ma20 and price < float(ma20) and (rsi or 50) <= 50:
            bias = "short"
            confidence += 8
        if isinstance(imbalance, (int, float)):
            confidence += min(8, int(abs(float(imbalance)) * 20))
        if ma20 and ma50 and ((bias == "long" and float(ma20) > float(ma50)) or (bias == "short" and float(ma20) < float(ma50))):
            confidence += 6
        confidence = max(35, min(confidence, 78))
        action = "Wait for confirmation" if bias == "neutral" else f"Prepare paper-only {bias} rule after confirmation"
        hypothesis_type = {"long": "bullish_continuation", "short": "bearish_breakdown"}.get(bias, "neutral_watch")
        return AgentOutput(
            summary=f"Rule-based fallback, not AI provider output. {context['symbol']} trend={trend}, RSI={rsi if rsi is not None else 'n/a'}, spread={orderbook.get('spread') if orderbook else 'n/a'}.",
            validity="moderate" if bias != "neutral" else "low",
            overall_confidence=confidence,
            hypotheses=[
                AgentHypothesisOutput(
                    label="Hypothesis A",
                    type=hypothesis_type,
                    trigger=f"{context['symbol']} confirms {trend} with price holding near {price:.6g} and spread/liquidity remaining stable.",
                    invalidation="Invalidate if price breaks the nearest moving-average or order book imbalance flips against the setup.",
                    risk="Rule-based fallback uses market indicators only; reduce size and require backtest before any paper order.",
                    backtest_rule=f"Backtest {bias} entries using MA20/MA50 trend filter, RSI confirmation, spread cap, and fixed invalidation.",
                    suggested_action=action,
                    confidence=confidence,
                )
            ],
        )

    @staticmethod
    def _human_provider_error(provider: str, error_type: str, message: str) -> str:
        display = provider[:1].upper() + provider[1:]
        if error_type == "auth_failed":
            return "API Key is invalid or permission is insufficient."
        if error_type == "model_not_found":
            return "Model does not exist or has been deprecated. Please change the model."
        if error_type == "timeout":
            return "Provider request timed out."
        if error_type == "json_parse_failed":
            return "AI returned a format error and JSON could not be parsed."
        if error_type == "not_configured":
            return f"{display} is not configured. Configure the provider API key in backend/.env."
        return f"{display} is configured, but this Agent analysis failed: {message}"

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
    def _context_for_storage(context: dict[str, Any]) -> dict[str, Any]:
        compact = {
            key: value
            for key, value in context.items()
            if key not in {"klines", "trades"}
        }
        return AgentService._json_safe(compact)

    @staticmethod
    def _json_safe(value: Any) -> Any:
        return json.loads(json.dumps(value, default=str))
