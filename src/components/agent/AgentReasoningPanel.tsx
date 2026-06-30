import { Brain, FileJson2, ListChecks, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AgentRun, AgentHypothesis } from "../../api/agent";
import { agentDisplayText, analysisModeLabel, businessCopyLabel, sourceLabel, validityLabel } from "../../lib/displayLabels";
import { StatusPill } from "../common/StatusPill";

type AgentReasoningPanelProps = {
  agentRun?: AgentRun | null;
  selectedHypothesis?: AgentHypothesis | null;
  summary?: string | null;
  validity?: string | null;
  overallConfidence?: number | null;
};

export function AgentReasoningPanel({
  agentRun,
  selectedHypothesis,
  summary,
  validity,
  overallConfidence,
}: AgentReasoningPanelProps) {
  const { i18n, t } = useTranslation();
  const sources = agentRun?.input_sources ?? [];
  const isFallback = agentRun?.analysis_mode === "rule_based" || selectedHypothesis?.analysis_mode === "rule_based";
  const fallbackReason = selectedHypothesis?.fallback_reason ?? agentRun?.fallback_reason ?? agentRun?.error_message;
  const rawOutput = selectedHypothesis?.provider_raw_output;

  return (
    <section className="agent-panel agent-panel--reasoning" aria-labelledby="agent-reasoning-panel">
      <div className="agent-panel__heading">
        <span id="agent-reasoning-panel">{t("agentLab.sections.reasoningTrace", "Agent Reasoning Panel")}</span>
        <StatusPill variant={isFallback ? "warning" : agentRun ? "success" : "info"}>
          {isFallback ? analysisModeLabel(t, "rule_based") : agentRun?.output_mode ?? t("agentLab.empty.noRunShort", "No Agent Run")}
        </StatusPill>
      </div>
      {isFallback ? (
        <div className="action-feedback action-feedback--warning">
          {t("agentLab.feedback.ruleBasedFallback")}
          {fallbackReason ? `: ${fallbackReason}` : ""}
        </div>
      ) : null}
      {agentRun?.error_message ? <div className="action-feedback action-feedback--error">{t("agentLab.feedback.providerError")}</div> : null}

      <div className="reasoning-summary">
        <div>
          <span>{t("agentLab.fields.currentTask", "Current Task")}</span>
          <strong>{agentRun?.current_task ? agentDisplayText(t, i18n.language, "current_task", agentRun.current_task) : t("dashboard.empty.noAgentRun")}</strong>
        </div>
        <div>
          <span>{t("agentLab.fields.outputMode", "Output Mode")}</span>
          <strong>{agentRun?.output_mode ? agentDisplayText(t, i18n.language, "output_mode", agentRun.output_mode) : t("agentLab.empty.awaitingRun", "Awaiting a new analysis")}</strong>
        </div>
        <div>
          <span>{t("agentLab.fields.confidenceCalibration", "Confidence Calibration")}</span>
          <strong>{agentRun?.confidence_calibration ? agentDisplayText(t, i18n.language, "confidence_calibration", agentRun.confidence_calibration) : t("agentLab.empty.awaitingRun")}</strong>
        </div>
        <div>
          <span>{t("agentLab.fields.providerStatus")}</span>
          <strong>{selectedHypothesis?.provider_status ?? agentRun?.provider_status ?? "--"}</strong>
        </div>
        <div>
          <span>{t("agentLab.fields.model")}</span>
          <strong>{selectedHypothesis?.model ?? agentRun?.model ?? "--"}</strong>
        </div>
        <div>
          <span>{t("agentLab.fields.latency")}</span>
          <strong>{selectedHypothesis?.latency_ms ?? agentRun?.latency_ms ?? "--"} ms</strong>
        </div>
      </div>

      <div className="agent-reasoning-grid">
        <article>
          <Brain size={16} aria-hidden="true" />
          <span>{t("agentLab.fields.aiSummary", "AI Summary")}</span>
          <p>{businessCopyLabel(t, agentDisplayText(t, i18n.language, "summary", summary ?? agentRun?.summary, selectedHypothesis ?? undefined))}</p>
        </article>
        <article>
          <ListChecks size={16} aria-hidden="true" />
          <span>{t("agentLab.fields.breakoutValidity", "Breakout Validity")}</span>
          <strong>{validityLabel(t, validity ?? agentRun?.validity)}</strong>
        </article>
        <article>
          <ShieldCheck size={16} aria-hidden="true" />
          <span>{t("agentLab.fields.overallConfidence", "Overall Confidence")}</span>
          <strong>{overallConfidence ?? agentRun?.overall_confidence ?? selectedHypothesis?.confidence ?? "--"}</strong>
        </article>
        <article>
          <FileJson2 size={16} aria-hidden="true" />
          <span>{t("agentLab.fields.inputSources", "Input Sources")}</span>
          <p>{sources.length ? sources.map((source) => sourceLabel(t, source)).join(", ") : `${sourceLabel(t, "htx_rest")} + ${sourceLabel(t, "news")} + ${sourceLabel(t, "ai_provider")}`}</p>
        </article>
      </div>
      <details className="agent-provider-output">
        <summary>{t("agentLab.sections.providerRawOutput")}</summary>
        {rawOutput ? <pre>{JSON.stringify(rawOutput, null, 2)}</pre> : <p>{isFallback ? fallbackReason ?? t("agentLab.feedback.ruleBasedFallback") : t("agentLab.empty.awaitingRun")}</p>}
      </details>
    </section>
  );
}
