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
  position_size?: number | null;
  risk_amount?: number | null;
  mode: string;
  risk_status?: string | null;
  is_real_trade: boolean;
  execution_mode: string;
  risk_check?: Partial<RiskCheck> | null;
  hypothesis?: {
    id: string;
    strategy?: string | null;
    direction?: string | null;
    time_horizon?: string | null;
    market?: string | null;
    model_confidence?: number | null;
    setup_quality?: number | null;
    summary?: string | null;
  } | null;
  backtest_result?: {
    id: string;
    status: string;
    verdict?: string | null;
    expectancy?: number | null;
    profit_factor?: number | null;
    max_drawdown?: number | null;
    trade_count?: number | null;
    sample_quality?: string | null;
  } | null;
  created_at: string;
  updated_at: string;
  submitted_at?: string | null;
  filled_at?: string | null;
  cancelled_at?: string | null;
  is_mock: boolean;
  source: string;
};

export type PaperAccount = {
  id: string;
  equity: number;
  available_balance: number;
  used_margin: number;
  unrealized_pnl: number;
  realized_pnl: number;
  daily_loss: number;
  max_daily_loss: number;
  risk_utilization: number;
};

export type PaperPosition = {
  id: string;
  symbol: string;
  side: string;
  quantity: number;
  entry_price: number;
  mark_price: number;
  unrealized_pnl: number;
  stop_loss?: number | null;
  take_profit?: number | null;
  risk_check_id: string;
  hypothesis_id: string;
  status: string;
};

export type PaperExecutionLog = {
  id: string;
  paper_order_id?: string | null;
  hypothesis_id?: string | null;
  risk_check_id?: string | null;
  event_type: string;
  status: string;
  message: string;
  metadata_json: Record<string, unknown>;
  created_at: string;
};

export function createPaperOrder(payload: PaperOrderCreateRequest) {
  return apiJson<PaperOrder>("/api/paper-orders", payload);
}

export function fetchPaperOrder(id: string, signal?: AbortSignal) {
  return apiRequest<PaperOrder>(`/api/paper-orders/${encodeURIComponent(id)}`, { signal });
}

export function executePaperOrder(id: string) {
  return apiJson<PaperOrder>(`/api/paper-orders/${encodeURIComponent(id)}/execute`, {});
}

export function cancelPaperOrder(id: string) {
  return apiJson<PaperOrder>(`/api/paper-orders/${encodeURIComponent(id)}/cancel`, {});
}

export function fetchPaperAccount(signal?: AbortSignal) {
  return apiRequest<PaperAccount>("/api/paper-account", { signal });
}

export function fetchPaperPositions(signal?: AbortSignal) {
  return apiRequest<PaperPosition[]>("/api/paper-positions", { signal });
}

export function fetchPaperExecutionLogs(params?: { paperOrderId?: string; hypothesisId?: string }, signal?: AbortSignal) {
  const search = new URLSearchParams();
  if (params?.paperOrderId) search.set("paper_order_id", params.paperOrderId);
  if (params?.hypothesisId) search.set("hypothesis_id", params.hypothesisId);
  const query = search.toString();
  return apiRequest<PaperExecutionLog[]>(`/api/paper-execution-logs${query ? `?${query}` : ""}`, { signal });
}
