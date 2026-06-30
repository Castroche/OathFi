import { Database, Radio } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ConnectionType, FallbackMethod, SettingsUpdate, SettingsMarketSourceTest } from "../../api/settings";
import { SettingsStatusBadge } from "./SettingsStatusBadge";

type DataSourceSettingsCardProps = {
  settings: SettingsUpdate;
  result?: SettingsMarketSourceTest;
  isTesting: boolean;
  onChange: <K extends keyof SettingsUpdate>(key: K, value: SettingsUpdate[K]) => void;
  onTest: () => void;
};

const connectionTypes: ConnectionType[] = ["REST", "WebSocket", "Hybrid"];
const fallbackMethods: FallbackMethod[] = ["None", "REST fallback", "Cached fallback"];

export function DataSourceSettingsCard({ settings, result, isTesting, onChange, onTest }: DataSourceSettingsCardProps) {
  const { t } = useTranslation();
  const statusVariant = result?.status === "connected" ? "success" : result?.status === "degraded" ? "warning" : "info";

  return (
    <section className="settings-panel settings-panel--data" aria-labelledby="settings-data-source">
      <div className="settings-panel__heading">
        <span id="settings-data-source">
          <Database size={15} aria-hidden="true" />
          {t("settings.sections.dataSource")}
        </span>
        <SettingsStatusBadge variant="success">{settings.primary_data_source}</SettingsStatusBadge>
      </div>

      <div className="settings-form-grid">
        <label className="settings-field">
          <span>{t("settings.fields.primaryDataSource")}</span>
          <select value={settings.primary_data_source} onChange={(event) => onChange("primary_data_source", event.target.value as SettingsUpdate["primary_data_source"])}>
            <option value="HTX">HTX</option>
          </select>
        </label>
        <label className="settings-field">
          <span>{t("settings.fields.connectionType")}</span>
          <select value={settings.connection_type} onChange={(event) => onChange("connection_type", event.target.value as ConnectionType)}>
            {connectionTypes.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="settings-field">
          <span>{t("settings.fields.fallbackMethod")}</span>
          <select value={settings.fallback_method} onChange={(event) => onChange("fallback_method", event.target.value as FallbackMethod)}>
            {fallbackMethods.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="settings-rule-table">
        <button className={settings.latency_monitor_enabled ? "settings-toggle is-on" : "settings-toggle"} type="button" onClick={() => onChange("latency_monitor_enabled", !settings.latency_monitor_enabled)}>
          <Radio size={16} aria-hidden="true" />
          <span>
            <strong>{t("settings.fields.latencyMonitor")}</strong>
            <small>{settings.latency_monitor_enabled ? t("settings.status.enabled") : t("settings.status.disabled")}</small>
          </span>
        </button>
        <div className="settings-dual-fields">
          <label className="settings-field">
            <span>{t("settings.fields.latencyWarning")}</span>
            <input type="number" min={1} value={settings.latency_warning_ms} onChange={(event) => onChange("latency_warning_ms", Number(event.target.value))} />
          </label>
          <label className="settings-field">
            <span>{t("settings.fields.latencyCritical")}</span>
            <input type="number" min={1} value={settings.latency_critical_ms} onChange={(event) => onChange("latency_critical_ms", Number(event.target.value))} />
          </label>
        </div>
        <button className={settings.auto_reconnect_enabled ? "settings-toggle is-on" : "settings-toggle"} type="button" onClick={() => onChange("auto_reconnect_enabled", !settings.auto_reconnect_enabled)}>
          <Radio size={16} aria-hidden="true" />
          <span>
            <strong>{t("settings.fields.autoReconnect")}</strong>
            <small>{settings.auto_reconnect_enabled ? t("settings.status.enabled") : t("settings.status.disabled")}</small>
          </span>
        </button>
      </div>

      <button className="secondary-action" type="button" disabled={isTesting} onClick={onTest}>
        <Radio size={14} aria-hidden="true" />
        <span>{isTesting ? t("settings.status.synced") : t("settings.actions.testMarketSource")}</span>
      </button>

      {result ? (
        <div className="action-feedback action-feedback--inline" role="status">
          <SettingsStatusBadge variant={statusVariant}>{result.status}</SettingsStatusBadge>
          <span>{`${result.provider} / ${result.latency_ms ?? 0} ms / ${new Date(result.checked_at).toLocaleTimeString()}`}</span>
          {result.error_message ? <span>{result.error_message}</span> : null}
        </div>
      ) : null}
    </section>
  );
}
