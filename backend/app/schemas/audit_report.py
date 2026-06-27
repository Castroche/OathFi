from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.schemas.common import SourceMeta


class AuditReportCreateRequest(BaseModel):
    hypothesis_id: str
    backtest_id: str | None = None
    risk_check_id: str | None = None
    paper_order_id: str | None = None


class AuditReportRead(SourceMeta):
    id: str
    workflow_id: str
    title: str
    symbol: str
    summary: str
    market_context: dict
    hypothesis: dict
    backtest_result: dict
    risk_result: dict
    paper_execution: dict
    final_decision: str
    lessons: list[str]
    created_at: datetime


class AuditReportResponse(BaseModel):
    ok: Literal[True] = True
    data: AuditReportRead


class AuditReportListResponse(BaseModel):
    ok: Literal[True] = True
    data: list[AuditReportRead]
