from typing import Literal

from pydantic import BaseModel


class HealthData(BaseModel):
    status: Literal["ok"] = "ok"
    service: Literal["oathfi-backend"] = "oathfi-backend"
    version: str


class HealthResponse(BaseModel):
    ok: Literal[True] = True
    data: HealthData
