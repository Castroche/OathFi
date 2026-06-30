import { useQuery } from "@tanstack/react-query";
import { Gem, LockKeyhole } from "lucide-react";
import { useTranslation } from "react-i18next";
import { fetchUtilityModel, type EcosystemStatus } from "../../api/ecosystem";
import { StatusPill, type StatusPillVariant } from "../common/StatusPill";

const featureOrder = [
  "ai_agent_access",
  "advanced_research",
  "backtest_quota",
  "priority_inference",
  "exclusive_reports",
  "agent_marketplace_access",
  "dao_governance_rights",
  "fee_discounts",
] as const;

function statusVariant(status: EcosystemStatus): StatusPillVariant {
  if (status === "connected" || status === "read_only") return "success";
  if (status === "disabled") return "danger";
  return "warning";
}

export function HtxUtilityModelTable() {
  const { t } = useTranslation();
  const utilityQuery = useQuery({
    queryKey: ["ecosystem", "utility-model"],
    queryFn: ({ signal }) => fetchUtilityModel(signal),
  });
  const tiers = utilityQuery.data?.tiers ?? [];

  return (
    <section className="ecosystem-panel ecosystem-panel--utility" aria-labelledby="ecosystem-utility">
      <div className="ecosystem-panel__heading">
        <span id="ecosystem-utility">
          <Gem size={15} aria-hidden="true" />
          {t("htxEcosystem.sections.utilityModel")}
        </span>
        <StatusPill variant="warning">{t("htxEcosystem.status.roadmap")}</StatusPill>
      </div>

      {utilityQuery.isLoading ? (
        <div className="ecosystem-empty">{t("htxEcosystem.loading.utility")}</div>
      ) : utilityQuery.error ? (
        <div className="ecosystem-empty ecosystem-empty--danger">{utilityQuery.error instanceof Error ? utilityQuery.error.message : t("errors.generic")}</div>
      ) : tiers.length > 0 ? (
        <div className="ecosystem-utility-table" role="table" aria-label={t("htxEcosystem.sections.utilityModel")}>
          <div className="ecosystem-utility-table__header" role="row">
            <span role="columnheader">{t("htxEcosystem.utility.feature")}</span>
            {tiers.map((tier) => (
              <span role="columnheader" key={tier.id}>
                {t(`htxEcosystem.utility.tiers.${tier.id}`)}
              </span>
            ))}
          </div>
          <div className="ecosystem-utility-table__row ecosystem-utility-table__row--tier" role="row">
            <span role="cell">{t("tables.status")}</span>
            {tiers.map((tier) => (
              <span role="cell" key={tier.id}>
                <StatusPill variant={statusVariant(tier.status)}>{t(`htxEcosystem.status.${tier.status}`)}</StatusPill>
              </span>
            ))}
          </div>
          {featureOrder.map((feature) => (
            <div className="ecosystem-utility-table__row" role="row" key={feature}>
              <span role="cell">
                <LockKeyhole size={13} aria-hidden="true" />
                {t(`htxEcosystem.utility.features.${feature}`)}
              </span>
              {tiers.map((tier) => {
                const status = tier.features[feature] ?? "planned";
                return (
                  <span role="cell" key={`${tier.id}-${feature}`}>
                    <StatusPill variant={statusVariant(status)}>{t(`htxEcosystem.status.${status}`)}</StatusPill>
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        <div className="ecosystem-empty">{t("emptyStates.generic")}</div>
      )}
    </section>
  );
}
