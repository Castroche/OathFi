from fastapi import APIRouter

from app.core.config import settings
from app.schemas.health import HealthData, HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    return HealthResponse(data=HealthData(version=settings.app_version))
