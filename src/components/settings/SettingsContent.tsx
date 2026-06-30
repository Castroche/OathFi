import { Bot, Database, Globe2, Lock, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAIProviders } from "../../api/ai";
import {
  fetchSettings,
  deleteCredential,
  fetchCredentialStatus,
  resetSettings,
  saveCredential,
  saveSettings,
  settingsToUpdate,
  testAIProvider,
  testMarketSource,
  type CredentialStatus,
  type CredentialUpdate,
  type Settings,
  type SettingsAIProviderTest,
  type SettingsLanguage,
  type SettingsMarketSourceTest,
  type SettingsUpdate,
} from "../../api/settings";
import { getAIProvider, normalizeProviderModel } from "../../config/aiProviders";
import { useAppStore, type Locale } from "../../stores/appStore";
import { SettingsActionsBar } from "./SettingsActionsBar";
import { AgentSettingsCard } from "./AgentSettingsCard";
import { DataSourceSettingsCard } from "./DataSourceSettingsCard";
import { DemoModeSettingsCard } from "./DemoModeSettingsCard";
import { LanguageSettingsCard } from "./LanguageSettingsCard";
import { RiskSettingsCard } from "./RiskSettingsCard";
import { SettingsStatusBadge } from "./SettingsStatusBadge";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "API request failed";
}

function toEditableSettings(settings: Settings): SettingsUpdate {
  const normalized = normalizeProviderModel(settings.model_provider, settings.model_name);
  return {
    ...settingsToUpdate(settings),
    model_provider: normalized.providerId,
    model_name: normalized.model,
    live_trading_enabled: false,
    real_trading_enabled: false,
    demo_mode: settings.demo_mode_enabled,
  };
}

function sanitizeForSave(settings: SettingsUpdate): SettingsUpdate {
  return {
    ...settings,
    live_trading_enabled: false,
    real_trading_enabled: false,
    demo_mode: settings.demo_mode_enabled,
    default_ai_provider: settings.model_provider,
    settings_json: {
      ...(settings.settings_json ?? {}),
      ai_providers: undefined,
    },
  };
}

