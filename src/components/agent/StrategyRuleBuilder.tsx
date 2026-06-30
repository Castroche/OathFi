import { Save, Send, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AgentHypothesis, StrategyRulePayload } from "../../api/agent";
import { businessCopyLabel } from "../../lib/displayLabels";
import { StatusPill } from "../common/StatusPill";
import { StrategyPreviewChart } from "./StrategyPreviewChart";

type StrategyRuleBuilderProps = {
  hypothesis?: AgentHypothesis | null;
  isSaving: boolean;
  isSending: boolean;
  onSaveDraft: (payload: StrategyRulePayload) => void;
  onSendToBacktest: (payload: StrategyRulePayload) => void;
};

function lines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function backtestDisabledReason(t: ReturnType<typeof useTranslation>["t"], hypothesis?: AgentHypothesis | null) {
  if (!hypothesis) return t("agentLab.empty.selectHypothesis", "Select or generate a hypothesis first.");
  const strategy = hypothesis.structured_hypothesis?.executable_strategy;
  const side = strategy?.side ?? hypothesis.direction;
  const entryPrice = strategy?.entry?.price ?? hypothesis.structured_hypothesis?.entry_plan?.trigger_price;
  const stopLoss = strategy?.exit?.stop_loss ?? hypothesis.structured_hypothesis?.entry_plan?.stop_loss;
  const takeProfit = strategy?.exit?.take_profit_1 ?? hypothesis.structured_hypothesis?.entry_plan?.take_profit_1;
  if (hypothesis.status === "rejected") return t("agentLab.feedback.rejectedCannotBacktest", "Rejected hypotheses cannot be sent to backtest.");
  if (side === "no_trade" || side === "neutral") return t("agentLab.feedback.notTradeableHypothesis", "Non-tradeable hypothesis");
  if (!["long", "short"].includes(String(side)) || entryPrice == null || stopLoss == null || takeProfit == null) {
    return t("agentLab.feedback.missingExecutableStrategy", "Missing executable strategy; backtest is disabled.");
  }
  return undefined;
}

export function StrategyRuleBuilder({
  hypothesis,
  isSaving,
  isSending,
  onSaveDraft,
  onSendToBacktest,
}: StrategyRuleBuilderProps) {
  const { t } = useTranslation();
  const [strategyName, setStrategyName] = useState("");
  const [entryConditions, setEntryConditions] = useState("");
  const [exitConditions, setExitConditions] = useState("");
  const [riskControls, setRiskControls] = useState("");

  useEffect(() => {
    if (!hypothesis) {
      setStrategyName("");
      setEntryConditions("");
      setExitConditions("");
      setRiskControls("");
      return;
    }
    setStrategyName(`${hypothesis.symbol} ${hypothesis.label}`);
    const rule = hypothesis.structured_hypothesis?.backtest_rule;
    setEntryConditions(businessCopyLabel(t, rule?.entry_rule ?? hypothesis.trigger));
    setExitConditions(
      [rule?.exit_rule, rule?.stop_rule, rule?.take_profit_rule]
        .filter(Boolean)
        .map((item) => businessCopyLabel(t, item))
        .join("\n") || businessCopyLabel(t, hypothesis.invalidation),
    );
    setRiskControls(
      [rule?.position_sizing_rule, hypothesis.structured_hypothesis?.risk_notes]
        .filter(Boolean)
        .map((item) => businessCopyLabel(t, item))
        .join("\n") || businessCopyLabel(t, hypothesis.risk),
    );
  }, [hypothesis, t]);

  const payload = (status: string): StrategyRulePayload => ({
    strategy_name: strategyName,
    entry_conditions: lines(entryConditions),
    exit_conditions: lines(exitConditions),
    risk_controls: lines(riskControls),
    preview: {
      hypothesis_id: hypothesis?.id,
      confidence: hypothesis?.confidence,
      type: hypothesis?.type,
      backtest_rule: hypothesis?.structured_hypothesis?.backtest_rule,
      invalidation_condition: hypothesis?.structured_hypothesis?.invalidation_conditions,
      source_evidence: hypothesis?.structured_hypothesis?.evidence,
    },
    status,
  });
  const disabledReason = backtestDisabledReason(t, hypothesis);
  const noHypothesis = !hypothesis;

  return (
    <section className="agent-panel agent-panel--builder" aria-labelledby="strategy-rule-builder">
      <div className="agent-panel__heading">
        <span id="strategy-rule-builder">
          <SlidersHorizontal size={15} aria-hidden="true" />
          {t("agentLab.sections.rulePacket", "Convert to Strategy Rule")}
        </span>
        <StatusPill variant={hypothesis ? "info" : "warning"}>{hypothesis ? hypothesis.label : "disabled"}</StatusPill>
      </div>
      <div className="strategy-builder-grid">
        <label>
          <span>{t("agentLab.fields.strategyName", "Strategy Name")}</span>
          <input value={strategyName} disabled={!hypothesis} onChange={(event) => setStrategyName(event.target.value)} />
        </label>
        <label>
          <span>{t("agentLab.fields.entryConditions", "Entry Conditions")}</span>
          <textarea value={entryConditions} disabled={!hypothesis} onChange={(event) => setEntryConditions(event.target.value)} />
        </label>
        <label>
          <span>{t("agentLab.fields.exitConditions", "Exit Conditions")}</span>
          <textarea value={exitConditions} disabled={!hypothesis} onChange={(event) => setExitConditions(event.target.value)} />
        </label>
        <label>
          <span>{t("agentLab.fields.riskControls", "Risk Controls")}</span>
          <textarea value={riskControls} disabled={!hypothesis} onChange={(event) => setRiskControls(event.target.value)} />
        </label>
        <div className="strategy-builder-preview">
          <span>{t("agentLab.fields.strategyPreview", "Strategy Preview")}</span>
          <StrategyPreviewChart hypothesis={hypothesis} />
        </div>
      </div>
      {disabledReason ? <p className="control-disabled-reason">{disabledReason}</p> : null}
      <div className="strategy-builder-actions">
        <button type="button" className="secondary-action" disabled={noHypothesis || isSaving} onClick={() => onSaveDraft(payload("draft"))}>
          <Save size={14} aria-hidden="true" />
          <span>{isSaving ? t("loadingStates.syncing") : t("agentLab.actions.saveDraft", "Save as Draft")}</span>
        </button>
        <button type="button" className="primary-action" title={disabledReason} disabled={Boolean(disabledReason) || isSending} onClick={() => onSendToBacktest(payload("ready_for_backtest"))}>
          <span>{isSending ? t("loadingStates.backtesting") : t("agentLab.actions.sendToBacktest", "Send to Backtest")}</span>
          <Send size={14} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
