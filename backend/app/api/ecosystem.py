from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.ecosystem import (
    AiComputeStatusResponse,
    EcosystemRoadmapResponse,
    HtxEcosystemStatusResponse,
    UtilityModelResponse,
)
from app.services.ecosystem_service import EcosystemService

router = APIRouter(prefix="/ecosystem", tags=["ecosystem"])
service = EcosystemService()


@router.get("/htx-status", response_model=HtxEcosystemStatusResponse)
def get_htx_status() -> HtxEcosystemStatusResponse:
    return HtxEcosystemStatusResponse(data=service.get_htx_status())


@router.get("/ai-compute-status", response_model=AiComputeStatusResponse)
def get_ai_compute_status(db: Session = Depends(get_db)) -> AiComputeStatusResponse:
    return AiComputeStatusResponse(data=service.get_ai_compute_status(db))


@router.get("/utility-model", response_model=UtilityModelResponse)
def get_utility_model() -> UtilityModelResponse:
    return UtilityModelResponse(data=service.get_utility_model())


@router.get("/roadmap", response_model=EcosystemRoadmapResponse)
def get_roadmap() -> EcosystemRoadmapResponse:
    return EcosystemRoadmapResponse(data=service.get_roadmap())
