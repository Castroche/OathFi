from datetime import datetime
from typing import Literal

from pydantic import BaseModel


NewsCategory = Literal["crypto", "onchain", "macro", "funding", "htx", "risk"]
NewsSentiment = Literal["positive", "neutral", "negative", "mixed"]
NewsSourceStatus = Literal["live", "planned", "backend-required", "unavailable", "error"]


class NewsEventRead(BaseModel):
    id: str
    title: str
    summary: str
    source: str
    url: str | None = None
    language: str
    published_at: datetime
    is_mock: bool
    category: NewsCategory = "crypto"
    sentiment: NewsSentiment = "neutral"
    severity: float = 0.42
    reliability: float = 0.75
    tags: list[str] = []
    related_symbols: list[str] = []
    source_status: NewsSourceStatus = "live"
    source_domain: str | None = None
    url_verified: bool = False


class NewsEventsResponse(BaseModel):
    ok: Literal[True] = True
    data: list[NewsEventRead]


class NewsLatestResponse(BaseModel):
    ok: Literal[True] = True
    data: list[NewsEventRead]
