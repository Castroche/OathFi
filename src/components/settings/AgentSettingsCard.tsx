import { Bot, KeyRound, Save, TestTube2, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ConfidenceCalibration, CredentialStatus, CredentialUpdate, ModelProvider, OutputMode, SettingsAIProviderTest, SettingsUpdate } from "../../api/settings";
import { AI_PROVIDER_REGISTRY, getAIProvider } from "../../config/aiProviders";
import { SettingsStatusBadge } from "./SettingsStatusBadge";

type AgentSettingsCardProps = {
  settings: SettingsUpdate;
  providerStatus: "Configured" | "Not Configured" | "Planned";
  result?: SettingsAIProviderTest;
  isTesting: boolean;
  credentialStatus?: CredentialStatus;
  credentialDraft: CredentialUpdate;
  isSavingCredential: boolean;
  isDeletingCredential: boolean;
  onChange: <K extends keyof SettingsUpdate>(key: K, value: SettingsUpdate[K]) => void;
  onCredentialChange: <K extends keyof CredentialUpdate>(key: K, value: CredentialUpdate[K]) => void;
  onSaveCredential: () => void;
  onDeleteCredential: () => void;
  onTest: () => void;
};

const outputModes: OutputMode[] = ["Summary", "Structured", "Research"];
const confidenceModes: ConfidenceCalibration[] = ["Conservative", "Balanced", "Aggressive"];

