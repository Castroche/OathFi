import { Bot } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { DashboardAgentStatus } from "../../api/dashboard";
import { StatusPill } from "../common/StatusPill";

type AgentStatusCardProps = {
  agent?: DashboardAgentStatus;
};

function formatTime(value?: string | null) {
  if (!value) {
    return "--";
  }
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function AgentStatusCard({ agent }: AgentStatusCardProps) {
  const { t } = useTranslation();
  const running = Boolean(agent?.running);

  return (
    <article className="command-metric">
      <header>
        <span className={`command-metric__icon command-state--${running ? "success" : "warning"}`}>
          <Bot size={15} aria-hidden="true" />
        </span>
        <h2>{t("panels.agentStatus")}</h2>
      </header>
      <strong>{running ? t("status.agentRunning") : agent?.status ?? t("marketLive.status.disconnected")}</strong>
      <p>{agent?.current_task ?? t("dashboard.empty.noAgentRun")}</p>
      <div className="command-card-footer">
        <StatusPill variant={running ? "success" : "warning"}>{agent?.model_provider ?? "backend"}</StatusPill>
        <span>{formatTime(agent?.last_analysis_at)}</span>
      </div>
    </article>
  );
}
