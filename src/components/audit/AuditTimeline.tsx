import { Clock3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AuditEvent } from "../../api/auditReports";
import { auditStepSummary, auditStepTitle } from "../../lib/displayLabels";
import { StatusPill } from "../common/StatusPill";

type AuditTimelineProps = {
  events: AuditEvent[];
};

export function AuditTimeline({ events }: AuditTimelineProps) {
  const { t } = useTranslation();

  return (
    <section className="audit-panel audit-panel--timeline" aria-labelledby="audit-timeline-title">
      <div className="audit-panel__heading">
        <span id="audit-timeline-title">
          <Clock3 size={15} aria-hidden="true" />
          {t("auditReports.sections.auditTimeline")}
        </span>
        <StatusPill variant="neutral">{events.length}</StatusPill>
      </div>
      <div className="audit-timeline">
        {events.map((event) => (
          <article className="audit-timeline__item" key={event.id}>
            <time>{new Date(event.created_at).toLocaleTimeString()}</time>
            <div>
              <strong>{auditStepTitle(t, event.step_key, event.title)}</strong>
              <p>{auditStepSummary(t, event)}</p>
            </div>
          </article>
        ))}
        {events.length === 0 ? <div className="market-snapshot-empty">{t("auditReports.empty.noTimeline")}</div> : null}
      </div>
    </section>
  );
}
