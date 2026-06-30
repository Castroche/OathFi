import { Braces, Copy, Download, FileJson, Hash, ScrollText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { StatusPill } from "../common/StatusPill";

type AuditHashBarProps = {
  auditHash: string;
  onCopySummary: () => void;
  onOpenAuditLog: () => void;
  onViewEvidence: () => void;
  onExportJson: () => void;
  onExportMarkdown: () => void;
  isBusy?: boolean;
};

export function AuditHashBar({ auditHash, onCopySummary, onOpenAuditLog, onViewEvidence, onExportJson, onExportMarkdown, isBusy = false }: AuditHashBarProps) {
  const { t } = useTranslation();

  return (
    <section className="audit-panel audit-panel--hash" aria-label={t("auditReports.sections.auditHash")}>
      <div className="audit-hash-bar">
        <div>
          <span>
            <Hash size={15} aria-hidden="true" />
            {t("auditReports.labels.localHash")}
          </span>
          <code>{auditHash || t("auditReports.labels.pendingHash")}</code>
          <small>{t("auditReports.labels.hashMethod")}</small>
        </div>
        <StatusPill variant="info">{t("auditReports.labels.localTamperEvident")}</StatusPill>
      </div>
      <div className="audit-actions audit-actions--stacked" aria-label={t("auditReports.sections.actions")}>
        <button className="secondary-action" type="button" onClick={onCopySummary} disabled={isBusy}>
          <Copy size={14} aria-hidden="true" />
          <span>{t("auditReports.actions.copySummary")}</span>
        </button>
        <button className="secondary-action" type="button" onClick={onOpenAuditLog}>
          <ScrollText size={14} aria-hidden="true" />
          <span>{t("auditReports.actions.openAuditLog")}</span>
        </button>
        <button className="secondary-action" type="button" onClick={onViewEvidence}>
          <Braces size={14} aria-hidden="true" />
          <span>{t("auditReports.actions.viewEvidence")}</span>
        </button>
        <button className="secondary-action" type="button" onClick={onExportJson} disabled={isBusy}>
          <FileJson size={14} aria-hidden="true" />
          <span>{t("auditReports.actions.exportJson")}</span>
        </button>
        <button className="secondary-action" type="button" onClick={onExportMarkdown} disabled={isBusy}>
          <Download size={14} aria-hidden="true" />
          <span>{t("auditReports.actions.exportMarkdown")}</span>
        </button>
      </div>
    </section>
  );
}
