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
  fallback_reason?: string | null;
  provider_status?: string | null;
  latency_ms?: number | null;
  context_loaded: boolean;
  is_mock_context: boolean;
};

export type AgentStructuredHypothesis = {
  label?: string | null;
  provider?: string | null;
  model?: string | null;
  provider_status?: string | null;
  latency_ms?: number | null;
  direction: "long" | "short" | "neutral" | "no_trade" | string;
  setup_type: "breakout" | "pullback" | "range" | "momentum" | "mean_reversion" | "no_trade" | string;
  confidence: number;
  market_regime: string;
  thesis_summary: string;
  evidence: {
    kline_evidence: string;
    indicator_evidence: string;
    orderbook_evidence: string;
    volume_evidence: string;
    risk_evidence: string;
  };
  entry_plan: {
    entry_type: string;
    trigger_price?: number | null;
    confirmation_condition: string;
    invalidation_price?: number | null;
    stop_loss?: number | null;
    take_profit_1?: number | null;
    take_profit_2?: number | null;
    expected_rr?: number | string | null;
  };
  risk_notes: string;
  why_not_opposite_direction: string;
  invalidation_conditions: string;
  backtest_rule: {
    entry_rule: string;
    exit_rule: string;
    stop_rule: string;
    take_profit_rule: string;
    position_sizing_rule: string;
  };
  executable_strategy?: {
    side: "long" | "short" | "no_trade" | string;
    entry: {
      type: "market" | "limit" | "breakout" | "breakdown" | "pullback" | string;
      operator?: ">=" | "<=" | "crosses_above" | "crosses_below" | string | null;
      price?: number | null;
      confirmations?: Array<{ field: string; operator: string; value: number | string }>;
    };
    exit: {
      stop_loss?: number | null;
      take_profit_1?: number | null;
      take_profit_2?: number | null;
      time_stop_bars?: number | null;
    };
    risk: {
      risk_per_trade: number;
      max_position_notional_pct: number;
    };
    expected_rr?: number | null;
    invalid_reason?: string | null;
  };
  audit_summary: string;
  limitations: string;
};

export type AgentTranslations = Record<string, string>;

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
  provider_status?: string | null;
  fallback_reason?: string | null;
  provider_raw_output?: Record<string, unknown> | null;
  structured_hypothesis?: AgentStructuredHypothesis | null;
  translations?: AgentTranslations;
  latency_ms?: number | null;
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

export type AgentHypothesisTranslations = {
  hypothesis_id: string;
  target_language: "en" | "zh-CN";
  translations: AgentTranslations;
};

export type AgentGenerateRequest = {
  symbol: string;
  timeframe: string;
  market_event_id?: string | null;
  provider?: string;
  model?: string;
  mode?: "ai" | "rule_based";
  language?: "en" | "zh-CN";
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
  fallback_reason?: string | null;
  provider_status?: string | null;
  provider_raw_output?: Record<string, unknown> | null;
  structured_hypothesis?: AgentStructuredHypothesis | null;
  latency_ms?: number | null;
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

export function fetchAgentHypotheses(params?: { limit?: number; workflowId?: string }, signal?: AbortSignal) {
  const search = new URLSearchParams();
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.workflowId) search.set("workflow_id", params.workflowId);
  const query = search.toString();
  return apiRequest<AgentHypothesis[]>(`/api/agent/hypotheses${query ? `?${query}` : ""}`, { signal });
}

export function fetchAgentHypothesisTranslations(id: string, targetLanguage: "en" | "zh-CN", signal?: AbortSignal) {
  return apiRequest<AgentHypothesisTranslations>(
    `/api/agent/hypotheses/${encodeURIComponent(id)}/translations?target_language=${encodeURIComponent(targetLanguage)}`,
    { method: "POST", signal },
  );
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
