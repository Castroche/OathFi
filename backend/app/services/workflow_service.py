from sqlalchemy.orm import Session

from app.db.base import now_utc, prefixed_id
from app.models.action_log import ActionLog


def new_workflow_id() -> str:
    return prefixed_id("wf")


def log_action(
    db: Session,
    *,
    action_type: str,
    entity_type: str,
    entity_id: str | None,
    message: str,
    workflow_id: str | None = None,
    payload: dict | None = None,
    source: str = "backend",
    status: str = "completed",
    is_mock: bool = False,
) -> None:
    db.add(
        ActionLog(
            id=prefixed_id("log"),
            workflow_id=workflow_id,
            action_type=action_type,
            entity_type=entity_type,
            entity_id=entity_id,
            message=message,
            payload_json=payload,
            source=source,
            status=status,
            is_mock=is_mock,
            created_at=now_utc(),
        )
    )
