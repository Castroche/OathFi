import { FileClock, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  exportAuditJson,
  exportAuditMarkdown,
  fetchAuditEvidence,
  fetchAuditReport,
  fetchAuditReportSummary,
  type AuditEvent,
  type AuditEvidence,
  type AuditReport,
  type AuditReportSummary,
} from "../../api/auditReports";
import { actorLabel, auditStepSummary, auditStepTitle, decisionLabel, riskLevelLabel, statusLabel } from "../../lib/displayLabels";
import { StatusPill } from "../common/StatusPill";
import { AuditHashBar } from "./AuditHashBar";
import { AuditReportDetail } from "./AuditReportDetail";
import { AuditReportList } from "./AuditReportList";
import { AuditTimeline } from "./AuditTimeline";
import { EvidenceLogList } from "./EvidenceLogList";

type AuditReportsContentProps = {
  reports: AuditReportSummary[];
  auditReport?: AuditReport;
  selectedReportId?: string;
  onSelectReport: (reportId: string) => void;
  onGenerateAuditReport: () => void;
  isGeneratingAuditReport: boolean;
  canGenerateAuditReport: boolean;
  isLoadingReports: boolean;
  isLoadingAuditReport: boolean;
  reportsError?: string;
  auditReportError?: string;
  disabledReason?: string;
};

type AuditDialog = "log" | "evidence" | null;

