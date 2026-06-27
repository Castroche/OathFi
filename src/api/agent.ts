import { apiJson, apiRequest } from "./client";

export type AgentContext = {
  symbol: string;
  timeframe: string;
  asset: string;
  current_price?: number | null;
  key_levels: Record<string, unknown>;
  volume: Record<string, unknown>;
  rsi?: number | null;
  macd: Record<string, unknown>;
  order_book_summary: Record<string, unknown>;
  btc_correlation: Record<string, unknown>;
  funding_rate: Record<string, unknown>;
  recent_events: Record<string, unknown>[];
  ticker?: Record<string, unknown> | null;
  indicators?: Record<string, unknown> | null;
  updated_at: string;
  source: string;
  status: string;
  is_mock: boolean;
  price?: number | null;
  last?: number | null;
  change_24h?: number | null;
  volume_24h?: number | null;
  high_24h?: number | null;
  low_24h?: number | null;
  spread?: number | null;
  imbalance?: number | null;
  orderbook_summary?: Record<string, unknown>;
  trend?: string | null;
  ma?: Record<string, unknown>;
  volatility?: number | null;
};

export type AgentRun = {
  id: string;
  workflow_id: string;
  ai_analysis_id?: string | null;
  symbol: string;
  timeframe: string;
  current_task: string;
  input_sources: string[];
  output_mode: string;
  confidence_calibration: string;
  summary?: string | null;
  validity?: string | null;
  overall_confidence?: number | null;
  created_at: string;
  source: string;
  status: string;
  is_mock: boolean;
  provider?: string | null;
  model?: string | null;
  provider_configured: boolean;
  provider_healthy: boolean;
  analysis_mode: string;
  raw_output_preview?: string | null;
  error_type?: string | null;
  error_message?: string | null;
  context_loaded: boolean;
  is_mock_context: boolean;
};

export type AgentHypothesis = {
  id: string;
  hypothesis_id: string;
  workflow_id: string;
  market_event_id?: string | null;
  ai_analysis_id?: string | null;
  agent_run_id?: string | null;
  provider: string;
  model: string;
  is_ai_generated: boolean;
  analysis_mode: string;
  bias?: string | null;
  suggested_rule?: Record<string, unknown> | null;
  symbol: string;
  timeframe: string;
  title: string;
  label: string;
  side: string;
  type: string;
  direction: string;
  thesis: string;
  trigger: string;
  invalidation: string;
  risk: string;
  backtest_rule: string;
  suggested_action: string;
  confidence: number;
  feasibility: number;
  risk_score: number;
  entry_condition: string;
  invalid_condition: string;
  stop_loss?: number | null;
  take_profit?: number | null;
  summary: string;
  reasons: string[];
  warnings: string[];
  status: string;
  latest_backtest_result_id?: string | null;
  latest_risk_check_id?: string | null;
  latest_paper_order_id?: string | null;
  created_at: string;
  source: string;
  is_mock: boolean;
};

export type AgentGenerateRequest = {
  symbol: string;
  timeframe: string;
  market_event_id?: string | null;
  provider?: string;
  model?: string;
  mode?: "ai" | "rule_based";
  context?: Record<string, unknown>;
};

export type AgentGenerateResult = {
  provider_configured: boolean;
  provider_healthy: boolean;
  provider: string;
  model: string;
  context_loaded: boolean;
  run_created: boolean;
  hypotheses_count: number;
  run_id?: string | null;
  analysis_mode: string;
  is_ai_generated: boolean;
  error_type?: string | null;
  error_message?: string | null;
  raw_output_preview?: string | null;
  agent_run: AgentRun;
  context: AgentContext;
  summary: string;
  validity: string;
  overall_confidence: number;
  hypotheses: AgentHypothesis[];
};

export type AgentHypothesisPatch = {
  trigger?: string;
  invalidation?: string;
  risk?: string;
  backtest_rule?: string;
  suggested_action?: string;
  confidence?: number;
  status?: string;
};

export type StrategyRulePayload = {
  strategy_name?: string;
  entry_conditions?: string[];
  exit_conditions?: string[];
  risk_controls?: string[];
  preview?: Record<string, unknown>;
  status?: string;
};

export type StrategyRule = {
  id: string;
  hypothesis_id: string;
  workflow_id: string;
  symbol: string;
  timeframe: string;
  strategy_name: string;
  entry_conditions: string[];
  exit_conditions: string[];
  risk_controls: string[];
  preview: Record<string, unknown>;
  status: string;
  created_at: string;
  updated_at: string;
  source: string;
  is_mock: boolean;
};

export function fetchAgentContext(symbol: string, timeframe: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ symbol, timeframe });
  return apiRequest<AgentContext>(`/api/agent/context?${params.toString()}`, { signal });
}

export function generateAgentHypotheses(payload: AgentGenerateRequest) {
  return apiJson<AgentGenerateResult>("/api/agent/hypotheses/generate", payload);
}

export function fetchAgentHypothesis(id: string, signal?: AbortSignal) {
  return apiRequest<AgentHypothesis>(`/api/agent/hypotheses/${encodeURIComponent(id)}`, { signal });
}

export function patchAgentHypothesis(id: string, payload: AgentHypothesisPatch) {
  return apiJson<AgentHypothesis>(`/api/agent/hypotheses/${encodeURIComponent(id)}`, payload, { method: "PATCH" });
}

export function rejectAgentHypothesis(id: string) {
  return apiJson<AgentHypothesis>(`/api/agent/hypotheses/${encodeURIComponent(id)}/reject`, {});
}

export function createStrategyRule(id: string, payload: StrategyRulePayload) {
  return apiJson<StrategyRule>(`/api/agent/hypotheses/${encodeURIComponent(id)}/strategy-rule`, payload);
}
