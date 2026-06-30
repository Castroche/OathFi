import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckCircle2, RadioTower } from "lucide-react";
import {
  fetchDashboardMarketEvents,
  fetchDashboardOpportunity,
  fetchDashboardRecentDecisions,
  fetchDashboardSummary,
} from "../../api/dashboard";
import { fetchSettings } from "../../api/settings";
import { getAIProvider } from "../../config/aiProviders";
import { generateAgentHypotheses } from "../../api/agent";
import type { MarketEvent } from "../../api/market";
import { useAppStore } from "../../stores/appStore";
import { useMarketDataStore } from "../../stores/marketDataStore";
import { StatusPill } from "../common/StatusPill";
import { ActiveMarketEvents } from "./ActiveMarketEvents";
import { AgentStatusCard } from "./AgentStatusCard";
import { CompactMarketChart } from "./CompactMarketChart";
import { MainOpportunityCard } from "./MainOpportunityCard";
import { MarketPulseCard } from "./MarketPulseCard";
import { NewsOverviewCard } from "./NewsOverviewCard";
import { RecentDecisionTrail } from "./RecentDecisionTrail";
import { RiskSummaryCard } from "./RiskSummaryCard";

const DASHBOARD_SYMBOLS = ["BTC/USDT", "ETH/USDT", "HTX/USDT"] as const;
const DASHBOARD_TIMEFRAME = "1h";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "API request failed";
}

