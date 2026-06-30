import { Braces, ScrollText } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AuditEvidence } from "../../api/auditReports";
import { entityTypeLabel, evidenceSummary, evidenceTitle } from "../../lib/displayLabels";
import { StatusPill } from "../common/StatusPill";

type EvidenceLogListProps = {
  evidence: AuditEvidence[];
  onViewEvidence: (evidence: AuditEvidence) => void;
};

export function EvidenceLogList({ evidence, onViewEvidence }: EvidenceLogListProps) {
  const { t } = useTranslation();

  return (
    <section className="audit-panel audit-panel--evidence" aria-labelledby="audit-evidence-title">
      <div className="audit-panel__heading">
        <span id="audit-evidence-title">
          <ScrollText size={15} aria-hidden="true" />
          {t("auditReports.sections.keyEvidence")}
        </span>
        <StatusPill variant="info">{evidence.length}</StatusPill>
      </div>
      <div className="audit-evidence-list">
        {evidence.map((item) => (
          <article className="audit-evidence-row" key={item.id}>
            <div>
              <strong>{evidenceTitle(t, item)}</strong>
              <p>{evidenceSummary(t, item)}</p>
              <code>{entityTypeLabel(t, item.entity_type)}:{item.entity_id ?? t("auditReports.labels.noEntity")}</code>
            </div>
            <button className="icon-action" type="button" onClick={() => onViewEvidence(item)} aria-label={t("auditReports.actions.viewEvidence")}>
              <Braces size={15} aria-hidden="true" />
            </button>
          </article>
        ))}
        {evidence.length === 0 ? <div className="market-snapshot-empty">{t("auditReports.empty.noEvidence")}</div> : null}
      </div>
    </section>
  );
}
