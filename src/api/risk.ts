import { apiJson, apiRequest } from "./client";

export type RiskCheckRequest = {
  hypothesis_id: string;
  backtest_id?: string | null;
  account_equity: number;
  risk_per_trade: number;
  position_size: number;
  entry_price: number;
  stop_loss: number;
  take_profit?: number | null;
};

export type RiskItem = {
  name: string;
  status: string;
  message: string;
};

export type RiskCheck = {
  id: string;
  workflow_id: string;
  hypothesis_id: string;
  backtest_id?: string | null;
  decision: "PASS" | "WARNING" | "BLOCK" | string;
  checks: RiskItem[];
  warnings: string[];
  block_reasons: string[];
  created_at: string;
  is_mock: boolean;
  source: string;
  status: string;
};

export function runRiskCheck(payload: RiskCheckRequest) {
  return apiJson<RiskCheck>("/api/risk/check", payload);
}

export function fetchRiskCheck(id: string, signal?: AbortSignal) {
  return apiRequest<RiskCheck>(`/api/risk/checks/${encodeURIComponent(id)}`, { signal });
}
