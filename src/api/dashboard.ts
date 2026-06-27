import { apiRequest } from "./client";
import type { MarketEvent } from "./market";

export type DashboardMarketPulse = {
  symbols: string[];
  status: string;
  latency_ms?: number | null;
  source: string;
  active_events: number;
};

export type DashboardAgentStatus = {
  running: boolean;
  current_task?: string | null;
  model_provider?: string | null;
  last_analysis_at?: string | null;
  status: string;
};

export type DashboardRiskSummary = {
  global_risk_level: string;
  volatility_score: number;
  liquidity_score: number;
  execution_mode: "paper" | "live_disabled";
  live_trading_enabled: boolean;
  latest_decision?: string | null;
  last_checked_at?: string | null;
};

export type DashboardSummary = {
  market_pulse: DashboardMarketPulse;
  agent_status: DashboardAgentStatus;
  risk_summary: DashboardRiskSummary;
};

export type DashboardOpportunity = {
  symbol: string;
  setup: string;
  setup_quality: number;
  time_horizon: string;
  confidence: string;
  direction: string;
  risk_reward?: number | null;
  hypothesis_id?: string | null;
  market_event_id?: string | null;
  source: string;
  status: string;
  is_mock: boolean;
  created_at?: string | null;
};

export type DashboardDecision = {
  id: string;
  workflow_id?: string | null;
  action_type: string;
  entity_type: string;
  entity_id?: string | null;
  message: string;
  source: string;
  status: string;
  is_mock: boolean;
  created_at: string;
};

export function fetchDashboardSummary(signal?: AbortSignal) {
  return apiRequest<DashboardSummary>("/api/dashboard/summary", { signal });
}

export function fetchDashboardOpportunity(signal?: AbortSignal) {
  return apiRequest<DashboardOpportunity | null>("/api/dashboard/opportunity", { signal });
}

export function fetchDashboardRecentDecisions(limit = 10, signal?: AbortSignal) {
  return apiRequest<DashboardDecision[]>(
    `/api/dashboard/recent-decisions?limit=${limit}`,
    { signal },
  );
}

export function fetchDashboardMarketEvents(limit = 5, signal?: AbortSignal) {
  return apiRequest<MarketEvent[]>(`/api/dashboard/market-events?limit=${limit}`, { signal });
}
