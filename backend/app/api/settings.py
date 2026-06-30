from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.settings import (
    SettingsResponse,
    SettingsTestAIProviderResponse,
    SettingsTestMarketSourceResponse,
    SettingsUpdate,
)
from app.schemas.credentials import (
    CredentialStatusListResponse,
    CredentialStatusResponse,
    CredentialStatusList,
    CredentialUpdate,
)
from app.services.credential_service import CredentialService
from app.services.settings_service import SettingsService

router = APIRouter(prefix="/settings", tags=["settings"])
service = SettingsService()
credential_service = CredentialService()


@router.get("", response_model=SettingsResponse)
def get_settings(db: Session = Depends(get_db)) -> SettingsResponse:
    stored = service.get_settings(db)
    return SettingsResponse(data=service.to_read(stored))


@router.put("", response_model=SettingsResponse)
def put_settings(request: SettingsUpdate, db: Session = Depends(get_db)) -> SettingsResponse:
    stored = service.update_settings(db, request)
    return SettingsResponse(data=service.to_read(stored))


@router.post("/reset", response_model=SettingsResponse)
def reset_settings(db: Session = Depends(get_db)) -> SettingsResponse:
    stored = service.reset_settings(db)
    return SettingsResponse(data=service.to_read(stored))


@router.post("/test-market-source", response_model=SettingsTestMarketSourceResponse)
def test_market_source(db: Session = Depends(get_db)) -> SettingsTestMarketSourceResponse:
    return SettingsTestMarketSourceResponse(data=service.test_market_source(db))


@router.post("/test-ai-provider", response_model=SettingsTestAIProviderResponse)
def test_ai_provider(db: Session = Depends(get_db)) -> SettingsTestAIProviderResponse:
    return SettingsTestAIProviderResponse(data=service.test_ai_provider(db))


@router.get("/credentials/status", response_model=CredentialStatusListResponse)
def get_credential_status(db: Session = Depends(get_db)) -> CredentialStatusListResponse:
    return CredentialStatusListResponse(data=CredentialStatusList(credentials=credential_service.statuses(db)))


@router.get("/credentials/{provider}", response_model=CredentialStatusResponse)
def get_provider_credential_status(provider: str, db: Session = Depends(get_db)) -> CredentialStatusResponse:
    return CredentialStatusResponse(data=credential_service.status(db, provider))


@router.put("/credentials/{provider}", response_model=CredentialStatusResponse)
def put_provider_credential(provider: str, request: CredentialUpdate, db: Session = Depends(get_db)) -> CredentialStatusResponse:
    return CredentialStatusResponse(data=credential_service.update(db, provider, request))


@router.delete("/credentials/{provider}", response_model=CredentialStatusResponse)
def delete_provider_credential(provider: str, db: Session = Depends(get_db)) -> CredentialStatusResponse:
    return CredentialStatusResponse(data=credential_service.delete(db, provider))
