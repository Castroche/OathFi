import type { ReactNode } from "react";
import { ChevronDown, Grip, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { sourceLabel, statusLabel } from "../../lib/displayLabels";
import { StatusPill } from "../common/StatusPill";

type PanelFrameProps = {
  title: string;
  subtitle?: string;
  status?: string;
  statusVariant?: "success" | "warning" | "danger" | "info" | "neutral";
  source?: string;
  loading?: boolean;
  error?: string | null;
  actions?: ReactNode;
  children: ReactNode;
};

export function PanelFrame({
  title,
  subtitle,
  status,
  statusVariant = "info",
  source,
  loading = false,
  error,
  actions,
  children,
}: PanelFrameProps) {
  const { t } = useTranslation();

  return (
    <section className="market-panel-frame" aria-label={title}>
      <header className="market-panel-frame__header">
        <span className="market-panel-frame__drag" aria-hidden="true">
          <Grip size={15} />
        </span>
        <div className="market-panel-frame__title">
          <strong>{title}</strong>
          {subtitle ? <span>{subtitle}</span> : null}
        </div>
        <div className="market-panel-frame__badges">
          {status ? <StatusPill variant={statusVariant}>{statusLabel(t, status)}</StatusPill> : null}
          {source ? <StatusPill variant={source === "live_ws_htx" ? "success" : source === "htx_rest_fallback" ? "warning" : "info"}>{sourceLabel(t, source)}</StatusPill> : null}
          {actions}
          <button className="market-panel-frame__collapse" type="button" aria-label={t("marketLive.panel.collapseReserved")} disabled>
            <ChevronDown size={14} aria-hidden="true" />
          </button>
        </div>
      </header>
      <div className="market-panel-frame__body">
        {loading ? (
          <div className="market-panel-frame__state">{t("marketLive.status.loading")}</div>
        ) : error ? (
          <div className="market-panel-frame__state market-panel-frame__state--danger">{error}</div>
        ) : (
          children
        )}
      </div>
      <span className="market-panel-frame__resize-cue" aria-hidden="true">
        <RotateCcw size={12} />
      </span>
    </section>
  );
}
