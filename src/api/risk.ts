import { apiJson, apiRequest } from "./client";

export type RiskCheckRequest = {
  hypothesis_id: string;
  backtest_id?: string | null;
  account_equity?: number | null;
  risk_per_trade?: number | null;
  position_size?: number | null;
  entry_price?: number | null;
  stop_loss?: number | null;
  take_profit?: number | null;
};

export type RiskItem = {
  name: string;
  status: string;
  message: string;
  threshold?: string | null;
  actual?: string | null;
};

export type RiskCheck = {
  id: string;
  workflow_id: string;
  hypothesis_id: string;
  backtest_id?: string | null;
  decision: "APPROVED" | "CONDITIONAL" | "REJECTED" | "PASS" | "WARNING" | "BLOCK" | string;
  status: "APPROVED" | "CONDITIONAL" | "REJECTED" | string;
  risk_level: string;
  risk_score: number;
  account_equity: number;
  risk_per_trade: number;
  position_size: number;
  entry_price: number;
  stop_loss: number;
  take_profit?: number | null;
  max_loss: number;
  reward_risk: number;
  leverage: number;
  execution_mode: string;
  live_trading_enabled: boolean;
  checks: RiskItem[];
  rule_results: RiskItem[];
  blocks: string[];
  warnings: string[];
  block_reasons: string[];
  market_data_status: "live" | "unavailable" | string;
  created_at: string;
  is_mock: boolean;
  source: string;
};

export function runRiskCheck(payload: RiskCheckRequest) {
  return apiJson<RiskCheck>("/api/risk/checks", payload);
}

export function fetchRiskCheck(id: string, signal?: AbortSignal) {
  return apiRequest<RiskCheck>(`/api/risk/checks/${encodeURIComponent(id)}`, { signal });
}

export function fetchRiskRules(signal?: AbortSignal) {
  return apiRequest<Array<{ name: string; label: string; threshold: string; source: string }>>("/api/risk/rules", { signal });
}
