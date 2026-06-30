import { FileSearch } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AuditReportSummary } from "../../api/auditReports";
import { eventTypeLabel, riskLevelLabel, statusLabel } from "../../lib/displayLabels";
import { StatusPill } from "../common/StatusPill";

type AuditReportListProps = {
  reports: AuditReportSummary[];
  selectedReportId?: string;
  isLoading: boolean;
  error?: string;
  onSelectReport: (reportId: string) => void;
};

export function AuditReportList({ reports, selectedReportId, isLoading, error, onSelectReport }: AuditReportListProps) {
  const { t } = useTranslation();

  return (
    <section className="audit-panel audit-panel--list" aria-labelledby="audit-report-list-title">
      <div className="audit-panel__heading">
        <span id="audit-report-list-title">
          <FileSearch size={15} aria-hidden="true" />
          {t("auditReports.sections.reportList")}
        </span>
        <StatusPill variant="info">{reports.length}</StatusPill>
      </div>

      {isLoading ? <div className="market-snapshot-empty">{t("common.loading")}</div> : null}
      {error ? <div className="market-snapshot-empty">{error}</div> : null}
      {!isLoading && !error && reports.length === 0 ? <div className="market-snapshot-empty">{t("auditReports.empty.noReports")}</div> : null}

      <div className="audit-report-list">
        {reports.map((report) => (
          <button
            className={`audit-report-card ${report.id === selectedReportId ? "is-selected" : ""}`}
            type="button"
            key={report.id}
            onClick={() => onSelectReport(report.id)}
            aria-pressed={report.id === selectedReportId}
          >
            <span>{new Date(report.created_at).toLocaleString()}</span>
            <strong>{report.symbol}</strong>
            <p>{eventTypeLabel(t, report.event_type)}</p>
            <div>
              <StatusPill variant={report.status === "completed" ? "success" : "warning"}>{statusLabel(t, report.status)}</StatusPill>
              <StatusPill variant={report.risk_level === "high" ? "danger" : report.risk_level === "medium" ? "warning" : "info"}>{riskLevelLabel(t, report.risk_level)}</StatusPill>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
