import { FileClock, ListChecks } from "lucide-react";
import { useTranslation } from "react-i18next";
import { StatusPill } from "../common/StatusPill";
import type { AuditReport } from "../../api/auditReports";

type AuditReportsContentProps = {
  auditReport?: AuditReport;
  onGenerateAuditReport: () => void;
  isGeneratingAuditReport: boolean;
  canGenerateAuditReport: boolean;
  disabledReason?: string;
};

export function AuditReportsContent({
  auditReport,
  onGenerateAuditReport,
  isGeneratingAuditReport,
  canGenerateAuditReport,
  disabledReason,
}: AuditReportsContentProps) {
  const { t } = useTranslation();

  return (
    <section className="audit-reports" aria-label={t("auditReports.aria")}>
      <div className="audit-brief">
        <div>
          <span className="audit-brief__eyebrow">{t("auditReports.sections.workflowTrace")}</span>
          <h2>{auditReport?.title ?? "Disconnected"}</h2>
          <p>{auditReport?.summary ?? "No real audit report is connected."}</p>
        </div>
        <button className="primary-action" type="button" disabled={!canGenerateAuditReport || isGeneratingAuditReport} onClick={onGenerateAuditReport}>
          <FileClock size={14} aria-hidden="true" />
          <span>{isGeneratingAuditReport ? "Generating..." : "Generate audit report"}</span>
        </button>
      </div>

      {!auditReport ? (
        <section className="audit-panel" aria-labelledby="audit-empty-title">
          <div className="audit-panel__heading">
            <span id="audit-empty-title">Connection</span>
            <StatusPill variant="warning">disconnected</StatusPill>
          </div>
          <p>{disabledReason ?? "Generate a real backend hypothesis before creating an audit report."}</p>
        </section>
      ) : (
        <div className="audit-grid">
          <section className="audit-panel" aria-labelledby="audit-summary-title">
            <div className="audit-panel__heading">
              <span id="audit-summary-title">
                <ListChecks size={15} aria-hidden="true" />
                Report
              </span>
              <StatusPill variant={auditReport.is_mock ? "danger" : "success"}>{auditReport.is_mock ? "mock" : auditReport.source}</StatusPill>
            </div>
            <dl className="audit-decision-risk">
              <div>
                <dt>id</dt>
                <dd>{auditReport.id}</dd>
              </div>
              <div>
                <dt>symbol</dt>
                <dd>{auditReport.symbol}</dd>
              </div>
              <div>
                <dt>decision</dt>
                <dd>{auditReport.final_decision}</dd>
              </div>
              <div>
                <dt>status</dt>
                <dd>{auditReport.status}</dd>
              </div>
            </dl>
          </section>

          <section className="audit-panel audit-panel--log" aria-labelledby="audit-lessons-title">
            <div className="audit-panel__heading">
              <span id="audit-lessons-title">
                <FileClock size={15} aria-hidden="true" />
                Lessons
              </span>
              <StatusPill variant={auditReport.lessons.length > 0 ? "info" : "warning"}>{auditReport.lessons.length}</StatusPill>
            </div>
            <div className="audit-log-table">
              {auditReport.lessons.map((lesson) => (
                <article className="audit-log-row" key={lesson}>
                  <time>{new Date(auditReport.created_at).toLocaleTimeString()}</time>
                  <strong>backend</strong>
                  <span>{lesson}</span>
                  <code>{auditReport.id}</code>
                  <StatusPill variant="info">{auditReport.status}</StatusPill>
                </article>
              ))}
              {auditReport.lessons.length === 0 ? <div className="market-snapshot-empty">No real lessons connected.</div> : null}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
