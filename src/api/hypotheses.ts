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
  symbol: string;
  timeframe: string;
  direction: string;
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
