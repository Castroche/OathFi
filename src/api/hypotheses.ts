import { apiJson } from "./client";

export type HypothesisGenerateRequest = {
  symbol: string;
  timeframe: string;
  market_event_id?: string | null;
  provider?: string;
  context?: Record<string, unknown>;
};

export type Hypothesis = {
  id: string;
  hypothesis_id?: string;
  workflow_id: string;
  market_event_id?: string | null;
  ai_analysis_id?: string | null;
  provider: string;
  model: string;
  title: string;
  symbol: string;
  side: string;
  timeframe: string;
  direction: string;
  thesis: string;
  entry_condition: string;
  invalid_condition: string;
  stop_loss?: number | null;
  take_profit?: number | null;
  confidence: number;
  feasibility: number;
  risk: number;
  long_confidence?: number | null;
  short_confidence?: number | null;
  summary: string;
  reasons: string[];
  warnings: string[];
  latest_backtest_result_id?: string | null;
  latest_risk_check_id?: string | null;
  latest_paper_order_id?: string | null;
  created_at: string;
  is_mock: boolean;
  source: string;
  status: string;
};

export function generateHypothesis(payload: HypothesisGenerateRequest) {
  return apiJson<Hypothesis>("/api/hypotheses/generate", {
    ...payload,
  });
}
