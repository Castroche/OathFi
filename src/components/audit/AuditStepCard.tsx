import { CheckCircle2, CircleAlert, CircleDashed } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AuditEvent } from "../../api/auditReports";
import { actorLabel, auditStepSummary, auditStepTitle, statusLabel } from "../../lib/displayLabels";
import { StatusPill, type StatusPillVariant } from "../common/StatusPill";

type AuditStepCardProps = {
  event: AuditEvent;
};

function variantForStatus(status: string): StatusPillVariant {
  const normalized = status.toLowerCase();
  if (["completed", "filled", "approved", "pass", "ready_for_risk"].includes(normalized)) {
    return "success";
  }
  if (["missing", "not_created", "rejected", "blocked", "block"].includes(normalized)) {
    return "danger";
  }
  if (["warning", "conditional", "draft", "open"].includes(normalized)) {
    return "warning";
  }
  return "info";
}

function iconForStatus(status: string) {
  const normalized = status.toLowerCase();
  if (["missing", "not_created"].includes(normalized)) {
    return CircleDashed;
  }
  if (["rejected", "blocked", "block"].includes(normalized)) {
    return CircleAlert;
  }
  return CheckCircle2;
}

export function AuditStepCard({ event }: AuditStepCardProps) {
  const { t } = useTranslation();
  const StepIcon = iconForStatus(event.status);
  const variant = variantForStatus(event.status);

  return (
    <article className={`audit-stage audit-stage--${variant}`}>
      <span className="audit-stage__index">{String(event.step_index).padStart(2, "0")}</span>
      <div>
        <header>
          <h3>{auditStepTitle(t, event.step_key, event.title)}</h3>
          <StatusPill variant={variant}>{statusLabel(t, event.status)}</StatusPill>
        </header>
        <strong>{event.entity_id ?? t("auditReports.labels.missingEntity")}</strong>
        <p>{auditStepSummary(t, event)}</p>
        <span className="audit-stage__actor">
          <StepIcon size={13} aria-hidden="true" />
          {actorLabel(t, event.actor)}
        </span>
      </div>
    </article>
  );
}
