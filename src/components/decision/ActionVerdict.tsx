import { Ban, Clock3, Eye, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { StatusPill, type StatusPillVariant } from "../common/StatusPill";
import type { DecisionAction } from "../../services/decision/decisionTypes";

function actionVariant(action: DecisionAction): StatusPillVariant {
  if (action === "ALLOW_PAPER_LONG" || action === "ALLOW_PAPER_SHORT") {
    return "success";
  }
  if (action === "BLOCK" || action === "NO_TRADE") {
    return "danger";
  }
  if (action === "REDUCE_SIZE" || action === "WAIT") {
    return "warning";
  }
  return "info";
}

function ActionIcon({ action }: { action: DecisionAction }) {
  if (action === "ALLOW_PAPER_LONG") {
    return <TrendingUp size={14} aria-hidden="true" />;
  }
  if (action === "ALLOW_PAPER_SHORT") {
    return <TrendingDown size={14} aria-hidden="true" />;
  }
  if (action === "BLOCK" || action === "NO_TRADE") {
    return <Ban size={14} aria-hidden="true" />;
  }
  if (action === "WAIT" || action === "REDUCE_SIZE") {
    return <Clock3 size={14} aria-hidden="true" />;
  }
  if (action === "OBSERVE") {
    return <Eye size={14} aria-hidden="true" />;
  }
  return <ShieldCheck size={14} aria-hidden="true" />;
}

export function ActionVerdict({ action }: { action: DecisionAction }) {
  const { t } = useTranslation();

  return (
    <StatusPill variant={actionVariant(action)}>
      <ActionIcon action={action} />
      {t(`decision.actions.${action}`)}
    </StatusPill>
  );
}
