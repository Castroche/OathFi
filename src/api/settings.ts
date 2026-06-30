import { apiJson, apiRequest } from "./client";
import type { AIProviderId } from "../config/aiProviders";

export type DataSource = "HTX";
export type ConnectionType = "REST" | "WebSocket" | "Hybrid";
export type FallbackMethod = "None" | "REST fallback" | "Cached fallback";
export type ModelProvider = AIProviderId;
export type OutputMode = "Summary" | "Structured" | "Research";
export type ConfidenceCalibration = "Conservative" | "Balanced" | "Aggressive";
export type PositionSizeMode = "Fixed" | "Risk Based" | "Volatility Adjusted";
export type SettingsLanguage = "en" | "zh-CN";
export type DemoScenario = "pass" | "reject";

export type RuntimeSettingsJson = {
  data_source?: Record<string, unknown>;
  agent?: Record<string, unknown>;
  risk?: Record<string, unknown>;
  execution?: Record<string, unknown>;
  demo?: Record<string, unknown>;
  ai_providers?: Record<string, { model?: string; api_base?: string; configured?: boolean }>;
  [key: string]: unknown;
};

export type Settings = {
  id: string;
  updated_at: string;
  default_symbol: string;
  default_timeframe: string;
  primary_data_source: DataSource;
  connection_type: ConnectionType;
  fallback_method: FallbackMethod;
  latency_monitor_enabled: boolean;
  latency_warning_ms: number;
  latency_critical_ms: number;
  auto_reconnect_enabled: boolean;
  model_provider: ModelProvider;
  model_name: string;
  output_mode: OutputMode;
  confidence_calibration: ConfidenceCalibration;
  structured_hypothesis_enabled: boolean;
  default_confidence_bands: Record<string, number>;
  max_risk_per_trade: number;
  max_daily_loss: number;
  max_consecutive_losses: number;
  position_size_mode: PositionSizeMode;
  stop_loss_enforcement: boolean;
  paper_trading_enabled: boolean;
  live_trading_enabled: boolean;
  real_trading_enabled: boolean;
  demo_mode_enabled: boolean;
  demo_mode: boolean;
  use_sample_account: boolean;
  paper_execution_only: boolean;
  guided_demo_flow: boolean;
  demo_scenario: DemoScenario;
  language: SettingsLanguage;
  default_ai_provider: string;
  settings_json: RuntimeSettingsJson;
};

export type SettingsUpdate = Omit<Settings, "id" | "updated_at">;

export type SettingsMarketSourceTest = {
  status: "connected" | "degraded" | "disconnected";
  provider: string;
  latency_ms: number | null;
  checked_at: string;
  error_message?: string | null;
};

export type SettingsAIProviderTest = {
  status:
    | "Configured"
    | "Not Configured"
    | "Connection OK"
    | "Connection Failed"
    | "Missing API Key"
    | "Unsupported Model"
    | "Planned"
    | "Error";
  provider: string;
  display_name: string;
  model: string;
  latency_ms: number | null;
  checked_at: string;
  error_type?: string | null;
  error_message?: string | null;
};

export type CredentialStatus = {
  provider: string;
  configured: boolean;
  masked_key?: string | null;
  base_url?: string | null;
  model?: string | null;
  is_active: boolean;
  updated_at?: string | null;
};

export type CredentialStatusList = {
  credentials: CredentialStatus[];
};

export type CredentialUpdate = {
  api_key?: string | null;
  secret?: string | null;
  extra_json?: Record<string, string | number | boolean | null> | null;
  base_url?: string | null;
  model?: string | null;
  is_active?: boolean;
};

export function fetchSettings(signal?: AbortSignal) {
  return apiRequest<Settings>("/api/settings", { signal });
}

export function saveSettings(payload: SettingsUpdate) {
  return apiJson<Settings>("/api/settings", payload, { method: "PUT" });
}

export function resetSettings() {
  return apiJson<Settings>("/api/settings/reset", {});
}

export function testMarketSource() {
  return apiJson<SettingsMarketSourceTest>("/api/settings/test-market-source", {});
}

export function testAIProvider() {
  return apiJson<SettingsAIProviderTest>("/api/settings/test-ai-provider", {});
}

export function fetchCredentialStatus(signal?: AbortSignal) {
  return apiRequest<CredentialStatusList>("/api/settings/credentials/status", { signal });
}

export function saveCredential(provider: string, payload: CredentialUpdate) {
  return apiJson<CredentialStatus>(`/api/settings/credentials/${encodeURIComponent(provider)}`, payload, { method: "PUT" });
}

export function deleteCredential(provider: string) {
  return apiJson<CredentialStatus>(`/api/settings/credentials/${encodeURIComponent(provider)}`, {}, { method: "DELETE" });
}

export function settingsToUpdate(settings: Settings): SettingsUpdate {
  const payload = { ...settings } as Partial<Settings>;
  delete payload.id;
  delete payload.updated_at;
  return payload as SettingsUpdate;
}
