from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.audit_report import AuditReportCreateRequest, AuditReportListResponse, AuditReportResponse
from app.services.audit_service import AuditService

router = APIRouter(prefix="/audit-reports", tags=["audit-reports"])
service = AuditService()


@router.post("", response_model=AuditReportResponse)
def create_audit_report(request: AuditReportCreateRequest, db: Session = Depends(get_db)) -> AuditReportResponse:
    return AuditReportResponse(data=service.create_report(db, request))


@router.get("", response_model=AuditReportListResponse)
def list_audit_reports(limit: int = Query(default=50, ge=1, le=100), db: Session = Depends(get_db)) -> AuditReportListResponse:
    return AuditReportListResponse(data=service.list_reports(db, limit=limit))


@router.get("/{report_id}", response_model=AuditReportResponse)
def get_audit_report(report_id: str, db: Session = Depends(get_db)) -> AuditReportResponse:
    report = service.get_report(db, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Audit report not found")
    return AuditReportResponse(data=report)
