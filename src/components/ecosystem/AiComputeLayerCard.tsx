import { useQuery } from "@tanstack/react-query";
import { Bot, Cpu } from "lucide-react";
import { useTranslation } from "react-i18next";
import { fetchAiComputeStatus, type EcosystemStatus } from "../../api/ecosystem";
import { StatusPill, type StatusPillVariant } from "../common/StatusPill";

function statusVariant(status: EcosystemStatus): StatusPillVariant {
  if (status === "connected" || status === "read_only") return "success";
  if (status === "planned" || status === "roadmap" || status === "degraded") return "warning";
  return "danger";
}

export function AiComputeLayerCard() {
  const { t } = useTranslation();
  const computeQuery = useQuery({
    queryKey: ["ecosystem", "ai-compute"],
    queryFn: ({ signal }) => fetchAiComputeStatus(signal),
    refetchInterval: 30_000,
  });
  const data = computeQuery.data;

  return (
    <section className="ecosystem-panel ecosystem-panel--ai" aria-labelledby="ecosystem-ai-compute">
      <div className="ecosystem-panel__heading">
        <span id="ecosystem-ai-compute">
          <Cpu size={15} aria-hidden="true" />
          {t("htxEcosystem.sections.aiCompute")}
        </span>
        {data ? <StatusPill variant={statusVariant(data.current_provider_status)}>{t(`htxEcosystem.status.${data.current_provider_status}`)}</StatusPill> : null}
      </div>

      {computeQuery.isLoading ? (
        <div className="ecosystem-empty">{t("htxEcosystem.loading.ai")}</div>
      ) : computeQuery.error ? (
        <div className="ecosystem-empty ecosystem-empty--danger">{computeQuery.error instanceof Error ? computeQuery.error.message : t("errors.generic")}</div>
      ) : data ? (
        <>
          <div className="ecosystem-provider-strip">
            <article>
              <span>{t("htxEcosystem.ai.currentProvider")}</span>
              <strong>{data.current_provider}</strong>
              <p>{data.current_model || t("htxEcosystem.empty.noModel")}</p>
              <StatusPill variant={data.credential_status === "configured" ? "success" : "warning"}>
                {t(`htxEcosystem.ai.credentialStatus.${data.credential_status}`)}
              </StatusPill>
            </article>
            <article>
              <span>{t("htxEcosystem.ai.plannedProvider")}</span>
              <strong>{data.planned_provider}</strong>
              <StatusPill variant="warning">{t(`htxEcosystem.status.${data.planned_provider_status}`)}</StatusPill>
            </article>
          </div>

          <div className="ecosystem-capability-list">
            {data.capabilities.map((capability) => (
              <article className="ecosystem-status-row" key={capability.id}>
                <div>
                  <span>
                    <Bot size={13} aria-hidden="true" />
                    {t(`htxEcosystem.ai.capabilities.${capability.id}`)}
                  </span>
                  <strong>{capability.provider ?? data.current_provider}</strong>
                  <p>{capability.model || t("htxEcosystem.empty.noModel")}</p>
                </div>
                <StatusPill variant={statusVariant(capability.status)}>{t(`htxEcosystem.status.${capability.status}`)}</StatusPill>
              </article>
            ))}
          </div>
        </>
      ) : (
        <div className="ecosystem-empty">{t("emptyStates.generic")}</div>
      )}
    </section>
  );
}
