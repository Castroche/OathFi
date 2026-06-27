from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, String
from sqlalchemy.orm import declarative_base

Base = declarative_base()


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def prefixed_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:12]}"


class TimestampMixin:
    created_at = Column(DateTime, default=now_utc, nullable=False)
    updated_at = Column(DateTime, default=now_utc, onupdate=now_utc, nullable=False)


class WorkflowMixin(TimestampMixin):
    id = Column(String, primary_key=True)
    workflow_id = Column(String, nullable=True, index=True)


class MockStatusMixin:
    source = Column(String, default="backend", nullable=False)
    status = Column(String, default="disconnected", nullable=False)
    is_mock = Column(Boolean, default=False, nullable=False)


from app.models.action_log import ActionLog  # noqa: E402,F401
from app.models.agent_run import AgentRun  # noqa: E402,F401
from app.models.ai_analysis import AIAnalysis  # noqa: E402,F401
from app.models.audit_report import AuditReport  # noqa: E402,F401
from app.models.backtest import BacktestJob, BacktestResult  # noqa: E402,F401
from app.models.hypothesis import Hypothesis  # noqa: E402,F401
from app.models.market_data import Kline, MarketSnapshot, OrderBookSnapshot, Symbol, TradeTick  # noqa: E402,F401
from app.models.market_event import MarketEvent  # noqa: E402,F401
from app.models.paper_order import PaperOrder  # noqa: E402,F401
from app.models.risk_check import RiskCheck  # noqa: E402,F401
from app.models.strategy_rule import StrategyRule  # noqa: E402,F401
from app.models.user_settings import UserSettings  # noqa: E402,F401
