export type WorkflowStepId =
  | "marketEvent"
  | "aiHypothesis"
  | "backtest"
  | "riskCheck"
  | "paperTrade"
  | "review";

export type WorkflowStep = {
  id: WorkflowStepId;
  labelKey: `workflow.${WorkflowStepId}`;
};

export const workflowSteps: WorkflowStep[] = [
  { id: "marketEvent", labelKey: "workflow.marketEvent" },
  { id: "aiHypothesis", labelKey: "workflow.aiHypothesis" },
  { id: "backtest", labelKey: "workflow.backtest" },
  { id: "riskCheck", labelKey: "workflow.riskCheck" },
  { id: "paperTrade", labelKey: "workflow.paperTrade" },
  { id: "review", labelKey: "workflow.review" },
];

export const routeWorkflowStepMap: Record<string, WorkflowStepId> = {
  "/command-center": "marketEvent",
  "/market": "marketEvent",
  "/agent-lab": "aiHypothesis",
  "/backtest": "backtest",
  "/risk-firewall": "riskCheck",
  "/paper-execution": "paperTrade",
  "/audit-reports": "review",
  "/htx-ecosystem": "review",
  "/settings": "review",
};

export function getWorkflowStepForPath(pathname: string): WorkflowStepId {
  const basePath = `/${pathname.split("/").filter(Boolean).slice(0, 1).join("/")}`;
  return routeWorkflowStepMap[pathname] ?? routeWorkflowStepMap[basePath] ?? "marketEvent";
}
