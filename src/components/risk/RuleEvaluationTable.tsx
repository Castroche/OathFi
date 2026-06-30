import { ListChecks } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { RiskItem } from "../../api/risk";
import { riskRuleLabel, riskRuleMessage, riskValueLabel, statusLabel } from "../../lib/displayLabels";
import { StatusPill } from "../common/StatusPill";

type RuleEvaluationTableProps = {
  rules: RiskItem[];
};

function statusVariant(status: string) {
  if (status === "BLOCK" || status === "REJECTED") return "danger";
  if (status === "WARNING" || status === "CONDITIONAL") return "warning";
  if (status === "PASS" || status === "APPROVED") return "success";
  return "info";
}

function rowClass(status: string) {
  if (status === "BLOCK" || status === "REJECTED") return "risk-rule-row risk-rule-row--danger";
  if (status === "WARNING" || status === "CONDITIONAL") return "risk-rule-row risk-rule-row--warning";
  return "risk-rule-row risk-rule-row--success";
}

export function RuleEvaluationTable({ rules }: RuleEvaluationTableProps) {
  const { t } = useTranslation();
  return (
    <section className="risk-panel risk-panel--rules" aria-labelledby="risk-rules-title">
      <div className="risk-panel__heading">
        <span id="risk-rules-title">
          <ListChecks size={15} aria-hidden="true" />
          {t("riskFirewall.sections.ruleEvaluation")}
        </span>
      </div>
      <div className="risk-rule-table">
        <div className="risk-rule-table__header" aria-hidden="true">
          <span>{t("tables.rule")}</span>
          <span>{t("tables.threshold")}</span>
          <span>{t("tables.actual")}</span>
          <span>{t("tables.status")}</span>
          <span>{t("tables.notes")}</span>
        </div>
        {rules.map((rule) => (
          <article className={rowClass(rule.status)} key={rule.name}>
            <strong data-label={t("tables.rule")}>{riskRuleLabel(t, rule.name)}</strong>
            <span data-label={t("tables.threshold")}>{riskValueLabel(t, rule.threshold)}</span>
            <span data-label={t("tables.actual")}>{riskValueLabel(t, rule.actual)}</span>
            <StatusPill variant={statusVariant(rule.status)} data-label={t("tables.status")}>
              {statusLabel(t, rule.status)}
            </StatusPill>
            <p data-label={t("tables.notes")}>{riskRuleMessage(t, rule.name)}</p>
          </article>
        ))}
        {rules.length === 0 ? <div className="market-snapshot-empty">{t("riskFirewall.empty.noRules")}</div> : null}
      </div>
    </section>
  );
}
