import { useQuery } from "@tanstack/react-query";
import { Milestone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { fetchEcosystemRoadmap, type EcosystemStatus } from "../../api/ecosystem";
import { StatusPill, type StatusPillVariant } from "../common/StatusPill";

function statusVariant(status: EcosystemStatus): StatusPillVariant {
  if (status === "connected" || status === "read_only") return "success";
  if (status === "disabled" || status === "disconnected") return "danger";
  return "warning";
}

export function EcosystemRoadmap() {
  const { t } = useTranslation();
  const roadmapQuery = useQuery({
    queryKey: ["ecosystem", "roadmap"],
    queryFn: ({ signal }) => fetchEcosystemRoadmap(signal),
  });
  const items = roadmapQuery.data?.items ?? [];

  return (
    <section className="ecosystem-panel ecosystem-panel--roadmap" aria-labelledby="ecosystem-roadmap">
      <div className="ecosystem-panel__heading">
        <span id="ecosystem-roadmap">
          <Milestone size={15} aria-hidden="true" />
          {t("htxEcosystem.sections.roadmap")}
        </span>
        <StatusPill variant="warning">{t("htxEcosystem.status.roadmap")}</StatusPill>
      </div>

      {roadmapQuery.isLoading ? (
        <div className="ecosystem-empty">{t("htxEcosystem.loading.roadmap")}</div>
      ) : roadmapQuery.error ? (
        <div className="ecosystem-empty ecosystem-empty--danger">{roadmapQuery.error instanceof Error ? roadmapQuery.error.message : t("errors.generic")}</div>
      ) : items.length > 0 ? (
        <div className="ecosystem-roadmap-list">
          {items.map((item, index) => (
            <article className="ecosystem-roadmap-item" key={item.id}>
              <span className="ecosystem-roadmap-item__marker">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>{t(`htxEcosystem.roadmap.items.${item.id}`)}</strong>
                <p>{t(`htxEcosystem.roadmap.details.${item.id}`)}</p>
              </div>
              <StatusPill variant={statusVariant(item.status)}>{t(`htxEcosystem.status.${item.status}`)}</StatusPill>
            </article>
          ))}
        </div>
      ) : (
        <div className="ecosystem-empty">{t("emptyStates.generic")}</div>
      )}
    </section>
  );
}
