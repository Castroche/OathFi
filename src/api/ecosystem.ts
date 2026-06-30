import { apiRequest } from "./client";

export type EcosystemStatus =
  | "connected"
  | "read_only"
  | "disabled"
  | "planned"
  | "roadmap"
  | "disconnected"
  | "degraded";

export type EcosystemCheck = {
  id: string;
  status: EcosystemStatus;
  source: string;
  updated_at: string;
  latency_ms?: number | null;
  detail?: string | null;
  error?: string | null;
};

export type HtxEcosystemStatus = {
  api_environment: "production";
  live_trading_status: "disabled";
  account_read_only_status: "planned";
  checks: EcosystemCheck[];
  last_sync: string;
  source: string;
  is_mock: boolean;
};

export type AiComputeCapability = {
  id: string;
  status: EcosystemStatus;
  provider?: string | null;
  model?: string | null;
  detail?: string | null;
};

export type AiComputeStatus = {
  current_provider: string;
  current_model?: string | null;
  current_provider_status: EcosystemStatus;
  credential_status: "configured" | "not_configured";
  connection_status: EcosystemStatus;
  last_tested_at?: string | null;
  planned_provider: "B.AI";
  planned_provider_status: "planned";
  capabilities: AiComputeCapability[];
  updated_at: string;
  is_mock: boolean;
};

export type UtilityTier = {
  id: string;
  status: EcosystemStatus;
  features: Record<string, EcosystemStatus>;
};

export type UtilityModel = {
  tiers: UtilityTier[];
  updated_at: string;
  source: string;
  is_mock: boolean;
};

export type RoadmapItem = {
  id: string;
  status: EcosystemStatus;
  target?: string | null;
  detail?: string | null;
};

export type EcosystemRoadmap = {
  items: RoadmapItem[];
  updated_at: string;
  source: string;
  is_mock: boolean;
};

export function fetchHtxEcosystemStatus(signal?: AbortSignal) {
  return apiRequest<HtxEcosystemStatus>("/api/ecosystem/htx-status", { signal });
}

export function fetchAiComputeStatus(signal?: AbortSignal) {
  return apiRequest<AiComputeStatus>("/api/ecosystem/ai-compute-status", { signal });
}

export function fetchUtilityModel(signal?: AbortSignal) {
  return apiRequest<UtilityModel>("/api/ecosystem/utility-model", { signal });
}

export function fetchEcosystemRoadmap(signal?: AbortSignal) {
  return apiRequest<EcosystemRoadmap>("/api/ecosystem/roadmap", { signal });
}
