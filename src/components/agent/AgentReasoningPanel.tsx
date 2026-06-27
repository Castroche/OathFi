import { Brain, FileJson2, ListChecks, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AgentRun, AgentHypothesis } from "../../api/agent";
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
  const { t } = useTranslation();
  const sources = agentRun?.input_sources ?? [];
  const isFallback = agentRun?.analysis_mode === "rule_based" || selectedHypothesis?.analysis_mode === "rule_based";

  return (
    <section className="agent-panel agent-panel--reasoning" aria-labelledby="agent-reasoning-panel">
      <div className="agent-panel__heading">
        <span id="agent-reasoning-panel">{t("agentLab.sections.reasoningTrace", "Agent Reasoning Panel")}</span>
        <StatusPill variant={isFallback ? "warning" : agentRun ? "success" : "info"}>
          {isFallback ? "rule_based" : agentRun?.output_mode ?? t("agentLab.empty.noRunShort", "No Agent Run")}
        </StatusPill>
      </div>
      {isFallback ? <div className="action-feedback action-feedback--warning">Rule-based fallback, not AI provider output.</div> : null}
      {agentRun?.error_message ? <div className="action-feedback action-feedback--error">{agentRun.error_message}</div> : null}

      <div className="reasoning-summary">
        <div>
          <span>{t("agentLab.fields.currentTask", "Current Task")}</span>
          <strong>{agentRun?.current_task ?? t("dashboard.empty.noAgentRun")}</strong>
        </div>
        <div>
          <span>{t("agentLab.fields.outputMode", "Output Mode")}</span>
          <strong>{agentRun?.output_mode ?? t("agentLab.empty.awaitingRun", "Awaiting a new analysis")}</strong>
        </div>
        <div>
          <span>{t("agentLab.fields.confidenceCalibration", "Confidence Calibration")}</span>
          <strong>{agentRun?.confidence_calibration ?? t("agentLab.empty.noProviderOutput", "No provider output yet")}</strong>
        </div>
      </div>

      <div className="agent-reasoning-grid">
        <article>
          <Brain size={16} aria-hidden="true" />
          <span>{t("agentLab.fields.aiSummary", "AI Summary")}</span>
          <p>{summary ?? agentRun?.summary ?? t("dashboard.empty.noAgentRun")}</p>
        </article>
        <article>
          <ListChecks size={16} aria-hidden="true" />
          <span>{t("agentLab.fields.breakoutValidity", "Breakout Validity")}</span>
          <strong>{validity ?? agentRun?.validity ?? "--"}</strong>
        </article>
        <article>
          <ShieldCheck size={16} aria-hidden="true" />
          <span>{t("agentLab.fields.overallConfidence", "Overall Confidence")}</span>
          <strong>{overallConfidence ?? agentRun?.overall_confidence ?? selectedHypothesis?.confidence ?? "--"}</strong>
        </article>
        <article>
          <FileJson2 size={16} aria-hidden="true" />
          <span>{t("agentLab.fields.inputSources", "Input Sources")}</span>
          <p>{sources.length ? sources.join(", ") : "htx_rest + news + ai_provider"}</p>
        </article>
      </div>
    </section>
  );
}
