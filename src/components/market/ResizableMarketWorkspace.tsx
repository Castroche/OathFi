import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import GridLayout, { WidthProvider, type Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { useMarketDataStore } from "../../stores/marketDataStore";
import { PanelFrame } from "./PanelFrame";

const LAYOUT_STORAGE_KEY = "oathfi.market-monitor.grid-layout.v1";
const ResponsiveGridLayout = WidthProvider(GridLayout);
type LayoutItem = Layout;

type WorkspacePanelId = "chart" | "orderBook" | "trades" | "indicators" | "events" | "diagnostics";

type ResizableMarketWorkspaceProps = {
  chart: ReactNode;
  orderBook: ReactNode;
  trades: ReactNode;
  indicators: ReactNode;
  events: ReactNode;
  diagnostics: ReactNode;
};

const defaultLayout: LayoutItem[] = [
  { i: "chart", x: 0, y: 0, w: 8, h: 14, minW: 5, minH: 9 },
  { i: "orderBook", x: 8, y: 0, w: 4, h: 7, minW: 3, minH: 5 },
  { i: "trades", x: 8, y: 7, w: 4, h: 7, minW: 3, minH: 5 },
  { i: "indicators", x: 0, y: 14, w: 4, h: 6, minW: 3, minH: 4 },
  { i: "events", x: 4, y: 14, w: 4, h: 6, minW: 3, minH: 4 },
  { i: "diagnostics", x: 8, y: 14, w: 4, h: 6, minW: 3, minH: 4 },
];

function readStoredLayout() {
  if (typeof window === "undefined") {
    return defaultLayout;
  }
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LAYOUT_STORAGE_KEY) ?? "null") as LayoutItem[] | null;
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return defaultLayout;
    }
    const byId = new Map(parsed.map((item) => [item.i, item]));
    return defaultLayout.map((item) => ({ ...item, ...byId.get(item.i) }));
  } catch {
    return defaultLayout;
  }
}

function persistLayout(layout: LayoutItem[]) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layout));
}

function statusVariant(status: string) {
  if (status === "live") return "success";
  if (status === "error" || status === "disconnected" || status === "stale") return "danger";
  if (status === "fallback" || status === "degraded") return "warning";
  return "info";
}

