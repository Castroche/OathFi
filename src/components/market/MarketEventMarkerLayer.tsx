import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { fetchMarketEvents } from "../../api/market";
import { eventTypeLabel } from "../../lib/displayLabels";
import { useMarketDataStore } from "../../stores/marketDataStore";

const markerSlots = [18, 42, 66, 82];

export function MarketEventMarkerLayer() {
  const { t } = useTranslation();
  const activeSymbol = useMarketDataStore((state) => state.activeSymbol);
  const eventsQuery = useQuery({
    queryKey: ["market-events", activeSymbol, "markers"],
    queryFn: ({ signal }) => fetchMarketEvents(activeSymbol, 4, signal),
    refetchInterval: 20_000,
  });

  const events = eventsQuery.data ?? [];
  if (events.length === 0) {
    return null;
  }

  return (
    <div className="market-event-marker-layer" aria-hidden="true">
      {events.map((event, index) => (
        <span
          className={`market-event-marker market-event-marker--severity-${Math.min(5, Math.max(1, event.severity))}`}
          key={event.id}
          style={{ left: `${markerSlots[index % markerSlots.length]}%` }}
        >
          {eventTypeLabel(t, event.event_type)}
        </span>
      ))}
    </div>
  );
}
