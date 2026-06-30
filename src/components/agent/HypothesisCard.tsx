import { Edit3, FlaskConical, Play, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AgentHypothesis } from "../../api/agent";
import { agentDisplayText, agentHypothesisLabel, analysisModeLabel, businessCopyLabel, hypothesisTypeLabel, statusLabel } from "../../lib/displayLabels";
import { StatusPill } from "../common/StatusPill";

type HypothesisCardProps = {
  hypothesis: AgentHypothesis;
  isSelected: boolean;
  isRunningBacktest: boolean;
  isRejecting: boolean;
  onRunBacktest: (hypothesis: AgentHypothesis) => void;
  onEditRule: (hypothesis: AgentHypothesis) => void;
  onReject: (hypothesis: AgentHypothesis) => void;
};

function valueText(value: unknown) {
  if (value === null || value === undefined || value === "") return "--";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(Math.abs(value) >= 1 ? 4 : 6);
  return String(value);
}

function backtestDisabledReason(t: ReturnType<typeof useTranslation>["t"], hypothesis: AgentHypothesis, isRejected: boolean) {
  const strategy = hypothesis.structured_hypothesis?.executable_strategy;
  const side = strategy?.side ?? hypothesis.direction;
  const entryPrice = strategy?.entry?.price ?? hypothesis.structured_hypothesis?.entry_plan?.trigger_price;
  const stopLoss = strategy?.exit?.stop_loss ?? hypothesis.structured_hypothesis?.entry_plan?.stop_loss;
  const takeProfit = strategy?.exit?.take_profit_1 ?? hypothesis.structured_hypothesis?.entry_plan?.take_profit_1;
  if (isRejected) return t("agentLab.feedback.rejectedCannotBacktest", "Rejected hypotheses cannot be sent to backtest.");
  if (side === "no_trade" || side === "neutral") return t("agentLab.feedback.notTradeableHypothesis", "Non-tradeable hypothesis");
  if (!["long", "short"].includes(String(side)) || entryPrice == null || stopLoss == null || takeProfit == null) {
    return t("agentLab.feedback.missingExecutableStrategy", "Missing executable strategy; backtest is disabled.");
  }
  return undefined;
}

