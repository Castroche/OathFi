from typing import Literal

from pydantic import BaseModel


class SettingsRead(BaseModel):
    id: str
    default_symbol: str
    default_timeframe: str
    demo_mode: bool
    default_ai_provider: str
    paper_trading_enabled: bool
    real_trading_enabled: bool
    language: str
    settings_json: dict = {}


class SettingsUpdate(BaseModel):
    default_symbol: str = "ETH/USDT"
    default_timeframe: str = "1m"
    demo_mode: bool = False
    default_ai_provider: str = "deepseek"
    paper_trading_enabled: bool = True
    real_trading_enabled: bool = False
    language: str = "zh-CN"
    settings_json: dict = {}


class SettingsResponse(BaseModel):
    ok: Literal[True] = True
    data: SettingsRead
