import {
  Activity,
  BarChart3,
  Bot,
  ClipboardCheck,
  FileSearch,
  Flame,
  Gauge,
  Landmark,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type RouteId =
  | "commandCenter"
  | "marketMonitor"
  | "agentLab"
  | "backtestStudio"
  | "riskFirewall"
  | "paperExecution"
  | "auditReports"
  | "htxEcosystem"
  | "settings";

export type AppRoute = {
  id: RouteId;
  path: string;
  navKey: `navigation.${RouteId}`;
  titleKey: `pages.${RouteId}.title`;
  summaryKey: `pages.${RouteId}.summary`;
  ctaKey: string;
  icon: LucideIcon;
};

export const appRoutes: AppRoute[] = [
  {
    id: "commandCenter",
    path: "/command-center",
    navKey: "navigation.commandCenter",
    titleKey: "pages.commandCenter.title",
    summaryKey: "pages.commandCenter.summary",
    ctaKey: "actions.startDemoFlow",
    icon: Gauge,
  },
  {
    id: "marketMonitor",
    path: "/market",
    navKey: "navigation.marketMonitor",
    titleKey: "pages.marketMonitor.title",
    summaryKey: "pages.marketMonitor.summary",
    ctaKey: "actions.generateHypothesis",
    icon: BarChart3,
  },
  {
    id: "agentLab",
    path: "/agent-lab",
    navKey: "navigation.agentLab",
    titleKey: "pages.agentLab.title",
    summaryKey: "pages.agentLab.summary",
    ctaKey: "actions.sendToBacktest",
    icon: Bot,
  },
  {
    id: "backtestStudio",
    path: "/backtest",
    navKey: "navigation.backtestStudio",
    titleKey: "pages.backtestStudio.title",
    summaryKey: "pages.backtestStudio.summary",
    ctaKey: "actions.sendToRiskFirewall",
    icon: Activity,
  },
  {
    id: "riskFirewall",
    path: "/risk-firewall",
    navKey: "navigation.riskFirewall",
    titleKey: "pages.riskFirewall.title",
    summaryKey: "pages.riskFirewall.summary",
    ctaKey: "actions.sendToPaperExecution",
    icon: Flame,
  },
  {
    id: "paperExecution",
    path: "/paper-execution",
    navKey: "navigation.paperExecution",
    titleKey: "pages.paperExecution.title",
    summaryKey: "pages.paperExecution.summary",
    ctaKey: "actions.generateReviewReport",
    icon: ClipboardCheck,
  },
  {
    id: "auditReports",
    path: "/audit-reports",
    navKey: "navigation.auditReports",
    titleKey: "pages.auditReports.title",
    summaryKey: "pages.auditReports.summary",
    ctaKey: "actions.openAuditLog",
    icon: FileSearch,
  },
  {
    id: "htxEcosystem",
    path: "/htx-ecosystem",
    navKey: "navigation.htxEcosystem",
    titleKey: "pages.htxEcosystem.title",
    summaryKey: "pages.htxEcosystem.summary",
    ctaKey: "actions.viewRoadmap",
    icon: Landmark,
  },
  {
    id: "settings",
    path: "/settings",
    navKey: "navigation.settings",
    titleKey: "pages.settings.title",
    summaryKey: "pages.settings.summary",
    ctaKey: "actions.saveSettings",
    icon: Settings,
  },
];

export const routeByPath = Object.fromEntries(
  appRoutes.map((route) => [route.path, route]),
) as Record<string, AppRoute>;
