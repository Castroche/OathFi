from datetime import datetime
from typing import Literal

from pydantic import BaseModel


EcosystemStatus = Literal["connected", "read_only", "disabled", "planned", "roadmap", "disconnected", "degraded"]


class EcosystemCheck(BaseModel):
    id: str
    status: EcosystemStatus
    source: str
    updated_at: datetime
    latency_ms: int | None = None
    detail: str | None = None
    error: str | None = None


class HtxEcosystemStatus(BaseModel):
    api_environment: Literal["production"]
    live_trading_status: Literal["disabled"]
    account_read_only_status: Literal["planned"]
    checks: list[EcosystemCheck]
    last_sync: datetime
    source: str = "htx_rest"
    is_mock: bool = False


class HtxEcosystemStatusResponse(BaseModel):
    ok: Literal[True] = True
    data: HtxEcosystemStatus


class AiComputeCapability(BaseModel):
    id: str
    status: EcosystemStatus
    provider: str | None = None
    model: str | None = None
    detail: str | None = None


class AiComputeStatus(BaseModel):
    current_provider: str
    current_model: str | None = None
    current_provider_status: EcosystemStatus
    credential_status: Literal["configured", "not_configured"]
    connection_status: EcosystemStatus
    last_tested_at: datetime | None = None
    planned_provider: Literal["B.AI"] = "B.AI"
    planned_provider_status: Literal["planned"] = "planned"
    capabilities: list[AiComputeCapability]
    updated_at: datetime
    is_mock: bool = False


class AiComputeStatusResponse(BaseModel):
    ok: Literal[True] = True
    data: AiComputeStatus


class UtilityTier(BaseModel):
    id: str
    status: EcosystemStatus
    features: dict[str, EcosystemStatus]


class UtilityModel(BaseModel):
    tiers: list[UtilityTier]
    updated_at: datetime
    source: str = "roadmap"
    is_mock: bool = False


class UtilityModelResponse(BaseModel):
    ok: Literal[True] = True
    data: UtilityModel


class RoadmapItem(BaseModel):
    id: str
    status: EcosystemStatus
    target: str | None = None
    detail: str | None = None


class EcosystemRoadmap(BaseModel):
    items: list[RoadmapItem]
    updated_at: datetime
    source: str = "roadmap"
    is_mock: bool = False


class EcosystemRoadmapResponse(BaseModel):
    ok: Literal[True] = True
    data: EcosystemRoadmap
