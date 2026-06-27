import { DatabaseZap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { StatusPill, type StatusPillVariant } from "../common/StatusPill";
import type { NewsSourceStatus as NewsSourceStatusType } from "../../services/news/newsTypes";

function statusVariant(status: NewsSourceStatusType): StatusPillVariant {
  switch (status) {
    case "live":
      return "success";
    case "mock":
      return "info";
    case "planned":
    case "backend-required":
      return "warning";
    case "error":
    case "unavailable":
      return "danger";
    default:
      return "neutral";
  }
}

export function NewsSourceStatus({ status }: { status: NewsSourceStatusType }) {
  const { t } = useTranslation();

  return (
    <StatusPill variant={statusVariant(status)}>
      <DatabaseZap size={13} aria-hidden="true" />
      {t(`newsIntelligence.sourceStatus.${status}`)}
    </StatusPill>
  );
}
