from __future__ import annotations

import json
from typing import Any

from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.base import now_utc, prefixed_id
from app.models.user_api_credential import UserApiCredential
from app.schemas.credentials import CredentialStatus, CredentialUpdate
from app.services.ai_provider_registry import get_settings_ai_provider, normalize_provider_id, provider_ids
from app.services.workflow_service import log_action


_DEV_FERNET_KEY: bytes | None = None
_DEV_KEY_WARNED = False


def _encryption_key() -> bytes:
    global _DEV_FERNET_KEY, _DEV_KEY_WARNED
    configured = settings.settings_encryption_key.strip()
    if configured:
        return configured.encode("utf-8")
    if settings.app_environment.lower() == "production":
        raise RuntimeError("SETTINGS_ENCRYPTION_KEY is required in production.")
    if _DEV_FERNET_KEY is None:
        _DEV_FERNET_KEY = Fernet.generate_key()
    if not _DEV_KEY_WARNED:
        print("OathFi development warning: SETTINGS_ENCRYPTION_KEY is not set; using a temporary in-memory key.")
        _DEV_KEY_WARNED = True
    return _DEV_FERNET_KEY


def _fernet() -> Fernet:
    return Fernet(_encryption_key())


def _encrypt(value: str | None) -> str | None:
    if value is None:
        return None
    return _fernet().encrypt(value.encode("utf-8")).decode("utf-8")


def _decrypt(value: str | None) -> str:
    if not value:
        return ""
    try:
        return _fernet().decrypt(value.encode("utf-8")).decode("utf-8")
    except InvalidToken:
        return ""


def _mask(value: str) -> str | None:
    if not value:
        return None
    if len(value) <= 8:
        return f"{value[:2]}****"
    return f"{value[:3]}****{value[-4:]}"


class CredentialService:
    def get(self, db: Session, provider: str) -> UserApiCredential | None:
        provider_id = normalize_provider_id(provider)
        return db.scalar(select(UserApiCredential).where(UserApiCredential.provider == provider_id).limit(1))

    def status(self, db: Session, provider: str) -> CredentialStatus:
        provider_id = normalize_provider_id(provider)
        row = self.get(db, provider_id)
        if row is None:
            definition = get_settings_ai_provider(provider_id)
            return CredentialStatus(
                provider=provider_id,
                configured=False,
                masked_key=None,
                base_url=definition.base_url,
                model=definition.default_model,
                is_active=False,
                updated_at=None,
            )
        api_key = _decrypt(row.encrypted_api_key)
        return CredentialStatus(
            provider=row.provider,
            configured=bool(api_key and row.is_active),
            masked_key=_mask(api_key),
            base_url=row.base_url,
            model=row.model,
            is_active=row.is_active,
            updated_at=row.updated_at,
        )

    def statuses(self, db: Session) -> list[CredentialStatus]:
        return [self.status(db, provider) for provider in provider_ids()]

    def update(self, db: Session, provider: str, request: CredentialUpdate) -> CredentialStatus:
        provider_id = normalize_provider_id(provider)
        row = self.get(db, provider_id)
        if row is None:
            definition = get_settings_ai_provider(provider_id)
            row = UserApiCredential(
                id=prefixed_id("cred"),
                provider=provider_id,
                base_url=definition.base_url,
                model=definition.default_model,
                is_active=True,
                metadata_json={},
                created_at=now_utc(),
                updated_at=now_utc(),
            )
            db.add(row)

        if request.api_key is not None and request.api_key.strip():
            row.encrypted_api_key = _encrypt(request.api_key.strip())
        if request.secret is not None and request.secret.strip():
            row.encrypted_secret = _encrypt(request.secret.strip())
        if request.extra_json is not None:
            row.encrypted_extra_json = _encrypt(json.dumps(request.extra_json, ensure_ascii=False))
        if request.base_url is not None:
            row.base_url = request.base_url.strip() or row.base_url
        if request.model is not None:
            row.model = request.model.strip() or row.model
        row.is_active = request.is_active
        row.updated_at = now_utc()
        log_action(
            db,
            action_type="UPDATE_API_CREDENTIAL",
            entity_type="user_api_credential",
            entity_id=row.id,
            message="Saved encrypted API credential status.",
            payload={"provider": provider_id, "configured": bool(row.encrypted_api_key), "secret_returned": False},
        )
        db.commit()
        db.refresh(row)
        return self.status(db, provider_id)

    def delete(self, db: Session, provider: str) -> CredentialStatus:
        provider_id = normalize_provider_id(provider)
        row = self.get(db, provider_id)
        if row is not None:
            db.delete(row)
            log_action(
                db,
                action_type="DELETE_API_CREDENTIAL",
                entity_type="user_api_credential",
                entity_id=row.id,
                message="Deleted encrypted API credential.",
                payload={"provider": provider_id},
            )
            db.commit()
        return self.status(db, provider_id)

    def decrypted_config(self, db: Session, provider: str) -> dict[str, Any] | None:
        row = self.get(db, provider)
        if row is None or not row.is_active:
            return None
        api_key = _decrypt(row.encrypted_api_key)
        if not api_key:
            return None
        extra: dict[str, Any] = {}
        raw_extra = _decrypt(row.encrypted_extra_json)
        if raw_extra:
            try:
                parsed = json.loads(raw_extra)
                if isinstance(parsed, dict):
                    extra = parsed
            except json.JSONDecodeError:
                extra = {}
        return {
            "provider": row.provider,
            "api_key": api_key,
            "secret": _decrypt(row.encrypted_secret),
            "base_url": row.base_url or "",
            "model": row.model or "",
            "extra": extra,
        }
