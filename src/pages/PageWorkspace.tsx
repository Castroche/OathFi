import {
  ArrowRight,
  Brain,
  CheckCircle2,
  Cpu,
  Database,
  FlaskConical,
  GitBranch,
  ListChecks,
  ShieldAlert,
  SlidersHorizontal,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../api/client";
import { generateHypothesis, type Hypothesis } from "../api/hypotheses";
import { createBacktest, fetchBacktest } from "../api/backtests";
import { fetchRiskCheck, runRiskCheck } from "../api/risk";
import { createPaperOrder, fetchPaperOrder } from "../api/paperOrders";
import { createAuditReport, fetchAuditReport } from "../api/auditReports";
import { saveSettings } from "../api/settings";
import { detectMarketEvents, fetchMarketEvents } from "../api/market";
import type { AppRoute } from "../lib/routes";
import { pagePanels } from "../lib/pagePanels";
import { StatusPill } from "../components/common/StatusPill";
import { AuditReportsContent } from "../components/audit/AuditReportsContent";
import { BacktestStudioContent } from "../components/backtest/BacktestStudioContent";
import { CommandCenterContent } from "../components/dashboard/CommandCenterContent";
import { PaperExecutionContent } from "../components/execution/PaperExecutionContent";
import { AgentLabContent as StructuredAgentLabContent } from "../components/agent/AgentLabContent";
import { MarketMonitorContent } from "../components/market/MarketMonitorContent";
import { RiskFirewallContent } from "../components/risk/RiskFirewallContent";
import { SettingsContent } from "../components/settings/SettingsContent";
import { useMarketDataStore } from "../stores/marketDataStore";
import { useAppStore } from "../stores/appStore";

type PageWorkspaceProps = {
  route: AppRoute;
};

const panelIcons = [Database, Cpu, ShieldAlert] as const;
const labMetricIcons = [Database, Brain, FlaskConical] as const;

function getModuleKey(routeId: AppRoute["id"]) {
  return `navigation.${routeId}` as const;
}

function workflowMessage(language: string, zh: string, en: string) {
  return language.toLowerCase().startsWith("zh") ? zh : en;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "API request failed";
}

function sixMonthsAgoRange() {
  const end = new Date();
  const start = new Date(end);
  start.setMonth(start.getMonth() - 6);
  return {
    start_time: start.toISOString(),
    end_time: end.toISOString(),
  };
}

export function PageWorkspace({ route }: PageWorkspaceProps) {
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const params = useParams<{
    hypothesisId?: string;
    backtestId?: string;
    riskCheckId?: string;
    paperOrderId?: string;
    auditReportId?: string;
  }>();
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const activeSymbol = useMarketDataStore((state) => state.activeSymbol);
  const activeTimeframe = useMarketDataStore((state) => state.activeTimeframe);
  const ticker = useMarketDataStore((state) => state.ticker);
  const orderBook = useMarketDataStore((state) => state.orderBook);
  const language = useAppStore((state) => state.language);
  const hypothesisId = useAppStore((state) => state.hypothesisId);
  const backtestId = useAppStore((state) => state.backtestId);
  const riskCheckId = useAppStore((state) => state.riskCheckId);
  const paperOrderId = useAppStore((state) => state.paperOrderId);
  const setWorkflowIds = useAppStore((state) => state.setWorkflowIds);
  const latestHypothesis = useAppStore((state) => state.latestHypothesis);
  const latestBacktest = useAppStore((state) => state.latestBacktest);
  const latestRiskCheck = useAppStore((state) => state.latestRiskCheck);
  const latestPaperOrder = useAppStore((state) => state.latestPaperOrder);
  const latestAuditReport = useAppStore((state) => state.latestAuditReport);
  const setLatestHypothesis = useAppStore((state) => state.setLatestHypothesis);
  const setLatestBacktest = useAppStore((state) => state.setLatestBacktest);
  const setLatestRiskCheck = useAppStore((state) => state.setLatestRiskCheck);
  const setLatestPaperOrder = useAppStore((state) => state.setLatestPaperOrder);
  const setLatestAuditReport = useAppStore((state) => state.setLatestAuditReport);
  const setLastRiskBlockReason = useAppStore((state) => state.setLastRiskBlockReason);
  const lastRiskBlockReason = useAppStore((state) => state.lastRiskBlockReason);
  const showToast = useAppStore((state) => state.showToast);
  const panels = pagePanels[route.id];
  const RouteIcon = route.icon;
  const isCommandCenter = route.id === "commandCenter";
  const isMarketMonitor = route.id === "marketMonitor";
  const isAgentLab = route.id === "agentLab";
  const isBacktestStudio = route.id === "backtestStudio";
  const isRiskFirewall = route.id === "riskFirewall";
  const isPaperExecution = route.id === "paperExecution";
  const isAuditReports = route.id === "auditReports";
  const isSettings = route.id === "settings";
  const headerCtaKey = isCommandCenter ? "actions.startDemoFlow" : route.ctaKey;

  useEffect(() => {
    setWorkflowIds({
      hypothesisId: params.hypothesisId ?? hypothesisId,
      backtestId: params.backtestId ?? backtestId,
      riskCheckId: params.riskCheckId ?? riskCheckId,
      paperOrderId: params.paperOrderId ?? paperOrderId,
      auditReportId: params.auditReportId,
    });
  }, [
    backtestId,
    hypothesisId,
    paperOrderId,
    params.auditReportId,
    params.backtestId,
    params.hypothesisId,
    params.paperOrderId,
    params.riskCheckId,
    riskCheckId,
    setWorkflowIds,
  ]);

  const backtestQuery = useQuery({
    queryKey: ["backtest", params.backtestId],
    queryFn: ({ signal }) => fetchBacktest(params.backtestId as string, signal),
    enabled: Boolean(params.backtestId),
  });
  const riskCheckQuery = useQuery({
    queryKey: ["risk-check", params.riskCheckId],
    queryFn: ({ signal }) => fetchRiskCheck(params.riskCheckId as string, signal),
    enabled: Boolean(params.riskCheckId),
  });
  const paperOrderQuery = useQuery({
    queryKey: ["paper-order", params.paperOrderId],
    queryFn: ({ signal }) => fetchPaperOrder(params.paperOrderId as string, signal),
    enabled: Boolean(params.paperOrderId),
  });
  const auditReportQuery = useQuery({
    queryKey: ["audit-report", params.auditReportId],
    queryFn: ({ signal }) => fetchAuditReport(params.auditReportId as string, signal),
    enabled: Boolean(params.auditReportId),
  });

  useEffect(() => {
    if (backtestQuery.data) {
      setLatestBacktest(backtestQuery.data);
      setWorkflowIds({
        workflowId: backtestQuery.data.workflow_id,
        backtestId: backtestQuery.data.id,
        hypothesisId: backtestQuery.data.hypothesis_id,
      });
    }
  }, [backtestQuery.data, setLatestBacktest, setWorkflowIds]);

  useEffect(() => {
    if (riskCheckQuery.data) {
      setLatestRiskCheck(riskCheckQuery.data);
      setWorkflowIds({
        workflowId: riskCheckQuery.data.workflow_id,
        riskCheckId: riskCheckQuery.data.id,
        hypothesisId: riskCheckQuery.data.hypothesis_id,
        backtestId: riskCheckQuery.data.backtest_id ?? backtestId,
      });
    }
  }, [backtestId, riskCheckQuery.data, setLatestRiskCheck, setWorkflowIds]);

  useEffect(() => {
    if (paperOrderQuery.data) {
      setLatestPaperOrder(paperOrderQuery.data);
      setWorkflowIds({
        workflowId: paperOrderQuery.data.workflow_id,
        paperOrderId: paperOrderQuery.data.id,
        riskCheckId: paperOrderQuery.data.risk_check_id,
        backtestId: paperOrderQuery.data.backtest_id ?? backtestId,
        hypothesisId: paperOrderQuery.data.hypothesis_id,
      });
    }
  }, [backtestId, paperOrderQuery.data, setLatestPaperOrder, setWorkflowIds]);

  useEffect(() => {
    if (auditReportQuery.data) {
      setLatestAuditReport(auditReportQuery.data);
      setWorkflowIds({ workflowId: auditReportQuery.data.workflow_id, auditReportId: auditReportQuery.data.id });
    }
  }, [auditReportQuery.data, setLatestAuditReport, setWorkflowIds]);

  const tradeLevels = useMemo(() => {
    const price = ticker?.last ?? orderBook?.midPrice ?? 0;
    return {
      entryPrice: Number(price.toFixed(2)),
      stopLoss: Number((price * 0.984).toFixed(2)),
      takeProfit: Number((price * 1.028).toFixed(2)),
      quantity: 0.65,
    };
  }, [orderBook?.midPrice, ticker?.last]);

  const generateHypothesisMutation = useMutation({
    mutationFn: async () => {
      let marketEvents = await fetchMarketEvents(activeSymbol, 5);
      if (marketEvents.length === 0) {
        marketEvents = await detectMarketEvents(activeSymbol, activeTimeframe);
      }
      const primaryMarketEvent = marketEvents[0];
      return generateHypothesis({
        symbol: activeSymbol,
        timeframe: activeTimeframe,
        market_event_id: primaryMarketEvent?.id,
        context: {
          ticker,
          orderbook: orderBook,
          news: marketEvents,
          risk_context: {
            paper_trading_only: true,
            real_trading_enabled: false,
          },
        },
      });
    },
    onSuccess: (data) => {
      setActionNotice(null);
      setWorkflowIds({ workflowId: data.workflow_id, marketEventId: data.market_event_id ?? undefined, hypothesisId: data.id });
      setLatestHypothesis(data);
      showToast({
        variant: "success",
        message: workflowMessage(i18n.language, `交易假设已生成：${data.id}`, `Hypothesis generated: ${data.id}`),
      });
      navigate(`/agent-lab/${data.id}`);
    },
    onError: (error) => {
      showToast({ variant: "error", message: errorMessage(error) });
    },
  });

  const createBacktestMutation = useMutation({
    mutationFn: () => {
      const currentHypothesisId = params.hypothesisId ?? hypothesisId;
      if (!currentHypothesisId) {
        throw new ApiError(
          workflowMessage(i18n.language, "请先生成交易假设，再发送至回测。", "Generate a hypothesis before sending it to backtest."),
          "MISSING_HYPOTHESIS",
        );
      }
      return createBacktest({
        hypothesis_id: currentHypothesisId,
        symbol: activeSymbol,
        timeframe: activeTimeframe,
        ...sixMonthsAgoRange(),
        initial_capital: 10000,
      });
    },
    onSuccess: (data) => {
      setActionNotice(null);
      setWorkflowIds({ workflowId: data.workflow_id, backtestId: data.id, hypothesisId: data.hypothesis_id });
      setLatestBacktest(data);
      showToast({
        variant: "success",
        message: workflowMessage(i18n.language, `回测已创建：${data.id}`, `Backtest created: ${data.id}`),
      });
      navigate(`/backtest/${data.id}`);
    },
    onError: (error) => {
      showToast({ variant: "error", message: errorMessage(error) });
    },
  });

  const runRiskCheckMutation = useMutation({
    mutationFn: () => {
      const currentHypothesisId = params.hypothesisId ?? hypothesisId;
      const currentBacktestId = params.backtestId ?? backtestId;
      if (!currentHypothesisId) {
        throw new ApiError(
          workflowMessage(i18n.language, "请先生成交易假设，再运行风控检查。", "Generate a hypothesis before running risk checks."),
          "MISSING_HYPOTHESIS",
        );
      }
      return runRiskCheck({
        hypothesis_id: currentHypothesisId,
        backtest_id: currentBacktestId,
        account_equity: 10000,
        risk_per_trade: 0.011,
        position_size: tradeLevels.quantity,
        entry_price: tradeLevels.entryPrice,
        stop_loss: tradeLevels.stopLoss,
        take_profit: tradeLevels.takeProfit,
      });
    },
    onSuccess: (data) => {
      setActionNotice(null);
      setWorkflowIds({ workflowId: data.workflow_id, riskCheckId: data.id, hypothesisId: data.hypothesis_id, backtestId: data.backtest_id ?? backtestId });
      setLatestRiskCheck(data);
      setLastRiskBlockReason(data.decision === "BLOCK" ? data.block_reasons.join("; ") : undefined);
      showToast({
        variant: data.decision === "BLOCK" ? "warning" : "success",
        message: workflowMessage(i18n.language, `风控检查完成：${data.decision}`, `Risk check completed: ${data.decision}`),
      });
      navigate(`/risk-firewall/${data.id}`);
    },
    onError: (error) => {
      showToast({ variant: "error", message: errorMessage(error) });
    },
  });

  const createPaperOrderMutation = useMutation({
    mutationFn: () => {
      const currentHypothesisId = params.hypothesisId ?? hypothesisId;
      const currentRiskCheckId = params.riskCheckId ?? riskCheckId;
      if (!currentHypothesisId || !currentRiskCheckId) {
        throw new ApiError(
          workflowMessage(i18n.language, "请先完成交易假设和风控检查，再创建模拟订单。", "Complete hypothesis and risk check before creating a paper order."),
          "MISSING_RISK_CHECK",
        );
      }
      return createPaperOrder({
        hypothesis_id: currentHypothesisId,
        backtest_id: params.backtestId ?? backtestId,
        risk_check_id: currentRiskCheckId,
        symbol: activeSymbol,
        side: "buy",
        order_type: "limit",
        price: tradeLevels.entryPrice,
        quantity: tradeLevels.quantity,
        stop_loss: tradeLevels.stopLoss,
        take_profit: tradeLevels.takeProfit,
      });
    },
    onSuccess: (data) => {
      setActionNotice(null);
      setLastRiskBlockReason(undefined);
      setWorkflowIds({ workflowId: data.workflow_id, paperOrderId: data.id, riskCheckId: data.risk_check_id });
      setLatestPaperOrder(data);
      showToast({
        variant: "success",
        message: workflowMessage(i18n.language, `模拟订单已创建：${data.id}`, `Paper order created: ${data.id}`),
      });
      navigate(`/paper-execution/${data.id}`);
    },
    onError: (error) => {
      const message = errorMessage(error);
      if (error instanceof ApiError && error.code === "RISK_BLOCKED") {
        setLastRiskBlockReason(message);
      }
      showToast({ variant: "error", message });
    },
  });

  const createAuditReportMutation = useMutation({
    mutationFn: () => {
      const currentHypothesisId = params.hypothesisId ?? hypothesisId;
      if (!currentHypothesisId) {
        throw new ApiError(
          workflowMessage(i18n.language, "请先生成交易假设，再生成审计报告。", "Generate a hypothesis before creating an audit report."),
          "MISSING_HYPOTHESIS",
        );
      }
      return createAuditReport({
        hypothesis_id: currentHypothesisId,
        backtest_id: params.backtestId ?? backtestId,
        risk_check_id: params.riskCheckId ?? riskCheckId,
        paper_order_id: params.paperOrderId ?? paperOrderId,
      });
    },
    onSuccess: (data) => {
      setActionNotice(null);
      setWorkflowIds({ workflowId: data.workflow_id, auditReportId: data.id });
      setLatestAuditReport(data);
      showToast({
        variant: "success",
        message: workflowMessage(i18n.language, `审计报告已生成：${data.id}`, `Audit report generated: ${data.id}`),
      });
      navigate(`/audit-reports/${data.id}`);
    },
    onError: (error) => {
      showToast({ variant: "error", message: errorMessage(error) });
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: () =>
      saveSettings({
        default_symbol: activeSymbol,
        default_timeframe: activeTimeframe,
        demo_mode: false,
        default_ai_provider: "deepseek",
        paper_trading_enabled: true,
        real_trading_enabled: false,
        language,
        settings_json: {},
      }),
    onSuccess: (data) => {
      setActionNotice(null);
      showToast({
        variant: "success",
        message: workflowMessage(i18n.language, `设置已保存：${data.id}`, `Settings saved: ${data.id}`),
      });
    },
    onError: (error) => {
      showToast({ variant: "error", message: errorMessage(error) });
    },
  });

  const headerPending =
    generateHypothesisMutation.isPending ||
    createBacktestMutation.isPending ||
    runRiskCheckMutation.isPending ||
    createPaperOrderMutation.isPending ||
    createAuditReportMutation.isPending ||
    saveSettingsMutation.isPending;
  const isRiskBlocked = latestRiskCheck?.decision === "BLOCK";

  const headerLabel = (() => {
    if (generateHypothesisMutation.isPending) return t("loadingStates.generating");
    if (createBacktestMutation.isPending) return t("loadingStates.backtesting");
    if (runRiskCheckMutation.isPending) return t("loadingStates.riskChecking");
    if (createPaperOrderMutation.isPending) return t("loadingStates.creatingOrder");
    if (createAuditReportMutation.isPending) return workflowMessage(i18n.language, "正在生成审计报告...", "Generating Audit Report...");
    if (saveSettingsMutation.isPending) return workflowMessage(i18n.language, "正在保存设置...", "Saving Settings...");
    return t(headerCtaKey);
  })();

  const handleHeaderAction = () => {
    if (route.id === "commandCenter") {
      navigate("/market");
      return;
    }

    if (route.id === "marketMonitor") {
      generateHypothesisMutation.mutate();
      return;
    }
    if (route.id === "agentLab") {
      createBacktestMutation.mutate();
      return;
    }
    if (route.id === "backtestStudio") {
      runRiskCheckMutation.mutate();
      return;
    }
    if (route.id === "riskFirewall") {
      createPaperOrderMutation.mutate();
      return;
    }
    if (route.id === "paperExecution" || route.id === "auditReports") {
      createAuditReportMutation.mutate();
      return;
    }
    if (route.id === "settings") {
      saveSettingsMutation.mutate();
      return;
    }

    setActionNotice(t("feedback.roadmapPlanned"));
    showToast({ variant: "info", message: t("feedback.roadmapPlanned") });
  };

  return (
    <div className={isMarketMonitor ? "page-workspace page-workspace--market" : "page-workspace"}>
      {!isMarketMonitor ? (
        <header className="page-header">
          <div className="page-header__title-group">
            <div className="page-kicker">
              <RouteIcon size={15} aria-hidden="true" />
              <span>{t(getModuleKey(route.id))}</span>
            </div>
            <h1>{t(route.titleKey)}</h1>
            <p>{t(route.summaryKey)}</p>
          </div>
          <button className="primary-action" type="button" disabled={headerPending || (isRiskFirewall && isRiskBlocked)} onClick={handleHeaderAction}>
            <span>{headerLabel}</span>
            <ArrowRight size={15} aria-hidden="true" />
          </button>
        </header>
      ) : null}

      {actionNotice ? (
        <div className="action-feedback" role="status">
          {actionNotice}
        </div>
      ) : null}

      {!isMarketMonitor ? (
        <section className="safety-ribbon" aria-label={t("status.safetyMode")}>
          <StatusPill variant="info">{t("status.marketDataPublic")}</StatusPill>
          <StatusPill variant="success">{t("marketLive.status.live")}</StatusPill>
          <StatusPill variant="info">{t("status.paperTradingOnly")}</StatusPill>
          <StatusPill variant="danger">{t("status.liveTradingDisabled")}</StatusPill>
          <span>{t("status.noRealFunds")}</span>
        </section>
      ) : null}

      {isCommandCenter ? (
        <CommandCenterContent />
      ) : isMarketMonitor ? (
        <MarketMonitorContent onGenerateHypothesis={() => generateHypothesisMutation.mutate()} isGeneratingHypothesis={generateHypothesisMutation.isPending} />
      ) : isAgentLab ? (
        <StructuredAgentLabContent />
      ) : isBacktestStudio ? (
        <BacktestStudioContent backtest={latestBacktest} />
      ) : isRiskFirewall ? (
        <RiskFirewallContent
          riskCheck={latestRiskCheck}
          onSendToPaperExecution={() => createPaperOrderMutation.mutate()}
          isSendingPaperOrder={createPaperOrderMutation.isPending}
        />
      ) : isPaperExecution ? (
        <PaperExecutionContent
          paperOrder={latestPaperOrder}
          riskCheck={latestRiskCheck}
          blockReason={lastRiskBlockReason}
          onExecutePaperTrade={() => createPaperOrderMutation.mutate()}
          isCreatingPaperOrder={createPaperOrderMutation.isPending}
          canExecutePaperOrder={Boolean(riskCheckId) && !isRiskBlocked}
          disabledReason={
            isRiskBlocked
              ? latestRiskCheck?.block_reasons.join("; ") || workflowMessage(i18n.language, "风控 BLOCK，禁止模拟执行。", "Risk BLOCK prevents paper execution.")
              : riskCheckId
                ? undefined
                : workflowMessage(i18n.language, "请先完成风控检查。", "Run a risk check first.")
          }
        />
      ) : isAuditReports ? (
        <AuditReportsContent
          auditReport={latestAuditReport}
          onGenerateAuditReport={() => createAuditReportMutation.mutate()}
          isGeneratingAuditReport={createAuditReportMutation.isPending}
          canGenerateAuditReport={Boolean(hypothesisId)}
          disabledReason={hypothesisId ? undefined : workflowMessage(i18n.language, "请先生成交易假设。", "Generate a hypothesis first.")}
        />
      ) : isSettings ? (
        <SettingsContent />
      ) : (
        <section className="workspace-grid">
          {panels.map((panel, index) => {
            const PanelIcon = panelIcons[index % panelIcons.length];
            return (
              <article className="terminal-panel" key={panel.titleKey}>
                <header>
                  <span className="terminal-panel__heading">
                    <span className="terminal-panel__icon">
                      <PanelIcon size={15} aria-hidden="true" />
                    </span>
                    <h2>{t(panel.titleKey)}</h2>
                  </span>
                  {panel.statusKey ? (
                    <StatusPill variant={panel.statusVariant}>{t(panel.statusKey)}</StatusPill>
                  ) : null}
                </header>
                <strong>{t(panel.valueKey)}</strong>
                <p>{t(panel.metaKey)}</p>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}

type AgentLabContentProps = {
  hypothesis?: Hypothesis;
  onSendToBacktest: () => void;
  isSendingBacktest: boolean;
};

function AgentLabContent({ hypothesis, onSendToBacktest, isSendingBacktest }: AgentLabContentProps) {
  const { t } = useTranslation();
  const activeSymbol = useMarketDataStore((state) => state.activeSymbol);
  const activeTimeframe = useMarketDataStore((state) => state.activeTimeframe);
  const connectionStatus = useMarketDataStore((state) => state.connectionStatus);
  const dataSource = useMarketDataStore((state) => state.dataSource);
  const generatedFields = hypothesis
    ? [
        ["Provider", hypothesis.provider],
        ["Model", hypothesis.model],
        ["Direction", hypothesis.direction],
        ["Confidence", `${hypothesis.confidence}/100`],
        ["Feasibility", `${hypothesis.feasibility}/100`],
        ["Risk", `${hypothesis.risk}/100`],
        ["Entry", hypothesis.entry_condition],
        ["Invalid", hypothesis.invalid_condition],
      ]
    : [];

  return (
    <section className="agent-lab" aria-label={t("agentLab.aria")}>
      <div className="agent-lab__brief">
        <div className="research-brief">
          <span className="research-brief__eyebrow">{t("agentLab.sections.researchTicket")}</span>
          <h2>{hypothesis ? hypothesis.summary : t("feedback.backendRequiredGenerateHypothesis")}</h2>
          <p>{hypothesis ? `${hypothesis.provider}/${hypothesis.model}` : t("feedback.dataSourceCheckLocal")}</p>
          <div className="research-brief__meta" aria-label={t("agentLab.sections.briefMeta")}>
            <span>{activeSymbol}</span>
            <span>HTX</span>
            <span>{activeTimeframe}</span>
            <StatusPill variant={connectionStatus === "live" ? "success" : "danger"}>{connectionStatus}</StatusPill>
          </div>
        </div>

        <div className="agent-lab__metrics">
          {[
            { id: "market", title: "Market source", value: dataSource, meta: connectionStatus, variant: connectionStatus === "live" ? "success" : "danger" },
            { id: "ai", title: "AI provider", value: hypothesis?.provider ?? "disconnected", meta: hypothesis?.model ?? "No generated hypothesis", variant: hypothesis ? "success" : "warning" },
            { id: "risk", title: "AI confidence", value: hypothesis ? `${hypothesis.confidence}/100` : "--", meta: hypothesis ? "Real provider response" : "Unavailable", variant: hypothesis ? "info" : "warning" },
          ].map((metric, index) => {
            const MetricIcon = labMetricIcons[index % labMetricIcons.length];
            return (
              <article className="lab-metric" key={metric.id}>
                <span className={`lab-metric__icon command-state--${metric.variant}`}>
                  <MetricIcon size={15} aria-hidden="true" />
                </span>
                <div>
                  <h3>{metric.title}</h3>
                  <strong>{metric.value}</strong>
                  <p>{metric.meta}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="agent-lab__grid">
        <section className="lab-panel lab-panel--context" aria-labelledby="lab-context">
          <div className="lab-panel__heading">
            <span>
              <Database size={15} aria-hidden="true" />
              {t("agentLab.sections.context")}
            </span>
            <StatusPill variant="info">{t("agentLab.status.structured")}</StatusPill>
          </div>
          <div className="context-stack">
            <article className={`context-row context-row--${connectionStatus === "live" ? "success" : "danger"}`}>
              <span>Market</span>
              <strong>{activeSymbol}</strong>
              <p>{connectionStatus === "live" ? `Live HTX WebSocket via ${dataSource}` : "Market stream is not connected."}</p>
            </article>
            <article className={`context-row context-row--${hypothesis ? "success" : "warning"}`}>
              <span>Hypothesis</span>
              <strong>{hypothesis?.id ?? "disconnected"}</strong>
              <p>{hypothesis ? "Loaded from backend AI provider response." : "No backend hypothesis is connected yet."}</p>
            </article>
          </div>
        </section>

        <section className="lab-panel lab-panel--evidence" aria-labelledby="lab-evidence">
          <div className="lab-panel__heading">
            <span id="lab-evidence">
              <ListChecks size={15} aria-hidden="true" />
              {t("agentLab.sections.evidenceMatrix")}
            </span>
            <StatusPill variant="success">{t("agentLab.status.evidenceMode")}</StatusPill>
          </div>
          <div className="evidence-table">
            <div className="evidence-table__header">
              <span>{t("agentLab.labels.signal")}</span>
              <span>{t("agentLab.labels.source")}</span>
              <span>{t("agentLab.labels.weight")}</span>
            </div>
            {hypothesis ? (
              <article className="evidence-row evidence-row--success">
                <div>
                  <strong>{hypothesis.summary}</strong>
                  <p>{hypothesis.reasons.join("; ") || "No reasons returned."}</p>
                </div>
                <span>{hypothesis.provider}</span>
                <StatusPill variant="success">{hypothesis.confidence}/100</StatusPill>
              </article>
            ) : (
              <article className="evidence-row evidence-row--warning">
                <div>
                  <strong>Disconnected</strong>
                  <p>No real AI evidence is available until a backend provider returns a hypothesis.</p>
                </div>
                <span>backend</span>
                <StatusPill variant="warning">--</StatusPill>
              </article>
            )}
          </div>
        </section>

        <section className="lab-panel lab-panel--reasoning" aria-labelledby="lab-reasoning">
          <div className="lab-panel__heading">
            <span id="lab-reasoning">
              <Brain size={15} aria-hidden="true" />
              {t("agentLab.sections.reasoningTrace")}
            </span>
            <StatusPill variant="warning">{t("agentLab.status.noChat")}</StatusPill>
          </div>
          <div className="reasoning-rail">
            {(hypothesis?.reasons.length ? hypothesis.reasons : ["No connected AI reasoning yet."]).map((reason, index) => (
              <article className={`reasoning-step reasoning-step--${hypothesis ? "success" : "warning"}`} key={`${reason}-${index}`}>
                <span className="reasoning-step__index">{index + 1}</span>
                <div>
                  <header>
                    <h3>{hypothesis ? "Provider reason" : "Disconnected"}</h3>
                    <StatusPill variant={hypothesis ? "success" : "warning"}>{hypothesis ? hypothesis.provider : "unavailable"}</StatusPill>
                  </header>
                  <p>{reason}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="lab-panel lab-panel--hypotheses" aria-labelledby="lab-hypotheses">
          <div className="lab-panel__heading">
            <span id="lab-hypotheses">
              <FlaskConical size={15} aria-hidden="true" />
              {t("agentLab.sections.hypothesisQueue")}
            </span>
            <StatusPill variant={hypothesis ? "success" : "warning"}>{hypothesis ? "connected" : "disconnected"}</StatusPill>
          </div>
          <div className="hypothesis-stack">
            {hypothesis ? (
              <article className="hypothesis-card hypothesis-card--success">
                <header>
                  <span>AI</span>
                  <div>
                    <h3>{hypothesis.summary}</h3>
                    <p>
                      {hypothesis.symbol} - {hypothesis.timeframe} - {hypothesis.provider}/{hypothesis.model}
                    </p>
                  </div>
                  <strong>{hypothesis.confidence}</strong>
                </header>
                <dl>
                  {generatedFields.map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="ai-result-lists">
                  <strong>Reasons</strong>
                  <ul>
                    {hypothesis.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                  <strong>Warnings</strong>
                  <ul>
                    {hypothesis.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              </article>
            ) : (
              <article className="hypothesis-card hypothesis-card--warning">
                <header>
                  <span>--</span>
                  <div>
                    <h3>Disconnected</h3>
                    <p>No real hypothesis has been generated by a configured AI provider.</p>
                  </div>
                  <strong>--</strong>
                </header>
              </article>
            )}
          </div>
        </section>

        <section className="lab-panel lab-panel--rules" aria-labelledby="lab-rules">
          <div className="lab-panel__heading">
            <span id="lab-rules">
              <SlidersHorizontal size={15} aria-hidden="true" />
              {t("agentLab.sections.rulePacket")}
            </span>
            <button className="secondary-action" type="button" disabled={isSendingBacktest} onClick={onSendToBacktest}>
              <span>{isSendingBacktest ? t("loadingStates.backtesting") : t("actions.sendToBacktest")}</span>
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>
          <div className="rule-packet">
            <div className="rule-packet__row">
              <span>Backtest</span>
              <strong>disconnected</strong>
              <StatusPill variant="warning">unavailable</StatusPill>
            </div>
            <div className="rule-packet__row">
              <span>Market data</span>
              <strong>{connectionStatus}</strong>
              <StatusPill variant={connectionStatus === "live" ? "success" : "danger"}>{dataSource}</StatusPill>
            </div>
          </div>
        </section>

        <section className="lab-panel lab-panel--handoff" aria-labelledby="lab-handoff">
          <div className="lab-panel__heading">
            <span id="lab-handoff">
              <GitBranch size={15} aria-hidden="true" />
              {t("agentLab.sections.handoff")}
            </span>
            <StatusPill variant="info">{t("agentLab.status.auditReady")}</StatusPill>
          </div>
          <div className="handoff-list">
            {[
              { title: "Hypothesis", meta: hypothesis?.id ?? "not connected", complete: Boolean(hypothesis) },
              { title: "Backtest", meta: "not connected", complete: false },
              { title: "Risk check", meta: "not connected", complete: false },
            ].map((item) => (
              <article className={item.complete ? "handoff-item is-complete" : "handoff-item"} key={item.title}>
                <CheckCircle2 size={16} aria-hidden="true" />
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.meta}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
