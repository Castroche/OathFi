import { ArrowRight, ListChecks } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { MarketEvent } from "../../api/market";
import { StatusPill, type StatusPillVariant } from "../common/StatusPill";

type ActiveMarketEventsProps = {
  events: MarketEvent[];
  isLoading: boolean;
  error?: Error | null;
  isAnalyzing: boolean;
  onAnalyze: (event: MarketEvent) => void;
  onViewAllEvents: () => void;
};

function severityVariant(severity: number): StatusPillVariant {
  if (severity >= 8) return "danger";
  if (severity >= 5) return "warning";
  return "info";
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function ActiveMarketEvents({
  events,
  isLoading,
  error,
  isAnalyzing,
  onAnalyze,
  onViewAllEvents,
}: ActiveMarketEventsProps) {
  const { t } = useTranslation();

  return (
    <section className="market-intel" aria-labelledby="active-market-events">
      <div className="section-heading">
        <div className="section-heading__title">
          <ListChecks size={15} aria-hidden="true" />
          <h2 id="active-market-events">{t("commandCenter.sections.activeMarketEvents")}</h2>
        </div>
        <button className="secondary-action" type="button" onClick={onViewAllEvents}>
          <span>{t("dashboard.actions.viewAllEvents")}</span>
          <ArrowRight size={14} aria-hidden="true" />
        </button>
      </div>
      <div className="market-event-list">
        {events.map((event) => (
          <article className="market-event" key={event.id}>
            <div>
              <span>{event.symbol} / {formatTime(event.created_at)}</span>
              <h3>{event.title}</h3>
              <p>{event.summary}</p>
              <button
                className="secondary-action secondary-action--compact"
                type="button"
                disabled={isAnalyzing}
                onClick={() => onAnalyze(event)}
              >
                <span>{isAnalyzing ? t("loadingStates.generating") : t("dashboard.actions.analyze")}</span>
                <ArrowRight size={13} aria-hidden="true" />
              </button>
            </div>
            <StatusPill variant={severityVariant(event.severity)}>{event.severity}/10</StatusPill>
          </article>
        ))}
        {isLoading ? <div className="market-snapshot-empty">{t("loadingStates.syncing")}</div> : null}
        {error ? <div className="market-snapshot-empty">{error.message}</div> : null}
        {!isLoading && !error && events.length === 0 ? (
          <div className="market-snapshot-empty">{t("dashboard.empty.noMarketEvents")}</div>
        ) : null}
      </div>
    </section>
  );
}
