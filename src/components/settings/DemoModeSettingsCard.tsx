import { CheckCircle2, FlaskConical } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { DemoScenario, SettingsUpdate } from "../../api/settings";
import { SettingsStatusBadge } from "./SettingsStatusBadge";

type DemoModeSettingsCardProps = {
  settings: SettingsUpdate;
  onChange: <K extends keyof SettingsUpdate>(key: K, value: SettingsUpdate[K]) => void;
};

export function DemoModeSettingsCard({ settings, onChange }: DemoModeSettingsCardProps) {
  const { t } = useTranslation();
  const scenarios: DemoScenario[] = ["pass", "reject"];

  return (
    <section className="settings-panel settings-panel--demo" aria-labelledby="settings-demo">
      <div className="settings-panel__heading">
        <span id="settings-demo">
          <FlaskConical size={15} aria-hidden="true" />
          {t("settings.sections.demoMode")}
        </span>
        <SettingsStatusBadge variant={settings.demo_mode_enabled ? "success" : "warning"}>
          {settings.demo_mode_enabled ? t("settings.status.enabled") : t("settings.status.disabled")}
        </SettingsStatusBadge>
      </div>

      <div className="settings-rule-table">
        <button className={settings.demo_mode_enabled ? "settings-toggle is-on" : "settings-toggle"} type="button" onClick={() => onChange("demo_mode_enabled", !settings.demo_mode_enabled)}>
          <FlaskConical size={16} aria-hidden="true" />
          <span>
            <strong>{t("settings.fields.demoMode")}</strong>
            <small>{t("settings.demo.toggleMeta")}</small>
          </span>
        </button>
        <button className={settings.use_sample_account ? "settings-toggle is-on" : "settings-toggle"} type="button" onClick={() => onChange("use_sample_account", !settings.use_sample_account)}>
          <CheckCircle2 size={16} aria-hidden="true" />
          <span>
            <strong>{t("settings.fields.useSampleAccount")}</strong>
            <small>{settings.use_sample_account ? t("settings.status.enabled") : t("settings.status.disabled")}</small>
          </span>
        </button>
        <button className={settings.paper_execution_only ? "settings-toggle is-on" : "settings-toggle"} type="button" onClick={() => onChange("paper_execution_only", !settings.paper_execution_only)}>
          <CheckCircle2 size={16} aria-hidden="true" />
          <span>
            <strong>{t("settings.fields.paperExecutionOnly")}</strong>
            <small>{settings.paper_execution_only ? t("settings.status.enabled") : t("settings.status.disabled")}</small>
          </span>
        </button>
        <button className={settings.guided_demo_flow ? "settings-toggle is-on" : "settings-toggle"} type="button" onClick={() => onChange("guided_demo_flow", !settings.guided_demo_flow)}>
          <CheckCircle2 size={16} aria-hidden="true" />
          <span>
            <strong>{t("settings.fields.guidedDemoFlow")}</strong>
            <small>{settings.guided_demo_flow ? t("settings.status.enabled") : t("settings.status.disabled")}</small>
          </span>
        </button>
        <label className="settings-field">
          <span>{t("settings.fields.demoScenario")}</span>
          <select value={settings.demo_scenario} onChange={(event) => onChange("demo_scenario", event.target.value as DemoScenario)}>
            {scenarios.map((scenario) => (
              <option key={scenario} value={scenario}>{t(`settings.demo.scenarios.${scenario}`)}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="settings-check-list">
        <article className="settings-check">
          <CheckCircle2 size={15} aria-hidden="true" />
          <div>
            <h3>{t("settings.demo.realFundsDisabled")}</h3>
            <p>{t("settings.demo.realFundsMeta")}</p>
          </div>
        </article>
        <article className="settings-check">
          <CheckCircle2 size={15} aria-hidden="true" />
          <div>
            <h3>{t("settings.demo.paperExecutionOnly")}</h3>
            <p>{t("settings.demo.paperExecutionMeta")}</p>
          </div>
        </article>
        <article className="settings-check">
          <CheckCircle2 size={15} aria-hidden="true" />
          <div>
            <h3>{t("settings.demo.hackathonEnabled")}</h3>
            <p>{t("settings.demo.hackathonMeta")}</p>
          </div>
        </article>
      </div>
    </section>
  );
}
