import {
  ArrowRight,
  Cpu,
  Database,
  ShieldAlert,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../api/client";
import { fetchAgentHypothesis, generateAgentHypotheses, rejectAgentHypothesis, type AgentHypothesis } from "../api/agent";
import { createBacktest, fetchBacktest } from "../api/backtests";
import { fetchRiskCheck, runRiskCheck } from "../api/risk";
import {
  cancelPaperOrder,
  createPaperOrder,
  executePaperOrder,
  fetchPaperAccount,
  fetchPaperExecutionLogs,
  fetchPaperOrder,
  fetchPaperPositions,
} from "../api/paperOrders";
import { createAuditReport, createAuditReportFromPaperOrder, fetchAuditReport, fetchAuditReports } from "../api/auditReports";
import { fetchSettings, saveSettings, settingsToUpdate } from "../api/settings";
import { detectMarketEvents, fetchMarketEvents } from "../api/market";
import type { AppRoute } from "../lib/routes";
import { pagePanels } from "../lib/pagePanels";
import { decisionLabel, riskRuleMessage } from "../lib/displayLabels";
import { StatusPill } from "../components/common/StatusPill";
import { AuditReportsContent } from "../components/audit/AuditReportsContent";
import { BacktestStudioContent } from "../components/backtest/BacktestStudioContent";
import { CommandCenterContent } from "../components/dashboard/CommandCenterContent";
import { HtxEcosystemContent } from "../components/ecosystem/HtxEcosystemContent";
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

function extractTradeContract(hypothesis?: AgentHypothesis) {
  if (!hypothesis) return null;
  const strategy = hypothesis.structured_hypothesis?.executable_strategy;
  const entryPlan = hypothesis.structured_hypothesis?.entry_plan;
  const side = strategy?.side ?? hypothesis.direction;
  const entryPrice = strategy?.entry?.price ?? entryPlan?.trigger_price ?? null;
  const stopLoss = strategy?.exit?.stop_loss ?? entryPlan?.stop_loss ?? null;
  const takeProfit = strategy?.exit?.take_profit_1 ?? entryPlan?.take_profit_1 ?? null;
  const tradeable = ["long", "short"].includes(side) && entryPrice != null && stopLoss != null && takeProfit != null;
  return {
    hypothesisId: hypothesis.id,
    tradeable,
    side: side === "short" ? "sell" : "buy",
    direction: side,
    entryPrice: Number(entryPrice),
    stopLoss: Number(stopLoss),
    takeProfit: Number(takeProfit),
  };
}

export function PageWorkspace({ route }: PageWorkspaceProps) {
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
  const latestAgentHypothesis = useAppStore((state) => state.latestAgentHypothesis);
  const latestBacktest = useAppStore((state) => state.latestBacktest);
  const latestRiskCheck = useAppStore((state) => state.latestRiskCheck);
  const latestPaperOrder = useAppStore((state) => state.latestPaperOrder);
  const latestAuditReport = useAppStore((state) => state.latestAuditReport);
  const setLatestAgentHypothesis = useAppStore((state) => state.setLatestAgentHypothesis);
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
  const isHtxEcosystem = route.id === "htxEcosystem";
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
  const paperAccountQuery = useQuery({
    queryKey: ["paper-account"],
    queryFn: ({ signal }) => fetchPaperAccount(signal),
    enabled: isPaperExecution,
  });
  const paperPositionsQuery = useQuery({
    queryKey: ["paper-positions"],
    queryFn: ({ signal }) => fetchPaperPositions(signal),
    enabled: isPaperExecution,
  });
  const paperExecutionLogsQuery = useQuery({
    queryKey: ["paper-execution-logs", params.paperOrderId, paperOrderQuery.data?.hypothesis_id],
    queryFn: ({ signal }) =>
      fetchPaperExecutionLogs(
        {
          paperOrderId: params.paperOrderId,
          hypothesisId: params.paperOrderId ? undefined : paperOrderQuery.data?.hypothesis_id,
        },
        signal,
      ),
    enabled: isPaperExecution,
  });
  const paperOrderRiskCheckQuery = useQuery({
    queryKey: ["risk-check", paperOrderQuery.data?.risk_check_id],
    queryFn: ({ signal }) => fetchRiskCheck(paperOrderQuery.data?.risk_check_id as string, signal),
    enabled: Boolean(paperOrderQuery.data?.risk_check_id),
  });
  const agentHypothesisLookupId =
    params.hypothesisId ??
    backtestQuery.data?.hypothesis_id ??
    riskCheckQuery.data?.hypothesis_id ??
    paperOrderQuery.data?.hypothesis_id ??
    paperOrderRiskCheckQuery.data?.hypothesis_id ??
    latestRiskCheck?.hypothesis_id ??
    latestPaperOrder?.hypothesis_id ??
    hypothesisId;
  const agentHypothesisQuery = useQuery({
    queryKey: ["agent-hypothesis", agentHypothesisLookupId],
    queryFn: ({ signal }) => fetchAgentHypothesis(agentHypothesisLookupId as string, signal),
    enabled: Boolean(agentHypothesisLookupId) && latestAgentHypothesis?.id !== agentHypothesisLookupId,
  });
  const auditReportsQuery = useQuery({
    queryKey: ["audit-reports"],
    queryFn: ({ signal }) => fetchAuditReports(signal),
    enabled: isAuditReports,
  });
  const selectedAuditReportId = params.auditReportId ?? auditReportsQuery.data?.[0]?.id ?? latestAuditReport?.id;
  const auditReportQuery = useQuery({
    queryKey: ["audit-report", selectedAuditReportId],
    queryFn: ({ signal }) => fetchAuditReport(selectedAuditReportId as string, signal),
    enabled: isAuditReports && Boolean(selectedAuditReportId),
  });
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: ({ signal }) => fetchSettings(signal),
    retry: false,
  });
  const selectedAuditReport =
    auditReportQuery.data?.id === selectedAuditReportId
      ? auditReportQuery.data
      : latestAuditReport?.id === selectedAuditReportId
        ? latestAuditReport
        : undefined;

  useEffect(() => {
    if (agentHypothesisQuery.data) {
      setLatestAgentHypothesis(agentHypothesisQuery.data);
      setWorkflowIds({
        workflowId: agentHypothesisQuery.data.workflow_id,
        hypothesisId: agentHypothesisQuery.data.id,
        marketEventId: agentHypothesisQuery.data.market_event_id ?? undefined,
        backtestId: agentHypothesisQuery.data.latest_backtest_result_id ?? backtestId,
        riskCheckId: agentHypothesisQuery.data.latest_risk_check_id ?? riskCheckId,
        paperOrderId: agentHypothesisQuery.data.latest_paper_order_id ?? paperOrderId,
      });
    }
  }, [agentHypothesisQuery.data, backtestId, paperOrderId, riskCheckId, setLatestAgentHypothesis, setWorkflowIds]);

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

  const agentTradeContract = useMemo(() => extractTradeContract(latestAgentHypothesis), [latestAgentHypothesis]);

  const generateHypothesisMutation = useMutation({
    mutationFn: async () => {
      let marketEvents = await fetchMarketEvents(activeSymbol, 5);
      if (marketEvents.length === 0) {
        marketEvents = await detectMarketEvents(activeSymbol, activeTimeframe);
      }
      const primaryMarketEvent = marketEvents[0];
      return generateAgentHypotheses({
        symbol: activeSymbol,
        timeframe: activeTimeframe,
        market_event_id: primaryMarketEvent?.id,
        language: i18n.language.toLowerCase().startsWith("zh") ? "zh-CN" : "en",
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
    onSuccess: (result) => {
      const data = result.hypotheses[0];
      if (!data) {
        showToast({ variant: "error", message: workflowMessage(i18n.language, "Agent 未返回可保存的交易假设。", "Agent did not return a stored hypothesis.") });
        return;
      }
      setActionNotice(null);
      setWorkflowIds({ workflowId: data.workflow_id, marketEventId: data.market_event_id ?? undefined, hypothesisId: data.id });
      setLatestAgentHypothesis(data);
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
      if (!agentTradeContract || agentTradeContract.hypothesisId !== currentHypothesisId || !agentTradeContract.tradeable) {
        throw new ApiError(
          workflowMessage(i18n.language, "不交易/中性或缺少可执行策略的假设不能进入回测。", "No-trade, neutral, or incomplete hypotheses cannot enter backtest."),
          "HYPOTHESIS_NOT_TRADEABLE",
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
      if (!agentTradeContract || agentTradeContract.hypothesisId !== currentHypothesisId || !agentTradeContract.tradeable) {
        throw new ApiError(
          workflowMessage(i18n.language, "当前假设不可交易或缺少可执行策略，不能运行风控检查。", "The current hypothesis is not tradeable or has no executable strategy."),
          "HYPOTHESIS_NOT_TRADEABLE",
        );
      }
      return runRiskCheck({
        hypothesis_id: currentHypothesisId,
        backtest_id: currentBacktestId,
        entry_price: agentTradeContract.entryPrice,
        stop_loss: agentTradeContract.stopLoss,
        take_profit: agentTradeContract.takeProfit,
      });
    },
    onSuccess: (data) => {
      setActionNotice(null);
      setWorkflowIds({ workflowId: data.workflow_id, riskCheckId: data.id, hypothesisId: data.hypothesis_id, backtestId: data.backtest_id ?? backtestId });
      setLatestRiskCheck(data);
      setLastRiskBlockReason(data.decision === "BLOCK" || data.decision === "REJECTED" ? data.block_reasons.join("; ") : undefined);
      showToast({
        variant: data.decision === "BLOCK" || data.decision === "REJECTED" ? "warning" : "success",
        message: workflowMessage(i18n.language, `风控检查完成：${decisionLabel(t, data.decision)}`, `Risk check completed: ${decisionLabel(t, data.decision)}`),
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
      if (!agentTradeContract || agentTradeContract.hypothesisId !== currentHypothesisId || !agentTradeContract.tradeable) {
        throw new ApiError(
          workflowMessage(i18n.language, "不交易/中性或缺少可执行策略的假设不能创建模拟订单。", "No-trade, neutral, or incomplete hypotheses cannot create paper orders."),
          "HYPOTHESIS_NOT_TRADEABLE",
        );
      }
      if (!latestRiskCheck || latestRiskCheck.decision !== "APPROVED") {
        throw new ApiError(
          workflowMessage(i18n.language, "只有 APPROVED 风控结果可以创建模拟订单。", "Only APPROVED risk checks can create paper orders."),
          "RISK_NOT_APPROVED",
        );
      }
      return createPaperOrder({
        hypothesis_id: currentHypothesisId,
        backtest_id: params.backtestId ?? backtestId,
        risk_check_id: currentRiskCheckId,
        symbol: activeSymbol,
        side: agentTradeContract.side,
        order_type: "limit",
        price: latestRiskCheck.entry_price,
        quantity: latestRiskCheck.position_size,
        stop_loss: latestRiskCheck.stop_loss,
        take_profit: latestRiskCheck.take_profit,
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

  const executePaperOrderMutation = useMutation({
    mutationFn: () => {
      const currentPaperOrderId = params.paperOrderId ?? paperOrderId;
      if (!currentPaperOrderId) {
        throw new ApiError(
          workflowMessage(i18n.language, "请先创建模拟订单。", "Create a paper order before execution."),
          "MISSING_PAPER_ORDER",
        );
      }
      return executePaperOrder(currentPaperOrderId);
    },
    onSuccess: (data) => {
      setActionNotice(null);
      setLatestPaperOrder(data);
      setWorkflowIds({ workflowId: data.workflow_id, paperOrderId: data.id, riskCheckId: data.risk_check_id, hypothesisId: data.hypothesis_id });
      queryClient.invalidateQueries({ queryKey: ["paper-order", data.id] });
      queryClient.invalidateQueries({ queryKey: ["paper-account"] });
      queryClient.invalidateQueries({ queryKey: ["paper-positions"] });
      queryClient.invalidateQueries({ queryKey: ["paper-execution-logs"] });
      showToast({
        variant: "success",
        message: workflowMessage(i18n.language, `模拟订单已执行：${data.status}`, `Paper order executed: ${data.status}`),
      });
    },
    onError: (error) => {
      const message = errorMessage(error);
      if (error instanceof ApiError && error.code === "RISK_BLOCKED") {
        setLastRiskBlockReason(message);
      }
      showToast({ variant: "error", message });
    },
  });

  const cancelPaperOrderMutation = useMutation({
    mutationFn: () => {
      const currentPaperOrderId = params.paperOrderId ?? paperOrderId;
      if (!currentPaperOrderId) {
        throw new ApiError(
          workflowMessage(i18n.language, "请先创建模拟订单。", "Create a paper order before cancellation."),
          "MISSING_PAPER_ORDER",
        );
      }
      return cancelPaperOrder(currentPaperOrderId);
    },
    onSuccess: (data) => {
      setActionNotice(null);
      setLatestPaperOrder(data);
      setWorkflowIds({ workflowId: data.workflow_id, paperOrderId: data.id, riskCheckId: data.risk_check_id, hypothesisId: data.hypothesis_id });
      queryClient.invalidateQueries({ queryKey: ["paper-order", data.id] });
      queryClient.invalidateQueries({ queryKey: ["paper-execution-logs"] });
      showToast({
        variant: "success",
        message: workflowMessage(i18n.language, `模拟订单已取消：${data.id}`, `Paper order cancelled: ${data.id}`),
      });
    },
    onError: (error) => {
      showToast({ variant: "error", message: errorMessage(error) });
    },
  });

  const rejectStrategyMutation = useMutation({
    mutationFn: () => {
      const currentHypothesisId = latestRiskCheck?.hypothesis_id ?? params.hypothesisId ?? hypothesisId;
      if (!currentHypothesisId) {
        throw new ApiError(
          workflowMessage(i18n.language, "请先选择一个交易假设。", "Select a hypothesis before rejecting the strategy."),
          "MISSING_HYPOTHESIS",
        );
      }
      return rejectAgentHypothesis(currentHypothesisId);
    },
    onSuccess: (data) => {
      setActionNotice(null);
      showToast({
        variant: "warning",
        message: workflowMessage(i18n.language, `策略已拒绝：${data.id}`, `Strategy rejected: ${data.id}`),
      });
      navigate(`/agent-lab/${data.id}`);
    },
    onError: (error) => {
      showToast({ variant: "error", message: errorMessage(error) });
    },
  });

  const createAuditReportMutation = useMutation({
    mutationFn: () => {
      const currentPaperOrderId = params.paperOrderId ?? paperOrderId ?? latestPaperOrder?.id;
      if (currentPaperOrderId) {
        return createAuditReportFromPaperOrder(currentPaperOrderId);
      }
      const currentHypothesisId = params.hypothesisId ?? hypothesisId;
      if (!currentHypothesisId) {
        throw new ApiError(
          workflowMessage(i18n.language, "请先生成交易假设或模拟订单，再生成审计报告。", "Generate a hypothesis or paper order before creating an audit report."),
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
      queryClient.invalidateQueries({ queryKey: ["audit-reports"] });
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
    mutationFn: async () => {
      const current = settingsQuery.data ?? await fetchSettings();
      return saveSettings({
        ...settingsToUpdate(current),
        default_symbol: activeSymbol,
        default_timeframe: activeTimeframe,
        language,
        live_trading_enabled: false,
        real_trading_enabled: false,
      });
    },
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
    executePaperOrderMutation.isPending ||
    cancelPaperOrderMutation.isPending ||
    rejectStrategyMutation.isPending ||
    createAuditReportMutation.isPending ||
    saveSettingsMutation.isPending;
  const isRiskBlocked = latestRiskCheck?.decision === "BLOCK" || latestRiskCheck?.decision === "REJECTED";
  const headerDisabledReason = (() => {
    if (headerPending) return undefined;
    if (isAgentLab && hypothesisId && (!agentTradeContract || agentTradeContract.hypothesisId !== hypothesisId || !agentTradeContract.tradeable)) {
      return workflowMessage(i18n.language, "不交易假设不能进入回测。", "No-trade hypotheses cannot enter backtest.");
    }
    if (isBacktestStudio && (!agentTradeContract || !agentTradeContract.tradeable)) {
      return workflowMessage(i18n.language, "缺少可执行策略，不能运行风控检查。", "Missing executable strategy; risk check is disabled.");
    }
    if (isRiskFirewall) {
      if (!latestRiskCheck) return t("riskFirewall.empty.disconnectedTitle");
      if (latestRiskCheck.decision === "CONDITIONAL") {
        return workflowMessage(i18n.language, "需要调整策略，不能下单。", "Strategy adjustment is required; paper order is disabled.");
      }
      if (latestRiskCheck.decision !== "APPROVED") {
        return workflowMessage(i18n.language, "风控已拒绝，不能下单。", "Risk rejected this setup; paper order is disabled.");
      }
    }
    return undefined;
  })();

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

  const paperExecutionRiskStatus =
    latestRiskCheck?.decision ?? latestPaperOrder?.risk_check?.decision ?? latestPaperOrder?.risk_check?.status ?? latestPaperOrder?.risk_status;
  const isPaperExecutionBlocked =
    String(paperExecutionRiskStatus ?? "").toUpperCase() === "BLOCK" || String(paperExecutionRiskStatus ?? "").toUpperCase() === "REJECTED";
  const settingsPaperTradingEnabled = settingsQuery.data?.paper_trading_enabled ?? true;
  const settingsPaperExecutionOnly = settingsQuery.data?.paper_execution_only ?? true;
  const canExecuteCurrentPaperOrder = Boolean(
    settingsPaperTradingEnabled &&
      settingsPaperExecutionOnly &&
      latestPaperOrder?.id &&
      latestPaperOrder.status === "draft" &&
      latestPaperOrder.risk_check_id &&
      !isPaperExecutionBlocked,
  );
  const paperExecutionDisabledReason = (() => {
    if (!settingsPaperTradingEnabled) {
      return workflowMessage(i18n.language, "Settings 已关闭 Paper Trading，Paper Execution 当前不可用。", "Paper Trading is disabled in Settings, so Paper Execution is unavailable.");
    }
    if (!settingsPaperExecutionOnly) {
      return workflowMessage(i18n.language, "Settings 未启用 Paper Execution Only，Demo 执行保持禁用。", "Paper Execution Only is disabled in Settings, so demo execution is unavailable.");
    }
    if (isPaperExecutionBlocked) {
      return latestRiskCheck?.block_reasons.map((reason) => riskRuleMessage(t, reason)).join("; ") || workflowMessage(i18n.language, "风控拒绝，未创建模拟订单。", "Risk firewall rejected the setup; no paper order was created.");
    }
    return latestPaperOrder?.risk_check_id ? undefined : workflowMessage(i18n.language, "请先完成风控检查。", "Run a risk check first.");
  })();

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
          <button className="primary-action" type="button" title={headerDisabledReason} disabled={headerPending || Boolean(headerDisabledReason) || (isRiskFirewall && (!latestRiskCheck || isRiskBlocked))} onClick={handleHeaderAction}>
            <span>{headerLabel}</span>
            <ArrowRight size={15} aria-hidden="true" />
          </button>
        </header>
      ) : null}

      {actionNotice || headerDisabledReason ? (
        <div className="action-feedback" role="status">
          {actionNotice ?? headerDisabledReason}
        </div>
      ) : null}

      {!isMarketMonitor ? (
        <section className="safety-ribbon" aria-label={t("status.safetyMode")}>
          <StatusPill variant="info">{isSettings ? t("settings.status.publicOnly") : t("status.marketDataPublic")}</StatusPill>
          <StatusPill variant="success">{isSettings ? t("settings.status.connected") : t("marketLive.status.live")}</StatusPill>
          <StatusPill variant={settingsPaperTradingEnabled ? "info" : "warning"}>
            {settingsPaperTradingEnabled ? (isSettings ? t("settings.fields.paperTrading") : t("status.paperTradingOnly")) : t("settings.status.paperExecutionUnavailable")}
          </StatusPill>
          <StatusPill variant="danger">{isSettings ? t("settings.status.liveLocked") : t("status.liveTradingDisabled")}</StatusPill>
          <span>{isSettings ? t("settings.demo.realFundsDisabled") : t("status.noRealFunds")}</span>
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
          paperAccount={paperAccountQuery.data}
          paperPositions={paperPositionsQuery.data ?? []}
          executionLogs={paperExecutionLogsQuery.data ?? []}
          blockReason={lastRiskBlockReason}
          orderError={paperOrderQuery.error ? errorMessage(paperOrderQuery.error) : null}
          accountError={paperAccountQuery.error ? errorMessage(paperAccountQuery.error) : null}
          positionsError={paperPositionsQuery.error ? errorMessage(paperPositionsQuery.error) : null}
          logsError={paperExecutionLogsQuery.error ? errorMessage(paperExecutionLogsQuery.error) : null}
          isOrderLoading={paperOrderQuery.isLoading}
          isAccountLoading={paperAccountQuery.isLoading}
          isPositionsLoading={paperPositionsQuery.isLoading}
          isLogsLoading={paperExecutionLogsQuery.isLoading}
          onExecutePaperTrade={() => executePaperOrderMutation.mutate()}
          onCancelPaperTrade={() => cancelPaperOrderMutation.mutate()}
          onReturnToAgentLab={() => {
            const targetHypothesisId = latestPaperOrder?.hypothesis_id ?? latestRiskCheck?.hypothesis_id ?? hypothesisId;
            navigate(targetHypothesisId ? `/agent-lab/${targetHypothesisId}` : "/agent-lab");
          }}
          onReturnToRiskFirewall={() => {
            const targetRiskCheckId = latestPaperOrder?.risk_check_id ?? latestRiskCheck?.id ?? riskCheckId;
            navigate(targetRiskCheckId ? `/risk-firewall/${targetRiskCheckId}` : "/risk-firewall");
          }}
          onGenerateReviewReport={() => createAuditReportMutation.mutate()}
          isExecutingPaperOrder={executePaperOrderMutation.isPending}
          isCancellingPaperOrder={cancelPaperOrderMutation.isPending}
          isGeneratingReviewReport={createAuditReportMutation.isPending}
          canGenerateReviewReport={Boolean(latestPaperOrder?.id ?? paperOrderId ?? latestPaperOrder?.hypothesis_id ?? hypothesisId)}
          canExecutePaperOrder={canExecuteCurrentPaperOrder}
          disabledReason={paperExecutionDisabledReason}
        />
      ) : isAuditReports ? (
        <AuditReportsContent
          reports={auditReportsQuery.data ?? []}
          auditReport={selectedAuditReport}
          selectedReportId={selectedAuditReportId}
          onSelectReport={(reportId) => navigate(`/audit-reports/${reportId}`)}
          onGenerateAuditReport={() => createAuditReportMutation.mutate()}
          isGeneratingAuditReport={createAuditReportMutation.isPending}
          canGenerateAuditReport={Boolean(latestPaperOrder?.id ?? paperOrderId ?? hypothesisId)}
          isLoadingReports={auditReportsQuery.isLoading}
          isLoadingAuditReport={auditReportQuery.isLoading}
          reportsError={auditReportsQuery.error ? errorMessage(auditReportsQuery.error) : undefined}
          auditReportError={auditReportQuery.error ? errorMessage(auditReportQuery.error) : undefined}
          disabledReason={latestPaperOrder?.id ?? paperOrderId ?? hypothesisId ? undefined : workflowMessage(i18n.language, "请先生成交易假设或模拟订单。", "Generate a hypothesis or paper order first.")}
        />
      ) : isHtxEcosystem ? (
        <HtxEcosystemContent />
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
