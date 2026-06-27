import { useQuery } from "@tanstack/react-query";
import { fetchMarketEvents } from "../../api/market";
import { useMarketDataStore } from "../../stores/marketDataStore";

const markerSlots = [18, 42, 66, 82];

function markerLabel(eventType: string) {
  if (eventType === "volume_spike") return "Volume Spike";
  if (eventType === "breakout_watch") return "Breakout Watch";
  if (eventType === "agent_analysis") return "Agent Analysis";
  if (eventType === "liquidity_shift") return "Liquidity Shift";
  return eventType.replace(/_/g, " ");
}

export function MarketEventMarkerLayer() {
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
          {markerLabel(event.event_type)}
        </span>
      ))}
    </div>
  );
}

