import { ShieldOff, Workflow } from "lucide-react";
import { useTranslation } from "react-i18next";
import { StatusPill } from "../common/StatusPill";
import { AiComputeLayerCard } from "./AiComputeLayerCard";
import { EcosystemRoadmap } from "./EcosystemRoadmap";
import { HtxApiIntegrationCard } from "./HtxApiIntegrationCard";
import { HtxUtilityModelTable } from "./HtxUtilityModelTable";

export function HtxEcosystemContent() {
  const { t } = useTranslation();

  return (
    <section className="ecosystem-workspace" aria-label={t("htxEcosystem.aria")}>
      <section className="ecosystem-brief" aria-labelledby="ecosystem-brief-title">
        <div>
          <span className="ecosystem-brief__eyebrow">
            <Workflow size={14} aria-hidden="true" />
            {t("htxEcosystem.brief.kicker")}
          </span>
          <h2 id="ecosystem-brief-title">{t("htxEcosystem.brief.title")}</h2>
          <p>{t("htxEcosystem.brief.summary")}</p>
        </div>
        <div className="ecosystem-brief__lock">
          <ShieldOff size={18} aria-hidden="true" />
          <span>{t("htxEcosystem.brief.executionBoundary")}</span>
          <strong>{t("status.liveTradingDisabled")}</strong>
          <StatusPill variant="danger">{t("htxEcosystem.status.disabled")}</StatusPill>
        </div>
      </section>

      <div className="ecosystem-grid">
        <HtxApiIntegrationCard />
        <AiComputeLayerCard />
        <HtxUtilityModelTable />
        <EcosystemRoadmap />
      </div>
    </section>
  );
}
