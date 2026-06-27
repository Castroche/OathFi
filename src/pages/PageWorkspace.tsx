import {
  ArrowRight,
  Cpu,
  Database,
  ShieldAlert,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../api/client";
import { generateHypothesis } from "../api/hypotheses";
import { rejectAgentHypothesis } from "../api/agent";
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
  const paperOrderRiskCheckQuery = useQuery({
    queryKey: ["risk-check", paperOrderQuery.data?.risk_check_id],
    queryFn: ({ signal }) => fetchRiskCheck(paperOrderQuery.data?.risk_check_id as string, signal),
    enabled: Boolean(paperOrderQuery.data?.risk_check_id),
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
    if (paperOrderRiskCheckQuery.data) {
      setLatestRiskCheck(paperOrderRiskCheckQuery.data);
      setWorkflowIds({
        workflowId: paperOrderRiskCheckQuery.data.workflow_id,
        riskCheckId: paperOrderRiskCheckQuery.data.id,
        backtestId: paperOrderRiskCheckQuery.data.backtest_id ?? backtestId,
        hypothesisId: paperOrderRiskCheckQuery.data.hypothesis_id,
      });
    }
  }, [backtestId, paperOrderRiskCheckQuery.data, setLatestRiskCheck, setWorkflowIds]);

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
        entry_price: tradeLevels.entryPrice,
        stop_loss: tradeLevels.stopLoss,
        take_profit: tradeLevels.takeProfit,
      });
    },
    onSuccess: (data) => {
      setActionNotice(null);
      setWorkflowIds({ workflowId: data.workflow_id, riskCheckId: data.id, hypothesisId: data.hypothesis_id, backtestId: data.backtest_id ?? backtestId });
      setLatestRiskCheck(data);
      setLastRiskBlockReason(data.decision === "BLOCK" || data.decision === "REJECTED" ? data.block_reasons.join("; ") : undefined);
      showToast({
        variant: data.decision === "BLOCK" || data.decision === "REJECTED" ? "warning" : "success",
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
        price: latestRiskCheck?.entry_price ?? tradeLevels.entryPrice,
        quantity: latestRiskCheck?.position_size ?? tradeLevels.quantity,
        stop_loss: latestRiskCheck?.stop_loss ?? tradeLevels.stopLoss,
        take_profit: latestRiskCheck?.take_profit ?? tradeLevels.takeProfit,
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

  const rejectStrategyMutation = useMutation({
    mutationFn: () => {
      const currentHypothesisId = latestRiskCheck?.hypothesis_id ?? params.hypothesisId ?? hypothesisId;
      if (!currentHypothesisId) {
        throw new ApiError(
          workflowMessage(i18n.language, "璇峰厛閫夋嫨涓€涓氦鏄撳亣璁俱€?", "Select a hypothesis before rejecting the strategy."),
          "MISSING_HYPOTHESIS",
        );
      }
      return rejectAgentHypothesis(currentHypothesisId);
    },
    onSuccess: (data) => {
      setActionNotice(null);
      showToast({
        variant: "warning",
        message: workflowMessage(i18n.language, `绛栫暐宸叉嫆缁濓細${data.id}`, `Strategy rejected: ${data.id}`),
      });
      navigate(`/agent-lab/${data.id}`);
    },
    onError: (error) => {
      showToast({ variant: "error", message: errorMessage(error) });
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
    rejectStrategyMutation.isPending ||
    createAuditReportMutation.isPending ||
    saveSettingsMutation.isPending;
  const isRiskBlocked = latestRiskCheck?.decision === "BLOCK" || latestRiskCheck?.decision === "REJECTED";

  const headerLabel = (() => {
    if (generateHypothesisMutation.isPending) return t("loadingStates.generating");
    if (createBacktestMutation.isPending) return t("loadingStates.backtesting");
    if (runRiskCheckMutation.isPending) return t("loadingStates.riskChecking");
    if (createPaperOrderMutation.isPending) return t("loadingStates.creatingOrder");
    if (createAuditReportMutation.isPending) return workflowMessage(i18n.language, "正在生成审计报告...", "Generating Audit Report...");
    if (saveSettingsMutation.isPending) return workflowMessage(i18n.language, "正在保存设置...", "Saving Settings...");
    if (isRiskFirewall && !latestRiskCheck) return t("riskFirewall.empty.disconnectedTitle");
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
          <button className="primary-action" type="button" disabled={headerPending || (isRiskFirewall && (!latestRiskCheck || isRiskBlocked))} onClick={handleHeaderAction}>
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
        <BacktestStudioContent
          backtest={latestBacktest}
          onSendToRiskFirewall={() => runRiskCheckMutation.mutate()}
          isSendingToRiskFirewall={runRiskCheckMutation.isPending}
        />
      ) : isRiskFirewall ? (
        <RiskFirewallContent
          riskCheck={latestRiskCheck}
          onSendToPaperExecution={() => createPaperOrderMutation.mutate()}
          onRejectStrategy={() => rejectStrategyMutation.mutate()}
          onReturnToAgentLab={() => {
            const targetHypothesisId = latestRiskCheck?.hypothesis_id ?? hypothesisId;
            navigate(targetHypothesisId ? `/agent-lab/${targetHypothesisId}` : "/agent-lab");
          }}
          isSendingPaperOrder={createPaperOrderMutation.isPending}
          isRejectingStrategy={rejectStrategyMutation.isPending}
        />
      ) : isPaperExecution ? (
        <PaperExecutionContent
          paperOrder={latestPaperOrder}
          riskCheck={latestRiskCheck}
          blockReason={lastRiskBlockReason}
          onExecutePaperTrade={() => createPaperOrderMutation.mutate()}
          onReturnToAgentLab={() => {
            const targetHypothesisId = latestPaperOrder?.hypothesis_id ?? latestRiskCheck?.hypothesis_id ?? hypothesisId;
            navigate(targetHypothesisId ? `/agent-lab/${targetHypothesisId}` : "/agent-lab");
          }}
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
