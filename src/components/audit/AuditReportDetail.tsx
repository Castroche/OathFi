import { ClipboardCheck, FileClock } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AuditReport } from "../../api/auditReports";
import { decisionLabel, eventTypeLabel, riskLevelLabel, sourceLabel, statusLabel } from "../../lib/displayLabels";
import { StatusPill } from "../common/StatusPill";
import { AuditStepCard } from "./AuditStepCard";

type AuditReportDetailProps = {
  report?: AuditReport;
  isLoading: boolean;
  error?: string;
};

export function AuditReportDetail({ report, isLoading, error }: AuditReportDetailProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <section className="audit-panel audit-panel--detail">
        <div className="market-snapshot-empty">{t("auditReports.empty.loading")}</div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="audit-panel audit-panel--detail">
        <div className="market-snapshot-empty">{error}</div>
      </section>
    );
  }

  if (!report) {
    return (
      <section className="audit-panel audit-panel--detail">
        <div className="market-snapshot-empty">{t("auditReports.empty.selectReport")}</div>
      </section>
    );
  }

  const detailRows = [
    ["reportId", report.id],
    ["status", statusLabel(t, report.status)],
    ["time", new Date(report.created_at).toLocaleString()],
    ["asset", report.symbol],
    ["eventType", eventTypeLabel(t, report.event_type)],
    ["decision", decisionLabel(t, report.decision)],
    ["riskLevel", riskLevelLabel(t, report.risk_level)],
    ["result", statusLabel(t, report.result)],
    ["outcome", t("auditReports.summary.outcome", { decision: decisionLabel(t, report.decision), risk: riskLevelLabel(t, report.risk_level) })],
  ] as const;

  return (
    <section className="audit-panel audit-panel--detail" aria-labelledby="audit-report-detail-title">
      <div className="audit-detail-header">
        <div>
          <span id="audit-report-detail-title">{t("auditReports.sections.reportDetail")}</span>
          <h2>{t("auditReports.sections.reviewAudit")}</h2>
          <p>{t("auditReports.summary.workflow", { symbol: report.symbol, decision: decisionLabel(t, report.decision), risk: riskLevelLabel(t, report.risk_level) })}</p>
        </div>
        <div className="audit-detail-header__meta">
          <StatusPill variant={report.is_mock ? "danger" : "success"}>{report.is_mock ? t("auditReports.status.mock") : sourceLabel(t, report.source)}</StatusPill>
          <strong>{report.symbol}</strong>
          <code>{report.workflow_id}</code>
        </div>
      </div>

      <dl className="audit-decision-risk audit-decision-risk--detail">
        {detailRows.map(([labelKey, value]) => (
          <div key={labelKey}>
            <dt>{t(`auditReports.labels.${labelKey}`)}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      <div className="audit-panel__heading audit-panel__heading--inline">
        <span>
          <ClipboardCheck size={15} aria-hidden="true" />
          {t("auditReports.sections.workflowTrace")}
        </span>
        <StatusPill variant="neutral">{report.events.length}</StatusPill>
      </div>

      <div className="audit-section-grid">
        {report.events.map((event) => (
          <AuditStepCard event={event} key={event.id} />
        ))}
        {report.events.length === 0 ? (
          <article className="audit-stage">
            <span className="audit-stage__index">
              <FileClock size={14} aria-hidden="true" />
            </span>
            <div>
              <h3>{t("auditReports.empty.noTimeline")}</h3>
              <p>{t("auditReports.empty.noEvidence")}</p>
            </div>
          </article>
        ) : null}
      </div>
    </section>
  );
}