export function ResizableMarketWorkspace({ chart, orderBook, trades, indicators, events, diagnostics }: ResizableMarketWorkspaceProps) {
  const { t } = useTranslation();
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [layout, setLayout] = useState<LayoutItem[]>(() => readStoredLayout());
  const activeSymbol = useMarketDataStore((state) => state.activeSymbol);
  const activeTimeframe = useMarketDataStore((state) => state.activeTimeframe);
  const connectionStatus = useMarketDataStore((state) => state.connectionStatus);
  const dataSource = useMarketDataStore((state) => state.dataSource);
  const streamDiagnostics = useMarketDataStore((state) => state.streamDiagnostics);
  const orderBookState = useMarketDataStore((state) => state.orderBook);
  const tradesState = useMarketDataStore((state) => state.trades);
  const klines = useMarketDataStore((state) => state.klines);

  const panels = useMemo<Array<{
    id: WorkspacePanelId;
    title: string;
    subtitle: string;
    status: string;
    source?: string;
    loading?: boolean;
    body: ReactNode;
  }>>(() => [
    {
      id: "chart",
      title: t("marketLive.panels.chart"),
      subtitle: `${activeSymbol} - ${activeTimeframe} - ${klines.length} ${t("marketLive.panels.candles")}`,
      status: streamDiagnostics.kline.status,
      source: dataSource,
      loading: klines.length < 1,
      body: chart,
    },
    {
      id: "orderBook",
      title: t("marketLive.panels.orderBook"),
      subtitle: t("marketLive.panels.depthSubtitle"),
      status: streamDiagnostics.depth.status,
      source: orderBookState?.source ?? dataSource,
      loading: !orderBookState,
      body: orderBook,
    },
    {
      id: "trades",
      title: t("marketLive.panels.trades"),
      subtitle: t("marketLive.panels.tradesSubtitle", { count: Math.min(tradesState.length, 100) }),
      status: streamDiagnostics.trade.status,
      source: dataSource,
      loading: tradesState.length < 1,
      body: trades,
    },
    {
      id: "indicators",
      title: t("marketLive.panels.indicators"),
      subtitle: t("marketLive.panels.indicatorsSubtitle"),
      status: connectionStatus,
      source: "htx_rest_fallback",
      body: indicators,
    },
    {
      id: "events",
      title: t("marketLive.panels.events"),
      subtitle: t("marketLive.panels.eventsSubtitle"),
      status: connectionStatus,
      source: "backend",
      body: events,
    },
    {
      id: "diagnostics",
      title: t("marketLive.panels.diagnostics"),
      subtitle: t("marketLive.panels.diagnosticsSubtitle"),
      status: connectionStatus,
      source: dataSource,
      body: diagnostics,
    },
  ], [
    activeSymbol,
    activeTimeframe,
    chart,
    connectionStatus,
    dataSource,
    diagnostics,
    events,
    indicators,
    klines.length,
    orderBook,
    orderBookState,
    streamDiagnostics.depth.status,
    streamDiagnostics.kline.status,
    streamDiagnostics.trade.status,
    t,
    trades,
    tradesState.length,
  ]);

  const handleLayoutChange = useCallback((nextLayout: readonly LayoutItem[]) => {
    const next = [...nextLayout];
    setLayout(next);
    persistLayout(next);
    window.dispatchEvent(new Event("resize"));
  }, []);

  const updateControlledLayout = useCallback((updater: (current: LayoutItem[]) => LayoutItem[]) => {
    setLayout((current) => {
      const next = updater(current);
      persistLayout(next);
      window.dispatchEvent(new Event("resize"));
      return next;
    });
  }, []);

  const beginManualDrag = useCallback((panelId: WorkspacePanelId, clientX: number, clientY: number) => {
    const shellWidth = shellRef.current?.getBoundingClientRect().width ?? 1200;
    const colWidth = Math.max(40, (shellWidth - 12 * 11) / 12);
    const rowPitch = 48;
    const startLayout = layout.map((item) => ({ ...item }));
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = Math.round((moveEvent.clientX - clientX) / colWidth);
      const dy = Math.round((moveEvent.clientY - clientY) / rowPitch);
      updateControlledLayout(() =>
        startLayout.map((item) => {
          if (item.i !== panelId) {
            return item;
          }
          return {
            ...item,
            x: Math.max(0, Math.min(12 - item.w, item.x + dx)),
            y: Math.max(0, item.y + dy),
            moved: dx !== 0 || dy !== 0,
          };
        }),
      );
    };
    const stop = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", stop);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", stop);
  }, [layout, updateControlledLayout]);

  const beginManualResize = useCallback((panelId: WorkspacePanelId, clientX: number, clientY: number) => {
    const shellWidth = shellRef.current?.getBoundingClientRect().width ?? 1200;
    const colWidth = Math.max(40, (shellWidth - 12 * 11) / 12);
    const rowPitch = 48;
    const startLayout = layout.map((item) => ({ ...item }));
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dw = Math.round((moveEvent.clientX - clientX) / colWidth);
      const dh = Math.round((moveEvent.clientY - clientY) / rowPitch);
      updateControlledLayout(() =>
        startLayout.map((item) => {
          if (item.i !== panelId) {
            return item;
          }
          const minW = item.minW ?? 1;
          const minH = item.minH ?? 1;
          return {
            ...item,
            w: Math.max(minW, Math.min(12 - item.x, item.w + dw)),
            h: Math.max(minH, item.h + dh),
            moved: dw !== 0 || dh !== 0,
          };
        }),
      );
    };
    const stop = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", stop);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", stop);
  }, [layout, updateControlledLayout]);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) {
      return;
    }
    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const panel = target.closest<HTMLElement>("[data-market-panel-id]");
      const panelId = panel?.dataset.marketPanelId as WorkspacePanelId | undefined;
      if (!panelId) {
        return;
      }
      if (target.closest(".market-panel-manual-resize")) {
        event.preventDefault();
        beginManualResize(panelId, event.clientX, event.clientY);
        return;
      }
      if (target.closest(".market-panel-frame__drag")) {
        event.preventDefault();
        beginManualDrag(panelId, event.clientX, event.clientY);
      }
    };
    shell.addEventListener("mousedown", handleMouseDown, true);
    return () => shell.removeEventListener("mousedown", handleMouseDown, true);
  }, [beginManualDrag, beginManualResize]);

  const resetLayout = useCallback(() => {
    setLayout(defaultLayout);
    persistLayout(defaultLayout);
    window.dispatchEvent(new Event("resize"));
  }, []);

  return (
    <div className="market-workstation-shell" ref={shellRef}>
      <div className="market-workstation-shell__toolbar">
        <span>{t("marketLive.workspace.gridHint")}</span>
        <button className="secondary-action secondary-action--compact" type="button" onClick={resetLayout}>
          <RotateCcw size={13} aria-hidden="true" />
          <span>{t("marketLive.workspace.resetLayout")}</span>
        </button>
      </div>
      <ResponsiveGridLayout
        className="market-workstation-grid"
        cols={12}
        compactType="vertical"
        draggableCancel="button, input, select, textarea"
        isBounded
        layout={layout}
        margin={[12, 12]}
        rowHeight={36}
        useCSSTransforms
        onLayoutChange={handleLayoutChange}
      >
        {panels.map((panel) => (
          <div className="market-workstation-grid__item" data-market-panel-id={panel.id} key={panel.id}>
            <PanelFrame
              title={panel.title}
              subtitle={panel.subtitle}
              status={panel.status}
              statusVariant={statusVariant(panel.status)}
              source={panel.source}
              loading={panel.loading}
            >
              {panel.body}
            </PanelFrame>
            <button
              className="market-panel-manual-resize"
              type="button"
              aria-label={t("marketLive.workspace.resizePanel")}
            />
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
}
