import { ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { StatusPill } from "../common/StatusPill";

export function BlockingReasonsList({ reasons }: { reasons: string[] }) {
  const { t } = useTranslation();

  return (
    <div className="blocking-reasons">
      <div className="blocking-reasons__heading">
        <ShieldAlert size={14} aria-hidden="true" />
        <span>{t("decision.sections.blockingReasons")}</span>
        <StatusPill variant={reasons.length > 0 ? "danger" : "success"}>
          {reasons.length > 0 ? t("decision.labels.hardBlockActive") : t("decision.labels.noHardBlock")}
        </StatusPill>
      </div>
      {reasons.length > 0 ? (
        <ul>
          {reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : (
        <p>{t("decision.empty.noBlockingReasons")}</p>
      )}
    </div>
  );
}
