import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { WorkflowStepId } from "../lib/workflow";
import type { AuditReport } from "../api/auditReports";
import type { Backtest } from "../api/backtests";
import type { Hypothesis } from "../api/hypotheses";
import type { PaperOrder } from "../api/paperOrders";
import type { RiskCheck } from "../api/risk";

export type Locale = "en" | "zh-CN";
export type ToastVariant = "success" | "error" | "info" | "warning";

let toastSequence = 0;

function createToastId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  toastSequence += 1;
  return `${Date.now()}-${toastSequence}`;
}

export type AppToast = {
  id: string;
  variant: ToastVariant;
  message: string;
};

type AppState = {
  language: Locale;
  selectedSymbol: string;
  selectedTimeframe: string;
  workflowId?: string;
  marketEventId?: string;
  hypothesisId?: string;
  backtestId?: string;
  riskCheckId?: string;
  paperOrderId?: string;
  auditReportId?: string;
  latestHypothesis?: Hypothesis;
  latestBacktest?: Backtest;
  latestRiskCheck?: RiskCheck;
  latestPaperOrder?: PaperOrder;
  latestAuditReport?: AuditReport;
  lastRiskBlockReason?: string;
  sidebarCollapsed: boolean;
  workflowStep: WorkflowStepId;
  toasts: AppToast[];
  setLanguage: (language: Locale) => void;
  setSelectedSymbol: (symbol: string) => void;
  setSelectedTimeframe: (timeframe: string) => void;
  setWorkflowIds: (ids: Partial<Pick<AppState, "workflowId" | "marketEventId" | "hypothesisId" | "backtestId" | "riskCheckId" | "paperOrderId" | "auditReportId">>) => void;
  setLatestHypothesis: (hypothesis?: Hypothesis) => void;
  setLatestBacktest: (backtest?: Backtest) => void;
  setLatestRiskCheck: (riskCheck?: RiskCheck) => void;
  setLatestPaperOrder: (paperOrder?: PaperOrder) => void;
  setLatestAuditReport: (auditReport?: AuditReport) => void;
  setLastRiskBlockReason: (reason?: string) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setWorkflowStep: (step: WorkflowStepId) => void;
  showToast: (toast: Omit<AppToast, "id">) => void;
  dismissToast: (id: string) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      language: "en",
      selectedSymbol: "ETH/USDT",
      selectedTimeframe: "15m",
      sidebarCollapsed: false,
      workflowStep: "marketEvent",
      toasts: [],
      setLanguage: (language) => set({ language }),
      setSelectedSymbol: (selectedSymbol) => set({ selectedSymbol }),
      setSelectedTimeframe: (selectedTimeframe) => set({ selectedTimeframe }),
      setWorkflowIds: (ids) => set(ids),
      setLatestHypothesis: (latestHypothesis) => set({ latestHypothesis }),
      setLatestBacktest: (latestBacktest) => set({ latestBacktest }),
      setLatestRiskCheck: (latestRiskCheck) => set({ latestRiskCheck }),
      setLatestPaperOrder: (latestPaperOrder) => set({ latestPaperOrder }),
      setLatestAuditReport: (latestAuditReport) => set({ latestAuditReport }),
      setLastRiskBlockReason: (lastRiskBlockReason) => set({ lastRiskBlockReason }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setWorkflowStep: (workflowStep) => set({ workflowStep }),
      showToast: (toast) =>
        set((state) => ({
          toasts: [
            ...state.toasts.slice(-2),
            {
              ...toast,
              id: createToastId(),
            },
          ],
        })),
      dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
    }),
    {
      name: "oathfi-app-state",
      partialize: (state) => ({
        language: state.language,
        selectedSymbol: state.selectedSymbol,
        selectedTimeframe: state.selectedTimeframe,
        workflowId: state.workflowId,
        marketEventId: state.marketEventId,
        hypothesisId: state.hypothesisId,
        backtestId: state.backtestId,
        riskCheckId: state.riskCheckId,
        paperOrderId: state.paperOrderId,
        auditReportId: state.auditReportId,
        latestHypothesis: state.latestHypothesis,
        latestBacktest: state.latestBacktest,
        latestRiskCheck: state.latestRiskCheck,
        latestPaperOrder: state.latestPaperOrder,
        latestAuditReport: state.latestAuditReport,
        lastRiskBlockReason: state.lastRiskBlockReason,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    },
  ),
);
