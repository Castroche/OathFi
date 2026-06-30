from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


DataSource = Literal["HTX"]
ConnectionType = Literal["REST", "WebSocket", "Hybrid"]
FallbackMethod = Literal["None", "REST fallback", "Cached fallback"]
OutputMode = Literal["Summary", "Structured", "Research"]
ConfidenceCalibration = Literal["Conservative", "Balanced", "Aggressive"]
PositionSizeMode = Literal["Fixed", "Risk Based", "Volatility Adjusted"]
Language = Literal["en", "zh-CN"]
DemoScenario = Literal["pass", "reject"]
AIProviderTestStatus = Literal[
    "Configured",
    "Not Configured",
    "Connection OK",
    "Connection Failed",
    "Missing API Key",
    "Unsupported Model",
    "Planned",
    "Error",
]


class SettingsBase(BaseModel):
    default_symbol: str = "ETH/USDT"
    default_timeframe: str = "15m"
    primary_data_source: DataSource = "HTX"
    connection_type: ConnectionType = "Hybrid"
    fallback_method: FallbackMethod = "REST fallback"
    latency_monitor_enabled: bool = True
    latency_warning_ms: int = Field(default=800, ge=1)
    latency_critical_ms: int = Field(default=2000, ge=1)
    auto_reconnect_enabled: bool = True
    model_provider: str = "deepseek"
    model_name: str = "deepseek-v4-flash"
    output_mode: OutputMode = "Structured"
    confidence_calibration: ConfidenceCalibration = "Balanced"
    structured_hypothesis_enabled: bool = True
    default_confidence_bands: dict[str, int] = Field(
        default_factory=lambda: {"low": 35, "medium": 65, "high": 85}
    )
    max_risk_per_trade: float = Field(default=0.01, ge=0, le=1)
    max_daily_loss: float = Field(default=0.03, ge=0, le=1)
    max_consecutive_losses: int = Field(default=3, ge=1)
    position_size_mode: PositionSizeMode = "Risk Based"
    stop_loss_enforcement: bool = True
    paper_trading_enabled: bool = True
    live_trading_enabled: bool = False
    real_trading_enabled: bool = False
    demo_mode_enabled: bool = True
    demo_mode: bool = True
    use_sample_account: bool = True
    paper_execution_only: bool = True
    guided_demo_flow: bool = True
    demo_scenario: DemoScenario = "pass"
    language: Language = "en"
    default_ai_provider: str = "deepseek"
    settings_json: dict[str, Any] = Field(default_factory=dict)

    @field_validator("latency_critical_ms")
    @classmethod
    def critical_above_warning(cls, value: int, info) -> int:
        warning = info.data.get("latency_warning_ms", 800)
        return max(value, warning)


class SettingsRead(SettingsBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    updated_at: datetime


class SettingsUpdate(SettingsBase):
    pass


class SettingsTestMarketSourceResult(BaseModel):
    status: Literal["connected", "degraded", "disconnected"]
    provider: str
    latency_ms: int | None = None
    checked_at: datetime
    error_message: str | None = None


class SettingsTestAIProviderResult(BaseModel):
    status: AIProviderTestStatus
    provider: str
    display_name: str
    model: str
    latency_ms: int | None = None
    checked_at: datetime
    error_type: str | None = None
    error_message: str | None = None


class SettingsResponse(BaseModel):
    ok: Literal[True] = True
    data: SettingsRead


class SettingsTestMarketSourceResponse(BaseModel):
    ok: Literal[True] = True
    data: SettingsTestMarketSourceResult


class SettingsTestAIProviderResponse(BaseModel):
    ok: Literal[True] = True
    data: SettingsTestAIProviderResult