export function CommandCenterContent() {
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const topTickers = useMarketDataStore((state) => state.topTickers);
  const klines = useMarketDataStore((state) => state.klines);
  const connectionStatus = useMarketDataStore((state) => state.connectionStatus);
  const setWorkflowIds = useAppStore((state) => state.setWorkflowIds);
  const setLatestAgentHypothesis = useAppStore((state) => state.setLatestAgentHypothesis);
  const latestAuditReport = useAppStore((state) => state.latestAuditReport);
  const showToast = useAppStore((state) => state.showToast);

  const summaryQuery = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: ({ signal }) => fetchDashboardSummary(signal),
    refetchInterval: 15_000,
  });
  const opportunityQuery = useQuery({
    queryKey: ["dashboard", "opportunity"],
    queryFn: ({ signal }) => fetchDashboardOpportunity(signal),
    refetchInterval: 15_000,
  });
  const decisionsQuery = useQuery({
    queryKey: ["dashboard", "recent-decisions"],
    queryFn: ({ signal }) => fetchDashboardRecentDecisions(10, signal),
    refetchInterval: 15_000,
  });
  const marketEventsQuery = useQuery({
    queryKey: ["dashboard", "market-events"],
    queryFn: ({ signal }) => fetchDashboardMarketEvents(5, signal),
    refetchInterval: 15_000,
  });
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: ({ signal }) => fetchSettings(signal),
    retry: false,
  });

  const primaryMarketEvent = marketEventsQuery.data?.[0];
  const runtimeSettings = settingsQuery.data;
  const ethTicker = topTickers["ETH/USDT"];
  const liveTickerCount = useMemo(
    () => DASHBOARD_SYMBOLS.filter((symbol) => topTickers[symbol]?.status === "live" || topTickers[symbol]?.status === "degraded").length,
    [topTickers],
  );

  const generateHypothesisMutation = useMutation({
    mutationFn: async (marketEvent?: MarketEvent) => {
      const event = marketEvent ?? primaryMarketEvent;
      const symbol = opportunityQuery.data?.symbol ?? event?.symbol ?? "ETH/USDT";
      return generateAgentHypotheses({
        symbol,
        timeframe: DASHBOARD_TIMEFRAME,
        market_event_id: event?.id,
        language: i18n.language.toLowerCase().startsWith("zh") ? "zh-CN" : "en",
        context: {
          ticker: topTickers[symbol],
          orderbook: null,
          market_events: marketEventsQuery.data ?? [],
          dashboard_summary: summaryQuery.data,
          risk_context: {
            paper_trading_only: true,
            real_trading_enabled: false,
          },
        },
      });
    },
    onSuccess: (result) => {
      const hypothesis = result.hypotheses[0];
      if (!hypothesis) return;
      setWorkflowIds({ workflowId: hypothesis.workflow_id, hypothesisId: hypothesis.id });
      setLatestAgentHypothesis(hypothesis);
      showToast({
        variant: "success",
        message: t("dashboard.feedback.hypothesisGenerated", { id: hypothesis.id }),
      });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      navigate(`/agent-lab/${hypothesis.id}`);
    },
    onError: (error) => {
      showToast({ variant: "error", message: errorMessage(error) });
    },
  });

  const handleViewAudit = () => {
    if (latestAuditReport?.id) {
      navigate(`/audit-reports/${latestAuditReport.id}`);
      return;
    }
    navigate("/audit-reports");
  };

  return (
    <section className="command-center" aria-label={t("commandCenter.aria")}>
      <div className="command-center__status-row" aria-label={t("dashboard.sections.statusBar")}>
        {DASHBOARD_SYMBOLS.map((symbol) => {
          const ticker = topTickers[symbol];
          return (
            <div className="command-ticker" key={symbol}>
              <span>{symbol}</span>
              <strong>{ticker ? ticker.last.toLocaleString("en-US", { maximumFractionDigits: symbol === "HTX/USDT" ? 10 : 2 }) : "--"}</strong>
              <em className={(ticker?.changePct ?? 0) >= 0 ? "is-up" : "is-down"}>
                {ticker ? `${ticker.changePct >= 0 ? "+" : ""}${ticker.changePct.toFixed(2)}%` : "--"}
              </em>
            </div>
          );
        })}
        <StatusPill variant={liveTickerCount > 0 ? "success" : "danger"}>
          <RadioTower size={13} aria-hidden="true" />
          {runtimeSettings?.primary_data_source ?? "HTX"} / {runtimeSettings?.connection_type ?? "Hybrid"}
        </StatusPill>
        <StatusPill variant={summaryQuery.data?.agent_status.running && runtimeSettings?.model_provider ? "success" : "warning"}>
          {runtimeSettings?.model_provider ? getAIProvider(runtimeSettings.model_provider).displayName : t("status.agentRunning")}
        </StatusPill>
        <StatusPill variant={runtimeSettings?.paper_trading_enabled === false ? "warning" : "info"}>
          {runtimeSettings?.paper_trading_enabled === false ? t("settings.status.paperExecutionUnavailable") : t("status.paperTradingOnly")}
        </StatusPill>
        <StatusPill variant="danger">{t("status.liveTradingDisabled")}</StatusPill>
        <StatusPill variant="info">
          <CheckCircle2 size={13} aria-hidden="true" />
          {runtimeSettings?.demo_mode_enabled === false ? t("status.disabled") : t("dashboard.labels.demoModeOn")}
        </StatusPill>
        <StatusPill variant={runtimeSettings?.demo_scenario === "reject" ? "warning" : "success"}>
          {t("settings.fields.demoScenario")}: {runtimeSettings ? t(`settings.demo.scenarios.${runtimeSettings.demo_scenario}`) : "--"}
        </StatusPill>
      </div>

      <div className="command-center__metrics">
        <MarketPulseCard
          pulse={summaryQuery.data?.market_pulse}
          tickers={topTickers}
          isLoading={summaryQuery.isLoading}
        />
        <AgentStatusCard agent={summaryQuery.data?.agent_status} />
        <RiskSummaryCard risk={summaryQuery.data?.risk_summary} />
      </div>

      <div className="command-center__body">
        <ActiveMarketEvents
          events={marketEventsQuery.data ?? []}
          isLoading={marketEventsQuery.isLoading}
          error={marketEventsQuery.error instanceof Error ? marketEventsQuery.error : null}
          isAnalyzing={generateHypothesisMutation.isPending}
          onAnalyze={(event) => generateHypothesisMutation.mutate(event)}
          onViewAllEvents={() => navigate("/market")}
        />
        <NewsOverviewCard />
        <MainOpportunityCard
          opportunity={opportunityQuery.data}
          isGenerating={generateHypothesisMutation.isPending}
          onGenerateHypothesis={() => generateHypothesisMutation.mutate(undefined)}
          onViewSupportingData={() => navigate("/market")}
        />
        <CompactMarketChart
          klines={klines}
          orderBook={null}
          status={ethTicker?.status ?? connectionStatus}
        />
        <RecentDecisionTrail
          decisions={decisionsQuery.data ?? []}
          isLoading={decisionsQuery.isLoading}
          onViewAudit={handleViewAudit}
        />
      </div>
    </section>
  );
}
