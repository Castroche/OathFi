import { apiJson, apiRequest } from "./client";

export type BacktestCreateRequest = {
  hypothesis_id: string;
  symbol: string;
  timeframe: string;
  start_time: string;
  end_time: string;
  initial_capital: number;
};

export type Backtest = {
  id: string;
  workflow_id: string;
  hypothesis_id: string;
  strategy_id?: string | null;
  symbol: string;
  timeframe: string;
  status: string;
  win_rate: number;
  profit_factor: number;
  expectancy: number;
  max_drawdown: number;
  sample_size: number;
  trade_count: number;
  avg_rr: number;
  sharpe: number;
  sample_quality: string;
  equity_curve: Record<string, unknown>[];
  drawdown_curve: Record<string, unknown>[];
  pnl_distribution: Record<string, unknown>[];
  trades: Record<string, unknown>[];
  methodology: string;
  data_source: string;
  sample_period: string;
  fees: number;
  slippage: number;
  initial_capital: number;
  final_equity: number;
  net_pnl: number;
  max_consecutive_losses: number;
  exposure_time: number;
  data_window: Record<string, unknown>;
  strategy_rule_snapshot: Record<string, unknown>;
  verdict: Record<string, unknown>;
  report: Record<string, unknown>;
  created_at: string;
  is_mock: boolean;
  source: string;
};

export function createBacktest(payload: BacktestCreateRequest) {
  return apiJson<Backtest>("/api/backtests", payload);
}

export function fetchBacktest(id: string, signal?: AbortSignal) {
  return apiRequest<Backtest>(`/api/backtests/${encodeURIComponent(id)}`, { signal });
}
