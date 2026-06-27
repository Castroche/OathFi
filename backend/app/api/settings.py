from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.settings import SettingsRead, SettingsResponse, SettingsUpdate
from app.services.settings_service import SettingsService

router = APIRouter(prefix="/settings", tags=["settings"])
service = SettingsService()


@router.get("", response_model=SettingsResponse)
def get_settings(db: Session = Depends(get_db)) -> SettingsResponse:
    stored = service.get_settings(db)
    return SettingsResponse(data=SettingsRead.model_validate(stored, from_attributes=True))


@router.put("", response_model=SettingsResponse)
def put_settings(request: SettingsUpdate, db: Session = Depends(get_db)) -> SettingsResponse:
    stored = service.update_settings(db, request)
    return SettingsResponse(data=SettingsRead.model_validate(stored, from_attributes=True))
