from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.dashboard import (
    DashboardMarketEventsResponse,
    DashboardOpportunityResponse,
    DashboardRecentDecisionsResponse,
    DashboardSummaryResponse,
)
from app.schemas.market import MarketEventRead
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])
service = DashboardService()


@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(db: Session = Depends(get_db)) -> DashboardSummaryResponse:
    return DashboardSummaryResponse(data=service.get_summary(db))


@router.get("/opportunity", response_model=DashboardOpportunityResponse)
def get_dashboard_opportunity(db: Session = Depends(get_db)) -> DashboardOpportunityResponse:
    return DashboardOpportunityResponse(data=service.get_opportunity(db))


@router.get("/recent-decisions", response_model=DashboardRecentDecisionsResponse)
def get_recent_decisions(
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
) -> DashboardRecentDecisionsResponse:
    return DashboardRecentDecisionsResponse(data=service.list_recent_decisions(db, limit=limit))


@router.get("/market-events", response_model=DashboardMarketEventsResponse)
def get_dashboard_market_events(
    limit: int = Query(default=5, ge=1, le=20),
    db: Session = Depends(get_db),
) -> DashboardMarketEventsResponse:
    return DashboardMarketEventsResponse(
        data=[
            MarketEventRead.model_validate(event, from_attributes=True)
            for event in service.list_market_events(db, limit=limit)
        ]
    )
