import { ListChecks } from "lucide-react";
import { useTranslation } from "react-i18next";

export function DecisionEvidenceList({ evidence, warnings }: { evidence: string[]; warnings?: string[] }) {
  const { t } = useTranslation();
  const visibleEvidence = evidence.slice(0, 5);
  const visibleWarnings = warnings?.slice(0, 4) ?? [];

  return (
    <div className="decision-evidence">
      <div className="decision-evidence__heading">
        <ListChecks size={14} aria-hidden="true" />
        <span>{t("decision.sections.topEvidence")}</span>
      </div>
      <ul>
        {visibleEvidence.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      {visibleWarnings.length > 0 ? (
        <>
          <span className="decision-evidence__warning-label">{t("decision.sections.warnings")}</span>
          <ul className="decision-evidence__warnings">
            {visibleWarnings.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