export function HypothesisCard({
  hypothesis,
  isSelected,
  isRunningBacktest,
  isRejecting,
  onRunBacktest,
  onEditRule,
  onReject,
}: HypothesisCardProps) {
  const { i18n, t } = useTranslation();
  const isRejected = hypothesis.status === "rejected";
  const structured = hypothesis.structured_hypothesis;
  const disabledReason = backtestDisabledReason(t, hypothesis, isRejected);
  const evidence = structured?.evidence;
  const entryPlan = structured?.entry_plan;
  const backtestRule = structured?.backtest_rule;

  const sectionRows: Array<{ label: string; value: string; field?: "summary" | "trigger" | "invalidation" | "risk" }> = [
    { label: t("agentLab.fields.marketRegime"), value: valueText(structured?.market_regime) },
    { label: t("agentLab.fields.coreThesis"), value: valueText(structured?.thesis_summary ?? hypothesis.thesis), field: "summary" },
    { label: t("agentLab.fields.klineEvidence"), value: valueText(evidence?.kline_evidence) },
    { label: t("agentLab.fields.indicatorEvidence"), value: valueText(evidence?.indicator_evidence) },
    { label: t("agentLab.fields.orderbookEvidence"), value: valueText(evidence?.orderbook_evidence) },
    { label: t("agentLab.fields.volumeEvidence"), value: valueText(evidence?.volume_evidence) },
    { label: t("agentLab.fields.triggerPrice"), value: valueText(entryPlan?.trigger_price) },
    { label: t("agentLab.fields.confirmationCondition"), value: valueText(entryPlan?.confirmation_condition ?? hypothesis.trigger), field: "trigger" },
    { label: t("agentLab.fields.stopLoss"), value: valueText(entryPlan?.stop_loss ?? hypothesis.stop_loss) },
    { label: t("agentLab.fields.takeProfit"), value: `${valueText(entryPlan?.take_profit_1 ?? hypothesis.take_profit)} / ${valueText(entryPlan?.take_profit_2)}` },
    { label: t("agentLab.fields.expectedRr"), value: valueText(entryPlan?.expected_rr) },
    { label: t("agentLab.fields.invalidation"), value: valueText(structured?.invalidation_conditions ?? hypothesis.invalidation), field: "invalidation" },
    { label: t("agentLab.fields.whyNotOpposite"), value: valueText(structured?.why_not_opposite_direction) },
    { label: t("agentLab.fields.risk"), value: valueText(structured?.risk_notes ?? hypothesis.risk), field: "risk" },
  ];

  const ruleRows: Array<{ label: string; value: string }> = [
    { label: t("agentLab.fields.entryRule"), value: valueText(backtestRule?.entry_rule) },
    { label: t("agentLab.fields.exitRule"), value: valueText(backtestRule?.exit_rule) },
    { label: t("agentLab.fields.stopRule"), value: valueText(backtestRule?.stop_rule) },
    { label: t("agentLab.fields.takeProfitRule"), value: valueText(backtestRule?.take_profit_rule) },
    { label: t("agentLab.fields.positionSizingRule"), value: valueText(backtestRule?.position_sizing_rule) },
  ];

  return (
    <article className={isSelected ? "agent-hypothesis-card is-selected" : "agent-hypothesis-card"}>
      <header>
        <span className="agent-hypothesis-card__badge">
          <FlaskConical size={15} aria-hidden="true" />
          {agentHypothesisLabel(t, structured?.label ?? hypothesis.label)}
        </span>
        <StatusPill variant={isRejected ? "danger" : hypothesis.is_ai_generated ? "success" : "warning"}>
          {hypothesis.is_ai_generated ? statusLabel(t, hypothesis.status) : analysisModeLabel(t, "rule_based")}
        </StatusPill>
      </header>
      {!hypothesis.is_ai_generated ? (
        <div className="action-feedback action-feedback--warning">
          {t("agentLab.feedback.ruleBasedFallback")}
          {hypothesis.fallback_reason ? `: ${hypothesis.fallback_reason}` : ""}
        </div>
      ) : null}
      {disabledReason ? <div className="action-feedback action-feedback--warning">{disabledReason}</div> : null}
      <div className="agent-hypothesis-card__title">
        <h3>{hypothesisTypeLabel(t, structured?.setup_type ?? hypothesis.type)}</h3>
        <strong>{hypothesis.confidence}</strong>
      </div>
      <dl>
        {sectionRows.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>{businessCopyLabel(t, row.field ? agentDisplayText(t, i18n.language, row.field, row.value, hypothesis) : row.value)}</dd>
          </div>
        ))}
      </dl>
      <div className="agent-rule-snapshot">
        <span>{t("agentLab.sections.backtestRules")}</span>
        <dl>
          {ruleRows.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>{businessCopyLabel(t, agentDisplayText(t, i18n.language, "backtest_rule", row.value, hypothesis))}</dd>
            </div>
          ))}
        </dl>
      </div>
      <details className="agent-provider-output">
        <summary>{t("agentLab.sections.providerRawOutput")}</summary>
        <pre>{JSON.stringify(hypothesis.provider_raw_output ?? hypothesis.structured_hypothesis ?? {}, null, 2)}</pre>
      </details>
      <div className="agent-hypothesis-card__actions">
        <button type="button" className="secondary-action" title={disabledReason} disabled={Boolean(disabledReason) || isRunningBacktest} onClick={() => onRunBacktest(hypothesis)}>
          <Play size={14} aria-hidden="true" />
          <span>{isRunningBacktest ? t("loadingStates.backtesting") : t("agentLab.actions.runBacktest")}</span>
        </button>
        <button type="button" className="secondary-action" disabled={isRejected} onClick={() => onEditRule(hypothesis)}>
          <Edit3 size={14} aria-hidden="true" />
          <span>{t("agentLab.actions.editRule")}</span>
        </button>
        <button type="button" className="secondary-action secondary-action--danger" disabled={isRejected || isRejecting} onClick={() => onReject(hypothesis)}>
          <XCircle size={14} aria-hidden="true" />
          <span>{isRejecting ? t("agentLab.actions.rejecting") : t("agentLab.actions.reject")}</span>
        </button>
      </div>
    </article>
  );
}
