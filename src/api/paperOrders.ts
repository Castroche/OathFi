import { apiJson, apiRequest } from "./client";
import type { RiskCheck } from "./risk";

export type PaperOrderCreateRequest = {
  hypothesis_id: string;
  backtest_id?: string | null;
  risk_check_id: string;
  symbol: string;
  side: "buy" | "sell" | string;
  order_type: "limit" | "market" | string;
  price: number;
  quantity: number;
  stop_loss?: number | null;
  take_profit?: number | null;
};

export type PaperOrder = {
  id: string;
  workflow_id: string;
  hypothesis_id: string;
  backtest_id?: string | null;
  risk_check_id: string;
  status: string;
  symbol: string;
  side: string;
  order_type: string;
  price: number;
  quantity: number;
  stop_loss?: number | null;
  take_profit?: number | null;
  is_real_trade: boolean;
  execution_mode: string;
  risk_check?: Partial<RiskCheck> | null;
  created_at: string;
  is_mock: boolean;
  source: string;
};

export function createPaperOrder(payload: PaperOrderCreateRequest) {
  return apiJson<PaperOrder>("/api/paper-orders", payload);
}

export function fetchPaperOrder(id: string, signal?: AbortSignal) {
  return apiRequest<PaperOrder>(`/api/paper-orders/${encodeURIComponent(id)}`, { signal });
}
