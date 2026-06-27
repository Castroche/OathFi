import { ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { StatusPill, type StatusPillVariant } from "../common/StatusPill";

function riskVariant(value: number): StatusPillVariant {
  if (value >= 0.75) {
    return "danger";
  }
  if (value >= 0.45) {
    return "warning";
  }
  if (value > 0) {
    return "info";
  }
  return "neutral";
}

function riskLabelKey(value: number) {
  if (value >= 0.75) {
    return "newsIntelligence.riskLevel.high";
  }
  if (value >= 0.45) {
    return "newsIntelligence.riskLevel.medium";
  }
  if (value > 0) {
    return "newsIntelligence.riskLevel.low";
  }
  return "newsIntelligence.riskLevel.neutral";
}

export function NewsRiskBadge({ value }: { value: number }) {
  const { t } = useTranslation();

  return (
    <StatusPill variant={riskVariant(value)}>
      <ShieldAlert size={13} aria-hidden="true" />
      {t(riskLabelKey(value))} {(value * 100).toFixed(0)}
    </StatusPill>
  );
}
