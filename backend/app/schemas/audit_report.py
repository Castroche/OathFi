from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.schemas.common import SourceMeta


class AuditReportCreateRequest(BaseModel):
    hypothesis_id: str
    backtest_id: str | None = None
    risk_check_id: str | None = None
    paper_order_id: str | None = None


class AuditReportSummaryRead(BaseModel):
    id: str
    workflow_id: str
    symbol: str
    event_type: str
    status: str
    risk_level: str
    created_at: datetime
    audit_hash: str
    decision: str
    result: str
    outcome: str


class AuditEventRead(BaseModel):
    id: str
    audit_report_id: str
    workflow_id: str
    step_index: int
    step_key: str
    title: str
    status: str
    actor: str
    entity_type: str
    entity_id: str | None = None
    summary: str
    details: dict
    created_at: datetime


class AuditEvidenceRead(BaseModel):
    id: str
    audit_report_id: str
    workflow_id: str
    evidence_type: str
    entity_type: str
    entity_id: str | None = None
    title: str
    summary: str
    payload: dict
    created_at: datetime


class AuditReportRead(SourceMeta):
    id: str
    workflow_id: str
    title: str
    symbol: str
    event_type: str
    market_event_id: str | None = None
    hypothesis_id: str
    backtest_id: str | None = None
    risk_check_id: str | None = None
    paper_order_id: str | None = None
    summary: str
    decision: str
    risk_level: str
    result: str
    outcome: str
    audit_hash: str
    report_json: dict
    market_context: dict
    hypothesis: dict
    backtest_result: dict
    risk_result: dict
    paper_execution: dict
    final_decision: str
    lessons: list[str]
    events: list[AuditEventRead] = []
    evidence: list[AuditEvidenceRead] = []
    created_at: datetime


class AuditReportResponse(BaseModel):
    ok: Literal[True] = True
    data: AuditReportRead


class AuditReportListResponse(BaseModel):
    ok: Literal[True] = True
    data: list[AuditReportSummaryRead]


class AuditReportSummaryResponse(BaseModel):
    ok: Literal[True] = True
    data: dict


class AuditEvidenceListResponse(BaseModel):
    ok: Literal[True] = True
    data: list[AuditEvidenceRead]


class AuditExportResponse(BaseModel):
    ok: Literal[True] = True
    data: dict
