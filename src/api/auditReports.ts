import { apiJson, apiRequest } from "./client";

export type AuditReportCreateRequest = {
  hypothesis_id: string;
  backtest_id?: string | null;
  risk_check_id?: string | null;
  paper_order_id?: string | null;
};

export type AuditReport = {
  id: string;
  workflow_id: string;
  title: string;
  symbol: string;
  summary: string;
  market_context: Record<string, unknown>;
  hypothesis: Record<string, unknown>;
  backtest_result: Record<string, unknown>;
  risk_result: Record<string, unknown>;
  paper_execution: Record<string, unknown>;
  final_decision: string;
  lessons: string[];
  created_at: string;
  is_mock: boolean;
  source: string;
  status: string;
};

export function createAuditReport(payload: AuditReportCreateRequest) {
  return apiJson<AuditReport>("/api/audit-reports", payload);
}

export function fetchAuditReport(id: string, signal?: AbortSignal) {
  return apiRequest<AuditReport>(`/api/audit-reports/${encodeURIComponent(id)}`, { signal });
}
