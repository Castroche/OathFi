import { apiJson, apiRequest } from "./client";

export type AuditReportCreateRequest = {
  hypothesis_id: string;
  backtest_id?: string | null;
  risk_check_id?: string | null;
  paper_order_id?: string | null;
};

export type AuditReportSummary = {
  id: string;
  workflow_id: string;
  symbol: string;
  event_type: string;
  status: string;
  risk_level: string;
  created_at: string;
  audit_hash: string;
  decision: string;
  result: string;
  outcome: string;
};

export type AuditEvent = {
  id: string;
  audit_report_id: string;
  workflow_id: string;
  step_index: number;
  step_key: string;
  title: string;
  status: string;
  actor: string;
  entity_type: string;
  entity_id?: string | null;
  summary: string;
  details: Record<string, unknown>;
  created_at: string;
};

export type AuditEvidence = {
  id: string;
  audit_report_id: string;
  workflow_id: string;
  evidence_type: string;
  entity_type: string;
  entity_id?: string | null;
  title: string;
  summary: string;
  payload: Record<string, unknown>;
  created_at: string;
};

export type AuditReport = {
  id: string;
  workflow_id: string;
  title: string;
  symbol: string;
  event_type: string;
  market_event_id?: string | null;
  hypothesis_id: string;
  backtest_id?: string | null;
  risk_check_id?: string | null;
  paper_order_id?: string | null;
  summary: string;
  decision: string;
  risk_level: string;
  result: string;
  outcome: string;
  audit_hash: string;
  report_json: Record<string, unknown>;
  market_context: Record<string, unknown>;
  hypothesis: Record<string, unknown>;
  backtest_result: Record<string, unknown>;
  risk_result: Record<string, unknown>;
  paper_execution: Record<string, unknown>;
  final_decision: string;
  lessons: string[];
  events: AuditEvent[];
  evidence: AuditEvidence[];
  created_at: string;
  is_mock: boolean;
  source: string;
  status: string;
};

export type AuditReportCopySummary = {
  id: string;
  workflow_id: string;
  symbol: string;
  status: string;
  time: string;
  asset: string;
  event_type: string;
  decision: string;
  risk_level: string;
  result: string;
  outcome: string;
  audit_hash: string;
  summary: string;
  copy_text: string;
};

export type AuditExportPayload = {
  filename: string;
  content_type: string;
  content: unknown;
};

export function createAuditReport(payload: AuditReportCreateRequest) {
  return apiJson<AuditReport>("/api/audit-reports", payload);
}

export function createAuditReportFromPaperOrder(paperOrderId: string) {
  return apiJson<AuditReport>(`/api/audit-reports/from-paper-order/${encodeURIComponent(paperOrderId)}`, {});
}

export function fetchAuditReports(signal?: AbortSignal) {
  return apiRequest<AuditReportSummary[]>("/api/audit-reports", { signal });
}

export function fetchAuditReport(id: string, signal?: AbortSignal) {
  return apiRequest<AuditReport>(`/api/audit-reports/${encodeURIComponent(id)}`, { signal });
}

export function fetchAuditReportSummary(id: string, signal?: AbortSignal) {
  return apiRequest<AuditReportCopySummary>(`/api/audit-reports/${encodeURIComponent(id)}/summary`, { signal });
}

export function fetchAuditEvidence(id: string, signal?: AbortSignal) {
  return apiRequest<AuditEvidence[]>(`/api/audit-reports/${encodeURIComponent(id)}/evidence`, { signal });
}

export function exportAuditJson(id: string, signal?: AbortSignal) {
  return apiRequest<AuditExportPayload>(`/api/audit-reports/${encodeURIComponent(id)}/export-json`, { signal });
}

export function exportAuditMarkdown(id: string, signal?: AbortSignal) {
  return apiRequest<AuditExportPayload>(`/api/audit-reports/${encodeURIComponent(id)}/export-md`, { signal });
}
