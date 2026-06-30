from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.audit_report import (
    AuditEvidenceListResponse,
    AuditExportResponse,
    AuditReportCreateRequest,
    AuditReportListResponse,
    AuditReportResponse,
    AuditReportSummaryResponse,
)
from app.services.audit_service import AuditService

router = APIRouter(prefix="/audit-reports", tags=["audit-reports"])
service = AuditService()


@router.post("", response_model=AuditReportResponse)
def create_audit_report(request: AuditReportCreateRequest, db: Session = Depends(get_db)) -> AuditReportResponse | JSONResponse:
    try:
        return AuditReportResponse(data=service.create_report(db, request))
    except HTTPException as exc:
        if isinstance(exc.detail, dict) and "ok" in exc.detail:
            return JSONResponse(status_code=exc.status_code, content=exc.detail)
        raise


@router.post("/from-paper-order/{paper_order_id}", response_model=AuditReportResponse)
def create_audit_report_from_paper_order(paper_order_id: str, db: Session = Depends(get_db)) -> AuditReportResponse | JSONResponse:
    try:
        return AuditReportResponse(data=service.create_report_from_paper_order(db, paper_order_id))
    except HTTPException as exc:
        if isinstance(exc.detail, dict) and "ok" in exc.detail:
            return JSONResponse(status_code=exc.status_code, content=exc.detail)
        raise


@router.get("", response_model=AuditReportListResponse)
def list_audit_reports(limit: int = Query(default=50, ge=1, le=100), db: Session = Depends(get_db)) -> AuditReportListResponse:
    return AuditReportListResponse(data=service.list_reports(db, limit=limit))


@router.get("/{report_id}", response_model=AuditReportResponse)
def get_audit_report(report_id: str, db: Session = Depends(get_db)) -> AuditReportResponse | JSONResponse:
    report = service.get_report(db, report_id)
    if report is None:
        return JSONResponse(
            status_code=404,
            content={"ok": False, "error": {"code": "AUDIT_REPORT_NOT_FOUND", "message": "Audit report not found.", "details": {"report_id": report_id}}},
        )
    return AuditReportResponse(data=report)


@router.get("/{report_id}/summary", response_model=AuditReportSummaryResponse)
def get_audit_report_summary(report_id: str, db: Session = Depends(get_db)) -> AuditReportSummaryResponse | JSONResponse:
    summary = service.get_summary(db, report_id)
    if summary is None:
        return JSONResponse(
            status_code=404,
            content={"ok": False, "error": {"code": "AUDIT_REPORT_NOT_FOUND", "message": "Audit report not found.", "details": {"report_id": report_id}}},
        )
    return AuditReportSummaryResponse(data=summary)


@router.get("/{report_id}/evidence", response_model=AuditEvidenceListResponse)
def list_audit_report_evidence(report_id: str, db: Session = Depends(get_db)) -> AuditEvidenceListResponse | JSONResponse:
    evidence = service.list_evidence(db, report_id)
    if evidence is None:
        return JSONResponse(
            status_code=404,
            content={"ok": False, "error": {"code": "AUDIT_REPORT_NOT_FOUND", "message": "Audit report not found.", "details": {"report_id": report_id}}},
        )
    return AuditEvidenceListResponse(data=evidence)


@router.get("/{report_id}/export-json", response_model=AuditExportResponse)
def export_audit_report_json(report_id: str, db: Session = Depends(get_db)) -> AuditExportResponse | JSONResponse:
    exported = service.export_json(db, report_id)
    if exported is None:
        return JSONResponse(
            status_code=404,
            content={"ok": False, "error": {"code": "AUDIT_REPORT_NOT_FOUND", "message": "Audit report not found.", "details": {"report_id": report_id}}},
        )
    return AuditExportResponse(data=exported)


@router.get("/{report_id}/export-md", response_model=AuditExportResponse)
def export_audit_report_markdown(report_id: str, db: Session = Depends(get_db)) -> AuditExportResponse | JSONResponse:
    exported = service.export_markdown(db, report_id)
    if exported is None:
        return JSONResponse(
            status_code=404,
            content={"ok": False, "error": {"code": "AUDIT_REPORT_NOT_FOUND", "message": "Audit report not found.", "details": {"report_id": report_id}}},
        )
    return AuditExportResponse(data=exported)
