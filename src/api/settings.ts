import { apiJson, apiRequest } from "./client";
import { fetchMarketSourceStatus } from "./market";

export type HealthStatus = {
  status: "ok";
  service: "oathfi-backend";
  version: string;
};

export type Settings = {
  id: string;
  default_symbol: string;
  default_timeframe: string;
  demo_mode: boolean;
  default_ai_provider: string;
  paper_trading_enabled: boolean;
  real_trading_enabled: boolean;
  language: string;
  settings_json: RuntimeSettingsJson;
};

export type SettingsUpdate = {
  default_symbol: string;
  default_timeframe: string;
  demo_mode: boolean;
  default_ai_provider: string;
  paper_trading_enabled: boolean;
  real_trading_enabled: boolean;
  language: string;
  settings_json: RuntimeSettingsJson;
};

export type AIProviderKey = "deepseek" | "openai" | "anthropic" | "gemini" | "openai_compatible";

export type AIProviderRuntimeConfig = {
  api_key: string;
  api_base: string;
  model: string;
};

export type RuntimeSettingsJson = {
  ai_providers?: Partial<Record<AIProviderKey, AIProviderRuntimeConfig>>;
  [key: string]: unknown;
};

export type DataSourceProbeStatus = "connected" | "stale" | "disconnected";

export type DataSourceProbe = {
  status: DataSourceProbeStatus;
  health: HealthStatus;
  tickerStatus: string;
  orderBookStatus: string;
  source: string;
  isMock: boolean;
};

export function fetchHealth(signal?: AbortSignal) {
  return apiRequest<HealthStatus>("/api/health", { signal });
}

export function fetchSettings(signal?: AbortSignal) {
  return apiRequest<Settings>("/api/settings", { signal });
}

export function saveSettings(payload: SettingsUpdate) {
  return apiJson<Settings>("/api/settings", payload, { method: "PUT" });
}

export async function testDataSource(symbol: string, signal?: AbortSignal): Promise<DataSourceProbe> {
  const [health, sourceStatus] = await Promise.all([
    fetchHealth(signal),
    fetchMarketSourceStatus(signal),
  ]);
  const providers = Array.isArray((sourceStatus as { providers?: unknown }).providers)
    ? ((sourceStatus as { providers: Array<{ source?: string; status?: string; is_mock?: boolean }> }).providers)
    : [];
  const htxWs = providers.find((provider) => provider.source === "htx_ws");
  const providerStatus = htxWs?.status ?? "disconnected";
  const isMock = Boolean(htxWs?.is_mock);
  const status: DataSourceProbeStatus = health.status === "ok" && providerStatus === "live" && !isMock ? "connected" : "disconnected";

  return {
    status,
    health,
    tickerStatus: providerStatus,
    orderBookStatus: providerStatus,
    source: htxWs?.source ?? "htx_ws",
    isMock,
  };
}
