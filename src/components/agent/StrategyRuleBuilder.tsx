import { Save, Send, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AgentHypothesis, StrategyRulePayload } from "../../api/agent";
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
    setEntryConditions(hypothesis.trigger);
    setExitConditions(hypothesis.invalidation);
    setRiskControls(hypothesis.risk);
  }, [hypothesis]);

  const payload = (status: string): StrategyRulePayload => ({
    strategy_name: strategyName,
    entry_conditions: lines(entryConditions),
    exit_conditions: lines(exitConditions),
    risk_controls: lines(riskControls),
    preview: {
      hypothesis_id: hypothesis?.id,
      confidence: hypothesis?.confidence,
      type: hypothesis?.type,
    },
    status,
  });
  const disabledReason = hypothesis ? undefined : t("agentLab.empty.selectHypothesis", "Select or generate a hypothesis first.");

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
        <button type="button" className="secondary-action" disabled={!hypothesis || isSaving} onClick={() => onSaveDraft(payload("draft"))}>
          <Save size={14} aria-hidden="true" />
          <span>{isSaving ? t("loadingStates.syncing") : t("agentLab.actions.saveDraft", "Save as Draft")}</span>
        </button>
        <button type="button" className="primary-action" disabled={!hypothesis || isSending} onClick={() => onSendToBacktest(payload("ready_for_backtest"))}>
          <span>{isSending ? t("loadingStates.backtesting") : t("agentLab.actions.sendToBacktest", "Send to Backtest")}</span>
          <Send size={14} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