export function AgentSettingsCard({
  settings,
  providerStatus,
  result,
  isTesting,
  credentialStatus,
  credentialDraft,
  isSavingCredential,
  isDeletingCredential,
  onChange,
  onCredentialChange,
  onSaveCredential,
  onDeleteCredential,
  onTest,
}: AgentSettingsCardProps) {
  const { t } = useTranslation();
  const selectedProvider = getAIProvider(settings.model_provider);
  const badgeVariant = providerStatus === "Configured" ? "success" : providerStatus === "Planned" ? "info" : "warning";
  const resultVariant = result?.status === "Connection OK" || result?.status === "Configured" ? "success" : result?.status === "Planned" ? "info" : "warning";

  return (
    <section className="settings-panel settings-panel--agent" aria-labelledby="settings-agent">
      <div className="settings-panel__heading">
        <span id="settings-agent">
          <Bot size={15} aria-hidden="true" />
          {t("settings.sections.agent")}
        </span>
        <SettingsStatusBadge variant={badgeVariant}>{t(`settings.aiStatus.${providerStatus}`)}</SettingsStatusBadge>
      </div>

      <div className="settings-form-grid">
        <label className="settings-field">
          <span>{t("settings.fields.modelProvider")}</span>
          <select value={settings.model_provider} onChange={(event) => onChange("model_provider", event.target.value as ModelProvider)}>
            {AI_PROVIDER_REGISTRY.map((provider) => (
              <option key={provider.id} value={provider.id}>{provider.displayName}</option>
            ))}
          </select>
        </label>
        <label className="settings-field">
          <span>{t("settings.fields.modelName")}</span>
          <select value={settings.model_name} onChange={(event) => onChange("model_name", event.target.value)}>
            {selectedProvider.modelOptions.map((model) => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>
        </label>
        <label className="settings-field">
          <span>{t("settings.fields.outputMode")}</span>
          <select value={settings.output_mode} onChange={(event) => onChange("output_mode", event.target.value as OutputMode)}>
            {outputModes.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="settings-field">
          <span>{t("settings.fields.confidenceCalibration")}</span>
          <select value={settings.confidence_calibration} onChange={(event) => onChange("confidence_calibration", event.target.value as ConfidenceCalibration)}>
            {confidenceModes.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="settings-credential-box" aria-label={t("settings.credentials.aria")}>
        <div className="settings-credential-box__heading">
          <span>
            <KeyRound size={15} aria-hidden="true" />
            {t("settings.credentials.title")}
          </span>
          <SettingsStatusBadge variant={credentialStatus?.configured ? "success" : "warning"}>
            {credentialStatus?.configured ? t("settings.credentials.connectionOk") : t("settings.credentials.missingApiKey")}
          </SettingsStatusBadge>
        </div>
        <div className="settings-form-grid">
          <label className="settings-field">
            <span>{t("settings.credentials.apiBaseUrl")}</span>
            <input
              type="url"
              value={credentialDraft.base_url ?? selectedProvider.baseUrl}
              onChange={(event) => onCredentialChange("base_url", event.target.value)}
            />
          </label>
          <label className="settings-field">
            <span>{t("settings.credentials.apiKey")}</span>
            <input
              autoComplete="new-password"
              placeholder={credentialStatus?.masked_key ?? t("settings.credentials.notConfigured")}
              type="password"
              value={credentialDraft.api_key ?? ""}
              onChange={(event) => onCredentialChange("api_key", event.target.value)}
            />
          </label>
          <label className="settings-field">
            <span>{t("settings.credentials.secret")}</span>
            <input
              autoComplete="new-password"
              placeholder={t("settings.credentials.optional")}
              type="password"
              value={credentialDraft.secret ?? ""}
              onChange={(event) => onCredentialChange("secret", event.target.value)}
            />
          </label>
          <label className="settings-field">
            <span>{t("settings.fields.modelName")}</span>
            <input value={credentialDraft.model ?? settings.model_name} onChange={(event) => onCredentialChange("model", event.target.value)} />
          </label>
        </div>
        <div className="settings-credential-box__actions">
          <button className="secondary-action" type="button" disabled={isSavingCredential} onClick={onSaveCredential}>
            <Save size={14} aria-hidden="true" />
            <span>{isSavingCredential ? t("settings.status.synced") : t("settings.credentials.save")}</span>
          </button>
          <button className="secondary-action secondary-action--danger" type="button" disabled={isDeletingCredential || !credentialStatus?.configured} onClick={onDeleteCredential}>
            <Trash2 size={14} aria-hidden="true" />
            <span>{t("settings.credentials.delete")}</span>
          </button>
          <span>{credentialStatus?.masked_key ?? t("settings.credentials.notConfigured")}</span>
        </div>
      </div>

      <button className={settings.structured_hypothesis_enabled ? "settings-toggle is-on" : "settings-toggle"} type="button" onClick={() => onChange("structured_hypothesis_enabled", !settings.structured_hypothesis_enabled)}>
        <Bot size={16} aria-hidden="true" />
        <span>
          <strong>{t("settings.fields.structuredHypothesisMode")}</strong>
          <small>{settings.structured_hypothesis_enabled ? t("settings.status.enabled") : t("settings.status.disabled")}</small>
        </span>
      </button>

      <div className="settings-dual-fields settings-dual-fields--triple">
        <label className="settings-field">
          <span>{t("settings.fields.confidenceLow")}</span>
          <input type="number" min={0} max={100} value={settings.default_confidence_bands.low ?? 35} onChange={(event) => onChange("default_confidence_bands", { ...settings.default_confidence_bands, low: Number(event.target.value) })} />
        </label>
        <label className="settings-field">
          <span>{t("settings.fields.confidenceMedium")}</span>
          <input type="number" min={0} max={100} value={settings.default_confidence_bands.medium ?? 65} onChange={(event) => onChange("default_confidence_bands", { ...settings.default_confidence_bands, medium: Number(event.target.value) })} />
        </label>
        <label className="settings-field">
          <span>{t("settings.fields.confidenceHigh")}</span>
          <input type="number" min={0} max={100} value={settings.default_confidence_bands.high ?? 85} onChange={(event) => onChange("default_confidence_bands", { ...settings.default_confidence_bands, high: Number(event.target.value) })} />
        </label>
      </div>

      <button className="secondary-action" type="button" disabled={isTesting} onClick={onTest}>
        <TestTube2 size={14} aria-hidden="true" />
        <span>{isTesting ? t("settings.status.synced") : t("settings.actions.testAIProvider")}</span>
      </button>
      {result ? (
        <div className="action-feedback action-feedback--inline" role="status">
          <SettingsStatusBadge variant={resultVariant}>{t(`settings.aiStatus.${result.status}`)}</SettingsStatusBadge>
          <span>{`${result.display_name || selectedProvider.displayName} / ${result.model || t("settings.empty.noModel")}`}</span>
          {result.error_message ? <span>{result.error_message}</span> : null}
        </div>
      ) : null}
      <p className="settings-language-note">{t("settings.notes.apiKeysBackendOnly")}</p>
    </section>
  );
}