export function AuditReportsContent({
  reports,
  auditReport,
  selectedReportId,
  onSelectReport,
  onGenerateAuditReport,
  isGeneratingAuditReport,
  canGenerateAuditReport,
  isLoadingReports,
  isLoadingAuditReport,
  reportsError,
  auditReportError,
  disabledReason,
}: AuditReportsContentProps) {
  const { t } = useTranslation();
  const [dialog, setDialog] = useState<AuditDialog>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<AuditEvidence | null>(null);
  const [evidenceSnapshot, setEvidenceSnapshot] = useState<AuditEvidence[]>([]);
  const [auditLogSnapshot, setAuditLogSnapshot] = useState<AuditEvent[]>([]);
  const [isActionBusy, setIsActionBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    setDialog(null);
    setSelectedEvidence(null);
    setEvidenceSnapshot([]);
    setAuditLogSnapshot([]);
    setActionMessage(null);
  }, [auditReport?.id]);

  const evidenceForDialog = useMemo(() => {
    if (selectedEvidence) {
      return [selectedEvidence];
    }
    return evidenceSnapshot;
  }, [evidenceSnapshot, selectedEvidence]);

  async function copySummary() {
    if (!auditReport) {
      return;
    }
    setIsActionBusy(true);
    try {
      const summary = await fetchAuditReportSummary(auditReport.id);
      await navigator.clipboard.writeText(summary.copy_text);
      setActionMessage(t("auditReports.messages.summaryCopied"));
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : t("auditReports.messages.actionFailed"));
    } finally {
      setIsActionBusy(false);
    }
  }

  async function exportReport(kind: "json" | "markdown") {
    if (!auditReport) {
      return;
    }
    setIsActionBusy(true);
    try {
      const payload = kind === "json" ? await exportAuditJson(auditReport.id) : await exportAuditMarkdown(auditReport.id);
      const content = typeof payload.content === "string" ? payload.content : JSON.stringify(payload.content, null, 2);
      downloadBlob(payload.filename, payload.content_type, content);
      setActionMessage(t(kind === "json" ? "auditReports.messages.jsonExported" : "auditReports.messages.markdownExported"));
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : t("auditReports.messages.actionFailed"));
    } finally {
      setIsActionBusy(false);
    }
  }

  function openEvidence(evidence?: AuditEvidence) {
    if (!auditReport) {
      return;
    }
    setIsActionBusy(true);
    fetchAuditEvidence(auditReport.id)
      .then((items) => {
        setEvidenceSnapshot(items);
        setSelectedEvidence(evidence ? items.find((item) => item.id === evidence.id) ?? evidence : null);
        setDialog("evidence");
      })
      .catch((error) => {
        setActionMessage(error instanceof Error ? error.message : t("auditReports.messages.actionFailed"));
      })
      .finally(() => {
        setIsActionBusy(false);
      });
  }

  function openAuditLog() {
    if (!auditReport) {
      return;
    }
    setIsActionBusy(true);
    fetchAuditReport(auditReport.id)
      .then((report) => {
        setAuditLogSnapshot(report.events);
        setDialog("log");
      })
      .catch((error) => {
        setActionMessage(error instanceof Error ? error.message : t("auditReports.messages.actionFailed"));
      })
      .finally(() => {
        setIsActionBusy(false);
      });
  }

  return (
    <section className="audit-reports" aria-label={t("auditReports.aria")}>
      <div className="audit-brief">
        <div>
          <span className="audit-brief__eyebrow">{t("auditReports.sections.reviewAudit")}</span>
          <h2>{auditReport ? t("auditReports.sections.reviewAudit") : t("auditReports.empty.title")}</h2>
          <p>
            {auditReport
              ? t("auditReports.summary.workflow", { symbol: auditReport.symbol, decision: decisionLabel(t, auditReport.decision), risk: riskLevelLabel(t, auditReport.risk_level) })
              : disabledReason ?? t("auditReports.empty.description")}
          </p>
        </div>
        <button className="primary-action" type="button" disabled={!canGenerateAuditReport || isGeneratingAuditReport} onClick={onGenerateAuditReport}>
          <FileClock size={14} aria-hidden="true" />
          <span>{isGeneratingAuditReport ? t("auditReports.actions.generating") : t("auditReports.actions.generate")}</span>
        </button>
      </div>

      <div className="audit-grid audit-grid--evidence-chain">
        <AuditReportList
          reports={reports}
          selectedReportId={selectedReportId ?? auditReport?.id}
          isLoading={isLoadingReports}
          error={reportsError}
          onSelectReport={onSelectReport}
        />
        <AuditReportDetail report={auditReport} isLoading={isLoadingAuditReport} error={auditReportError} />
        <aside className="audit-inspector" aria-label={t("auditReports.sections.auditInspector")}>
          {auditReport ? (
            <>
              <AuditTimeline events={auditReport.events} />
              <EvidenceLogList
                evidence={auditReport.evidence}
                onViewEvidence={(evidence) => {
                  openEvidence(evidence);
                }}
              />
              <AuditHashBar
                auditHash={auditReport.audit_hash}
                onCopySummary={copySummary}
                onOpenAuditLog={openAuditLog}
                onViewEvidence={() => openEvidence()}
                onExportJson={() => void exportReport("json")}
                onExportMarkdown={() => void exportReport("markdown")}
                isBusy={isActionBusy}
              />
              {actionMessage ? <div className="audit-action-message">{actionMessage}</div> : null}
            </>
          ) : (
            <section className="audit-panel">
              <div className="audit-panel__heading">
                <span>{t("auditReports.sections.auditInspector")}</span>
                <StatusPill variant="warning">{t("auditReports.status.needsReport")}</StatusPill>
              </div>
              <p className="audit-empty-copy">{disabledReason ?? t("auditReports.empty.selectReport")}</p>
            </section>
          )}
        </aside>
      </div>

      {dialog ? (
        <div className="audit-modal-backdrop" role="presentation" onMouseDown={() => setDialog(null)}>
          <section className="audit-modal" role="dialog" aria-modal="true" aria-label={t(dialog === "log" ? "auditReports.sections.auditLog" : "auditReports.sections.keyEvidence")} onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div>
                <span>{dialog === "log" ? t("auditReports.sections.auditLog") : t("auditReports.sections.keyEvidence")}</span>
                <strong>{auditReport?.id}</strong>
              </div>
              <button className="icon-action" type="button" onClick={() => setDialog(null)} aria-label={t("auditReports.actions.close")}>
                <X size={16} aria-hidden="true" />
              </button>
            </header>
            {dialog === "log" ? (
              <div className="audit-log-table audit-log-table--modal">
                <div className="audit-log-table__header">
                  <span>{t("auditReports.labels.time")}</span>
                  <span>{t("auditReports.labels.actor")}</span>
                  <span>{t("auditReports.labels.summary")}</span>
                  <span>{t("auditReports.labels.entity")}</span>
                  <span>{t("auditReports.labels.status")}</span>
                </div>
                {auditLogSnapshot.map((event) => (
                  <article className="audit-log-row" key={event.id}>
                    <time>{new Date(event.created_at).toLocaleTimeString()}</time>
                    <strong>{actorLabel(t, event.actor)}</strong>
                    <span>{auditStepTitle(t, event.step_key, event.title)} · {auditStepSummary(t, event)}</span>
                    <code>{event.entity_id ?? t("auditReports.labels.noEntity")}</code>
                    <StatusPill variant="info">{statusLabel(t, event.status)}</StatusPill>
                  </article>
                ))}
              </div>
            ) : (
              <pre className="audit-json-view">{JSON.stringify(evidenceForDialog, null, 2)}</pre>
            )}
          </section>
        </div>
      ) : null}
    </section>
  );
}

function downloadBlob(filename: string, contentType: string, content: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