export function SettingsContent() {
  const { i18n, t } = useTranslation();
  const queryClient = useQueryClient();
  const setLanguage = useAppStore((state) => state.setLanguage);
  const showToast = useAppStore((state) => state.showToast);
  const [form, setForm] = useState<SettingsUpdate | null>(null);
  const [marketResult, setMarketResult] = useState<SettingsMarketSourceTest | undefined>();
  const [aiResult, setAIResult] = useState<SettingsAIProviderTest | undefined>();
  const [credentialDraft, setCredentialDraft] = useState<CredentialUpdate>({});
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: ({ signal }) => fetchSettings(signal),
  });
  const providersQuery = useQuery({
    queryKey: ["ai-providers"],
    queryFn: ({ signal }) => fetchAIProviders(signal),
  });
  const credentialsQuery = useQuery({
    queryKey: ["settings", "credentials"],
    queryFn: ({ signal }) => fetchCredentialStatus(signal),
  });

  useEffect(() => {
    if (!settingsQuery.data) return;
    setForm(toEditableSettings(settingsQuery.data));
    setLastSavedAt(settingsQuery.data.updated_at);
    setLanguage(settingsQuery.data.language as Locale);
    setCredentialDraft((current) => ({
      ...current,
      base_url: current.base_url ?? getAIProvider(settingsQuery.data.model_provider).baseUrl,
      model: current.model ?? settingsQuery.data.model_name,
    }));
  }, [settingsQuery.data, setLanguage]);

  const selectedCredential = useMemo<CredentialStatus | undefined>(() => {
    if (!form) return undefined;
    return credentialsQuery.data?.credentials.find((item) => item.provider === form.model_provider);
  }, [credentialsQuery.data, form]);

  const providerStatus = useMemo<"Configured" | "Not Configured" | "Planned">(() => {
    if (!form) return "Planned";
    if (selectedCredential?.configured) return "Configured";
    const provider = providersQuery.data?.find((item) => item.name === form.model_provider);
    if (!provider) return providersQuery.isLoading ? "Planned" : "Not Configured";
    return provider.configured ? "Configured" : "Not Configured";
  }, [form, providersQuery.data, providersQuery.isLoading, selectedCredential]);

  const saveMutation = useMutation({
    mutationFn: (payload: SettingsUpdate) => saveSettings(sanitizeForSave(payload)),
    onSuccess: (saved) => {
      const next = toEditableSettings(saved);
      setForm(next);
      setLastSavedAt(saved.updated_at);
      setLanguage(saved.language as Locale);
      void i18n.changeLanguage(saved.language);
      queryClient.setQueryData(["settings"], saved);
      showToast({ variant: "success", message: t("settings.feedback.saved") });
    },
    onError: (error) => showToast({ variant: "error", message: errorMessage(error) }),
  });

  const resetMutation = useMutation({
    mutationFn: resetSettings,
    onSuccess: (saved) => {
      const next = toEditableSettings(saved);
      setForm(next);
      setLastSavedAt(saved.updated_at);
      setLanguage(saved.language as Locale);
      void i18n.changeLanguage(saved.language);
      queryClient.setQueryData(["settings"], saved);
      showToast({ variant: "success", message: t("settings.feedback.reset") });
    },
    onError: (error) => showToast({ variant: "error", message: errorMessage(error) }),
  });

  const marketTestMutation = useMutation({
    mutationFn: testMarketSource,
    onSuccess: (result) => {
      setMarketResult(result);
      showToast({ variant: result.status === "connected" ? "success" : "warning", message: `${t("settings.actions.testMarketSource")}: ${result.status}` });
    },
    onError: (error) => showToast({ variant: "error", message: errorMessage(error) }),
  });

  const aiTestMutation = useMutation({
    mutationFn: async () => {
      if (!form) throw new Error("Settings are not loaded.");
      const saved = await saveSettings(sanitizeForSave(form));
      queryClient.setQueryData(["settings"], saved);
      return testAIProvider();
    },
    onSuccess: (result) => {
      setAIResult(result);
      showToast({ variant: result.status === "Configured" ? "success" : "warning", message: `${t("settings.actions.testAIProvider")}: ${result.status}` });
    },
    onError: (error) => showToast({ variant: "error", message: errorMessage(error) }),
  });

  const credentialSaveMutation = useMutation({
    mutationFn: async () => {
      if (!form) throw new Error("Settings are not loaded.");
      const payload: CredentialUpdate = {
        ...credentialDraft,
        base_url: credentialDraft.base_url ?? getAIProvider(form.model_provider).baseUrl,
        model: credentialDraft.model ?? form.model_name,
        is_active: true,
      };
      return saveCredential(form.model_provider, payload);
    },
    onSuccess: (status) => {
      setCredentialDraft((current) => ({ ...current, api_key: "", secret: "", base_url: status.base_url, model: status.model }));
      void queryClient.invalidateQueries({ queryKey: ["settings", "credentials"] });
      void queryClient.invalidateQueries({ queryKey: ["ai-providers"] });
      void queryClient.invalidateQueries({ queryKey: ["ecosystem", "ai-compute"] });
      showToast({ variant: status.configured ? "success" : "warning", message: status.configured ? t("settings.credentials.connectionOk") : t("settings.credentials.missingApiKey") });
    },
    onError: (error) => showToast({ variant: "error", message: errorMessage(error) }),
  });

  const credentialDeleteMutation = useMutation({
    mutationFn: async () => {
      if (!form) throw new Error("Settings are not loaded.");
      return deleteCredential(form.model_provider);
    },
    onSuccess: () => {
      setCredentialDraft((current) => ({ ...current, api_key: "", secret: "" }));
      void queryClient.invalidateQueries({ queryKey: ["settings", "credentials"] });
      void queryClient.invalidateQueries({ queryKey: ["ecosystem", "ai-compute"] });
      showToast({ variant: "success", message: t("settings.credentials.deleted") });
    },
    onError: (error) => showToast({ variant: "error", message: errorMessage(error) }),
  });

  const changeField = <K extends keyof SettingsUpdate>(key: K, value: SettingsUpdate[K]) => {
    setForm((current) => {
      if (!current) return current;
      const next = {
        ...current,
        [key]: value,
        live_trading_enabled: false,
        real_trading_enabled: false,
      };
      if (key === "demo_mode_enabled") {
        next.demo_mode = Boolean(value);
      }
      if (key === "model_provider") {
        const normalized = normalizeProviderModel(String(value), current.model_name);
        next.model_provider = normalized.providerId;
        next.model_name = normalized.model;
        next.default_ai_provider = normalized.providerId;
        setCredentialDraft({
          api_key: "",
          secret: "",
          base_url: getAIProvider(normalized.providerId).baseUrl,
          model: normalized.model,
          is_active: true,
        });
      }
      if (key === "model_name") {
        const normalized = normalizeProviderModel(current.model_provider, String(value));
        next.model_provider = normalized.providerId;
        next.model_name = normalized.model;
        next.default_ai_provider = normalized.providerId;
      }
      return next;
    });
  };

  const handleSave = () => {
    if (form) saveMutation.mutate(form);
  };

  const handleLanguageChange = (language: SettingsLanguage) => {
    if (!form) return;
    const next = { ...form, language, live_trading_enabled: false, real_trading_enabled: false };
    setForm(next);
    setLanguage(language);
    void i18n.changeLanguage(language);
    saveMutation.mutate(next);
  };

  const changeCredentialField = <K extends keyof CredentialUpdate>(key: K, value: CredentialUpdate[K]) => {
    setCredentialDraft((current) => ({ ...current, [key]: value }));
  };

  if (settingsQuery.isLoading) {
    return <section className="settings-workspace"><div className="market-snapshot-empty">{t("settings.status.synced")}</div></section>;
  }

  if (settingsQuery.isError || !form) {
    return (
      <section className="settings-workspace">
        <div className="action-feedback action-feedback--error">{settingsQuery.error ? errorMessage(settingsQuery.error) : t("emptyStates.generic")}</div>
      </section>
    );
  }

  const metrics = [
    { id: "data", icon: Database, label: t("settings.metrics.data.title"), value: form.primary_data_source, meta: `${form.connection_type} / ${form.fallback_method}`, variant: "success" as const },
    { id: "agent", icon: Bot, label: t("settings.metrics.agent.title"), value: getAIProvider(form.model_provider).displayName, meta: providerStatus, variant: providerStatus === "Configured" ? "success" as const : "warning" as const },
    { id: "risk", icon: ShieldCheck, label: t("settings.metrics.risk.title"), value: `${(form.max_risk_per_trade * 100).toFixed(1)}%`, meta: form.paper_trading_enabled ? t("settings.status.paperAvailable") : t("settings.status.paperExecutionUnavailable"), variant: form.paper_trading_enabled ? "info" as const : "warning" as const },
    { id: "language", icon: Globe2, label: t("settings.metrics.language.title"), value: form.language, meta: t("settings.metrics.language.meta"), variant: "success" as const },
  ];

  return (
    <section className="settings-workspace" aria-label={t("settings.aria")}>
      <section className="settings-brief" aria-labelledby="settings-brief-title">
        <div>
          <span className="settings-brief__eyebrow">{t("settings.sections.controlPlane")}</span>
          <h2 id="settings-brief-title">{t("settings.brief.title")}</h2>
          <p>{t("settings.brief.summary")}</p>
          <div className="settings-brief__meta">
            <SettingsStatusBadge variant="info">{t("settings.labels.savedAt")}: {lastSavedAt ? new Date(lastSavedAt).toLocaleString() : t("emptyStates.generic")}</SettingsStatusBadge>
            <SettingsStatusBadge variant="danger">{t("settings.status.liveLocked")}</SettingsStatusBadge>
          </div>
        </div>
        <div className="settings-brief__lock">
          <Lock size={17} aria-hidden="true" />
          <span>{t("settings.labels.executionBoundary")}</span>
          <strong>{t("settings.liveTradingLock")}</strong>
        </div>
      </section>

      <div className="settings-metrics">
        {metrics.map((metric) => {
          const MetricIcon = metric.icon;
          return (
            <article className="settings-metric" key={metric.id}>
              <header>
                <span className={`command-state--${metric.variant}`}>
                  <MetricIcon size={15} aria-hidden="true" />
                </span>
                <h3>{metric.label}</h3>
              </header>
              <strong>{metric.value}</strong>
              <p>{metric.meta}</p>
            </article>
          );
        })}
      </div>

      <SettingsActionsBar
        isSaving={saveMutation.isPending}
        isResetting={resetMutation.isPending}
        isTestingMarket={marketTestMutation.isPending}
        isTestingAI={aiTestMutation.isPending}
        onSave={handleSave}
        onReset={() => resetMutation.mutate()}
        onTestMarket={() => marketTestMutation.mutate()}
        onTestAI={() => aiTestMutation.mutate()}
      />

      <div className="settings-grid">
        <DataSourceSettingsCard settings={form} result={marketResult} isTesting={marketTestMutation.isPending} onChange={changeField} onTest={() => marketTestMutation.mutate()} />
        <AgentSettingsCard
          settings={form}
          providerStatus={providerStatus}
          result={aiResult}
          isTesting={aiTestMutation.isPending}
          credentialStatus={selectedCredential}
          credentialDraft={credentialDraft}
          isSavingCredential={credentialSaveMutation.isPending}
          isDeletingCredential={credentialDeleteMutation.isPending}
          onChange={changeField}
          onCredentialChange={changeCredentialField}
          onSaveCredential={() => credentialSaveMutation.mutate()}
          onDeleteCredential={() => credentialDeleteMutation.mutate()}
          onTest={() => aiTestMutation.mutate()}
        />
        <RiskSettingsCard settings={form} onChange={changeField} />
        <DemoModeSettingsCard settings={form} onChange={changeField} />
        <LanguageSettingsCard settings={form} isSaving={saveMutation.isPending} onLanguageChange={handleLanguageChange} />
      </div>
    </section>
  );
}
