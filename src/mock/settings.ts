import type { StatusPillVariant } from "../components/common/StatusPill";

export type SettingsVariant = StatusPillVariant;

export const settingsMetrics = [
  {
    id: "data",
    titleKey: "settings.metrics.data.title",
    value: "HTX",
    metaKey: "settings.metrics.data.meta",
    variant: "success",
  },
  {
    id: "agent",
    titleKey: "settings.metrics.agent.title",
    valueKey: "settings.values.evidenceMode",
    metaKey: "settings.metrics.agent.meta",
    variant: "info",
  },
  {
    id: "risk",
    titleKey: "settings.metrics.risk.title",
    valueKey: "settings.values.guarded",
    metaKey: "settings.metrics.risk.meta",
    variant: "warning",
  },
  {
    id: "language",
    titleKey: "settings.metrics.language.title",
    valueKey: "settings.values.persistent",
    metaKey: "settings.metrics.language.meta",
    variant: "success",
  },
] as const;

export const dataSourceSettings = [
  {
    id: "stream",
    labelKey: "settings.dataSource.stream.label",
    value: "WebSocket",
    metaKey: "settings.dataSource.stream.meta",
    statusKey: "settings.status.connected",
    variant: "success",
  },
  {
    id: "rest",
    labelKey: "settings.dataSource.rest.label",
    value: "REST",
    metaKey: "settings.dataSource.rest.meta",
    statusKey: "settings.status.standby",
    variant: "info",
  },
  {
    id: "symbol",
    labelKey: "settings.dataSource.symbol.label",
    value: "ETH/USDT",
    metaKey: "settings.dataSource.symbol.meta",
    statusKey: "settings.status.active",
    variant: "success",
  },
] as const;

export const agentSettings = [
  {
    id: "researchMode",
    labelKey: "settings.agent.researchMode.label",
    valueKey: "settings.values.evidenceMode",
    metaKey: "settings.agent.researchMode.meta",
    statusKey: "settings.status.enabled",
    variant: "success",
  },
  {
    id: "counterThesis",
    labelKey: "settings.agent.counterThesis.label",
    valueKey: "settings.values.required",
    metaKey: "settings.agent.counterThesis.meta",
    statusKey: "settings.status.locked",
    variant: "warning",
  },
  {
    id: "chatSurface",
    labelKey: "settings.agent.chatSurface.label",
    valueKey: "settings.values.disabled",
    metaKey: "settings.agent.chatSurface.meta",
    statusKey: "settings.status.disabled",
    variant: "danger",
  },
] as const;

export const riskSettings = [
  {
    id: "liveTrading",
    labelKey: "settings.risk.liveTrading.label",
    valueKey: "settings.values.disabled",
    metaKey: "settings.risk.liveTrading.meta",
    statusKey: "status.liveTradingDisabled",
    variant: "danger",
  },
  {
    id: "riskPerTrade",
    labelKey: "settings.risk.riskPerTrade.label",
    value: "1.10%",
    metaKey: "settings.risk.riskPerTrade.meta",
    statusKey: "settings.status.guarded",
    variant: "warning",
  },
  {
    id: "positionCap",
    labelKey: "settings.risk.positionCap.label",
    value: "0.65 ETH",
    metaKey: "settings.risk.positionCap.meta",
    statusKey: "settings.status.locked",
    variant: "warning",
  },
] as const;
