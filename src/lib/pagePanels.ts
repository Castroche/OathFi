import type { RouteId } from "./routes";
import type { StatusPillVariant } from "../components/common/StatusPill";

type PagePanel = {
  titleKey: string;
  valueKey: string;
  metaKey: string;
  statusKey?: string;
  statusVariant?: StatusPillVariant;
};

export const pagePanels: Record<RouteId, PagePanel[]> = {
  commandCenter: [
    {
      titleKey: "panels.marketPulse",
      valueKey: "panelValues.marketPulse",
      metaKey: "panelMeta.marketPulse",
    },
    {
      titleKey: "panels.agentStatus",
      valueKey: "panelValues.agentStatus",
      metaKey: "panelMeta.agentStatus",
    },
    {
      titleKey: "panels.riskSummary",
      valueKey: "panelValues.riskSummary",
      metaKey: "panelMeta.riskSummary",
    },
  ],
  marketMonitor: [
    {
      titleKey: "panels.klineChart",
      valueKey: "panelValues.klineChart",
      metaKey: "panelMeta.klineChart",
    },
    {
      titleKey: "panels.orderBook",
      valueKey: "panelValues.orderBook",
      metaKey: "panelMeta.orderBook",
    },
    {
      titleKey: "panels.indicators",
      valueKey: "panelValues.indicators",
      metaKey: "panelMeta.indicators",
    },
  ],
  agentLab: [
    {
      titleKey: "panels.marketContext",
      valueKey: "panelValues.marketContext",
      metaKey: "panelMeta.marketContext",
    },
    {
      titleKey: "panels.agentReasoning",
      valueKey: "panelValues.agentReasoning",
      metaKey: "panelMeta.agentReasoning",
    },
    {
      titleKey: "panels.hypotheses",
      valueKey: "panelValues.hypotheses",
      metaKey: "panelMeta.hypotheses",
    },
  ],
  backtestStudio: [
    {
      titleKey: "panels.strategyRule",
      valueKey: "panelValues.strategyRule",
      metaKey: "panelMeta.strategyRule",
    },
    {
      titleKey: "panels.backtestResult",
      valueKey: "panelValues.backtestResult",
      metaKey: "panelMeta.backtestResult",
    },
    {
      titleKey: "panels.equityCurve",
      valueKey: "panelValues.equityCurve",
      metaKey: "panelMeta.equityCurve",
    },
  ],
  riskFirewall: [
    {
      titleKey: "panels.riskDecision",
      valueKey: "panelValues.riskDecision",
      metaKey: "panelMeta.riskDecision",
    },
    {
      titleKey: "panels.positionSizing",
      valueKey: "panelValues.positionSizing",
      metaKey: "panelMeta.positionSizing",
    },
    {
      titleKey: "panels.ruleEvaluation",
      valueKey: "panelValues.ruleEvaluation",
      metaKey: "panelMeta.ruleEvaluation",
    },
  ],
  paperExecution: [
    {
      titleKey: "panels.orderTicket",
      valueKey: "panelValues.orderTicket",
      metaKey: "panelMeta.orderTicket",
    },
    {
      titleKey: "panels.executionPreview",
      valueKey: "panelValues.executionPreview",
      metaKey: "panelMeta.executionPreview",
    },
    {
      titleKey: "panels.executionLog",
      valueKey: "panelValues.executionLog",
      metaKey: "panelMeta.executionLog",
    },
  ],
  auditReports: [
    {
      titleKey: "panels.reportList",
      valueKey: "panelValues.reportList",
      metaKey: "panelMeta.reportList",
    },
    {
      titleKey: "panels.reportDetail",
      valueKey: "panelValues.reportDetail",
      metaKey: "panelMeta.reportDetail",
    },
    {
      titleKey: "panels.auditTimeline",
      valueKey: "panelValues.auditTimeline",
      metaKey: "panelMeta.auditTimeline",
    },
  ],
  htxEcosystem: [
    {
      titleKey: "panels.htxApi",
      valueKey: "panelValues.htxApi",
      metaKey: "panelMeta.htxApi",
    },
    {
      titleKey: "panels.aiCompute",
      valueKey: "panelValues.aiCompute",
      metaKey: "panelMeta.aiCompute",
      statusKey: "status.roadmap",
      statusVariant: "info",
    },
    {
      titleKey: "panels.htxUtility",
      valueKey: "panelValues.htxUtility",
      metaKey: "panelMeta.htxUtility",
      statusKey: "status.planned",
      statusVariant: "warning",
    },
  ],
  settings: [
    {
      titleKey: "panels.dataSource",
      valueKey: "panelValues.dataSource",
      metaKey: "panelMeta.dataSource",
      statusKey: "status.roadmap",
      statusVariant: "info",
    },
    {
      titleKey: "panels.agentSettings",
      valueKey: "panelValues.agentSettings",
      metaKey: "panelMeta.agentSettings",
      statusKey: "status.active",
      statusVariant: "success",
    },
    {
      titleKey: "panels.riskSettings",
      valueKey: "panelValues.riskSettings",
      metaKey: "panelMeta.riskSettings",
      statusKey: "status.planned",
      statusVariant: "warning",
    },
    {
      titleKey: "panels.languageSettings",
      valueKey: "panelValues.languageSettings",
      metaKey: "panelMeta.languageSettings",
    },
  ],
};
