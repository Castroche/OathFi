import { Lock, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { PositionSizeMode, SettingsUpdate } from "../../api/settings";
import { SettingsStatusBadge } from "./SettingsStatusBadge";

type RiskSettingsCardProps = {
  settings: SettingsUpdate;
  onChange: <K extends keyof SettingsUpdate>(key: K, value: SettingsUpdate[K]) => void;
};

const positionModes: PositionSizeMode[] = ["Fixed", "Risk Based", "Volatility Adjusted"];

export function RiskSettingsCard({ settings, onChange }: RiskSettingsCardProps) {
  const { t } = useTranslation();

  return (
    <section className="settings-panel settings-panel--risk" aria-labelledby="settings-risk">
      <div className="settings-panel__heading">
        <span id="settings-risk">
          <ShieldCheck size={15} aria-hidden="true" />
          {t("settings.sections.risk")}
        </span>
        <SettingsStatusBadge variant="danger">{t("settings.status.liveLocked")}</SettingsStatusBadge>
      </div>

      <div className="settings-form-grid">
        <label className="settings-field">
          <span>{t("settings.fields.maxRiskPerTrade")}</span>
          <input type="number" min={0} max={100} step={0.1} value={settings.max_risk_per_trade * 100} onChange={(event) => onChange("max_risk_per_trade", Number(event.target.value) / 100)} />
        </label>
        <label className="settings-field">
          <span>{t("settings.fields.maxDailyLoss")}</span>
          <input type="number" min={0} max={100} step={0.1} value={settings.max_daily_loss * 100} onChange={(event) => onChange("max_daily_loss", Number(event.target.value) / 100)} />
        </label>
        <label className="settings-field">
          <span>{t("settings.fields.maxConsecutiveLosses")}</span>
          <input type="number" min={1} value={settings.max_consecutive_losses} onChange={(event) => onChange("max_consecutive_losses", Number(event.target.value))} />
        </label>
        <label className="settings-field">
          <span>{t("settings.fields.positionSizeMode")}</span>
          <select value={settings.position_size_mode} onChange={(event) => onChange("position_size_mode", event.target.value as PositionSizeMode)}>
            {positionModes.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="settings-rule-table">
        <button className={settings.stop_loss_enforcement ? "settings-toggle is-on" : "settings-toggle"} type="button" onClick={() => onChange("stop_loss_enforcement", !settings.stop_loss_enforcement)}>
          <ShieldCheck size={16} aria-hidden="true" />
          <span>
            <strong>{t("settings.fields.stopLossEnforcement")}</strong>
            <small>{settings.stop_loss_enforcement ? t("settings.status.enabled") : t("settings.status.disabled")}</small>
          </span>
        </button>
        <button className={settings.paper_trading_enabled ? "settings-toggle is-on" : "settings-toggle"} type="button" onClick={() => onChange("paper_trading_enabled", !settings.paper_trading_enabled)}>
          <ShieldCheck size={16} aria-hidden="true" />
          <span>
            <strong>{t("settings.fields.paperTrading")}</strong>
            <small>{settings.paper_trading_enabled ? t("settings.status.enabled") : t("settings.status.paperExecutionUnavailable")}</small>
          </span>
        </button>
        <button className="settings-toggle settings-toggle--locked" type="button" disabled title={t("settings.liveTradingLock")}>
          <Lock size={16} aria-hidden="true" />
          <span>
            <strong>{t("settings.fields.liveTrading")}</strong>
            <small>{t("settings.liveTradingLock")}</small>
          </span>
        </button>
      </div>
    </section>
  );
}
