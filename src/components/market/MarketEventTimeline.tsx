import { ChevronDown, Radar, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { detectMarketEvents, fetchMarketEvents } from "../../api/market";
import { useMarketDataStore } from "../../stores/marketDataStore";
import { StatusPill } from "../common/StatusPill";

function formatEventTime(value?: string | null) {
  if (!value) {
    return "--";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function severityVariant(severity: number) {
  if (severity >= 4) return "danger";
  if (severity >= 3) return "warning";
  if (severity >= 2) return "info";
  return "neutral";
}

export function MarketEventTimeline() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const activeSymbol = useMarketDataStore((state) => state.activeSymbol);
  const activeTimeframe = useMarketDataStore((state) => state.activeTimeframe);
  const [expanded, setExpanded] = useState(false);

  const eventsQuery = useQuery({
    queryKey: ["market-events", activeSymbol, expanded ? "all" : "compact"],
    queryFn: ({ signal }) => fetchMarketEvents(activeSymbol, expanded ? 30 : 6, signal),
    refetchInterval: 20_000,
  });

  const detectMutation = useMutation({
    mutationFn: () => detectMarketEvents(activeSymbol, activeTimeframe),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["market-events", activeSymbol] });
    },
  });

  const events = eventsQuery.data ?? [];

  return (
    <section className="market-wide-panel market-event-timeline" aria-labelledby="market-event-timeline-title">
      <div className="market-panel-heading market-panel-heading--compact">
        <div>
          <span>
            <Radar size={15} aria-hidden="true" />
            {t("marketLive.sections.eventTimeline")}
          </span>
          <h2 id="market-event-timeline-title">{t("marketLive.timeline.title")}</h2>
        </div>
        <div className="market-event-timeline__actions">
          <button type="button" className="secondary-action secondary-action--compact" disabled={detectMutation.isPending} onClick={() => detectMutation.mutate()}>
            <RefreshCw size={13} aria-hidden="true" />
            <span>{detectMutation.isPending ? t("marketLive.timeline.detecting") : t("marketLive.timeline.detect")}</span>
          </button>
          <button type="button" className="secondary-action secondary-action--compact" onClick={() => setExpanded((value) => !value)}>
            <ChevronDown size={13} aria-hidden="true" />
            <span>{expanded ? t("marketLive.timeline.showLess") : t("dashboard.actions.viewAllEvents")}</span>
          </button>
        </div>
      </div>

      {eventsQuery.isError ? (
        <div className="market-empty-state market-empty-state--danger">{t("marketLive.timeline.error")}</div>
      ) : eventsQuery.isLoading ? (
        <div className="market-empty-state">{t("marketLive.status.loading")}</div>
      ) : events.length === 0 ? (
        <div className="market-empty-state">{t("marketLive.timeline.empty")}</div>
      ) : (
        <div className="market-event-timeline__list">
          {events.map((event) => (
            <article className="market-event-timeline__item" key={event.id}>
              <div className="market-event-timeline__dot" />
              <div>
                <header>
                  <strong>{event.title}</strong>
                  <StatusPill variant={severityVariant(event.severity)}>{event.event_type}</StatusPill>
                </header>
                <p>{event.summary}</p>
                <footer>
                  <span>{event.symbol}</span>
                  <span>{event.source}</span>
                  <time>{formatEventTime(event.detected_at ?? event.created_at)}</time>
                </footer>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

