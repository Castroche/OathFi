import {
  Bot,
  Database,
  Globe2,
  Lock,
  Radio,
  Save,
  ShieldCheck,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { StatusPill } from "../common/StatusPill";
import { useAppStore, type Locale } from "../../stores/appStore";
import {
  fetchSettings,
  saveSettings,
  testDataSource,
  type AIProviderKey,
  type AIProviderRuntimeConfig,
} from "../../api/settings";
import { useMarketDataStore } from "../../stores/marketDataStore";
import type { StatusPillVariant } from "../common/StatusPill";

const metricIcons = [Database, Bot, ShieldCheck, Globe2] as const;

const aiProviderOptions: Array<{ key: AIProviderKey; label: string; defaultBase: string; defaultModel: string }> = [
  { key: "deepseek", label: "DeepSeek", defaultBase: "https://api.deepseek.com", defaultModel: "deepseek-chat" },
  { key: "openai", label: "OpenAI", defaultBase: "https://api.openai.com/v1", defaultModel: "gpt-4.1-mini" },
  { key: "anthropic", label: "Anthropic", defaultBase: "https://api.anthropic.com/v1", defaultModel: "claude-3-5-sonnet-latest" },
  { key: "gemini", label: "Gemini", defaultBase: "https://generativelanguage.googleapis.com/v1beta", defaultModel: "gemini-1.5-pro" },
  { key: "openai_compatible", label: "OpenAI 兼容", defaultBase: "", defaultModel: "" },
];

function emptyProviderConfig(provider: AIProviderKey): AIProviderRuntimeConfig {
  const option = aiProviderOptions.find((item) => item.key === provider);
  return {
    api_key: "",
    api_base: option?.defaultBase ?? "",
    model: option?.defaultModel ?? "",
  };
}

export function SettingsContent() {
  const { t } = useTranslation();
  const language = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const showToast = useAppStore((state) => state.showToast);
  const activeSymbol = useMarketDataStore((state) => state.activeSymbol);
  const activeTimeframe = useMarketDataStore((state) => state.activeTimeframe);
  const [dataSourceNotice, setDataSourceNotice] = useState<string | null>(null);
  const [defaultAIProvider, setDefaultAIProvider] = useState<AIProviderKey>("deepseek");
  const [aiProviderConfigs, setAIProviderConfigs] = useState<Partial<Record<AIProviderKey, AIProviderRuntimeConfig>>>({});
  const dataSourceQuery = useQuery({
    queryKey: ["settings", "data-source-test", activeSymbol],
    queryFn: ({ signal }) => testDataSource(activeSymbol, signal),
    enabled: false,
    retry: false,
  });
  const settingsQuery = useQuery({
    queryKey: ["settings", "runtime"],
    queryFn: ({ signal }) => fetchSettings(signal),
    retry: false,
  });
  const saveSettingsMutation = useMutation({
    mutationFn: () => {
      const providerConfig = aiProviderConfigs[defaultAIProvider] ?? emptyProviderConfig(defaultAIProvider);
      return saveSettings({
        default_symbol: activeSymbol,
        default_timeframe: activeTimeframe,
        demo_mode: false,
        default_ai_provider: defaultAIProvider,
        paper_trading_enabled: true,
        real_trading_enabled: false,
        language,
        settings_json: {
          ...(settingsQuery.data?.settings_json ?? {}),
          ai_providers: {
            ...(settingsQuery.data?.settings_json?.ai_providers ?? {}),
            ...aiProviderConfigs,
            [defaultAIProvider]: providerConfig,
          },
        },
      });
    },
    onSuccess: (saved) => {
      setDataSourceNotice(t("settings.feedback.saved"));
      showToast({ variant: "success", message: t("settings.feedback.saved") });
      setLanguage(saved.language as Locale);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : t("errors.generic");
      showToast({ variant: "error", message });
    },
  });

  useEffect(() => {
    const settings = settingsQuery.data;
    if (!settings) {
      return;
    }
    const provider = settings.default_ai_provider as AIProviderKey;
    const supported = aiProviderOptions.some((item) => item.key === provider) ? provider : "deepseek";
    setDefaultAIProvider(supported);
    setAIProviderConfigs(settings.settings_json.ai_providers ?? {});
  }, [settingsQuery.data]);

  const selectLanguage = (nextLanguage: Locale) => {
    setLanguage(nextLanguage);
  };

  const selectedProviderConfig = aiProviderConfigs[defaultAIProvider] ?? emptyProviderConfig(defaultAIProvider);
  const updateSelectedProviderConfig = (field: keyof AIProviderRuntimeConfig, value: string) => {
    setAIProviderConfigs((current) => ({
      ...current,
      [defaultAIProvider]: {
        ...(current[defaultAIProvider] ?? emptyProviderConfig(defaultAIProvider)),
        [field]: value,
      },
    }));
  };
  const settingsMetrics = [
    { id: "market", title: "Market data", value: "HTX WebSocket", meta: "REST snapshots disabled", variant: "info" as const },
    { id: "ai", title: "AI provider", value: defaultAIProvider, meta: selectedProviderConfig.model || "model not configured", variant: selectedProviderConfig.api_key ? "success" as const : "warning" as const },
    { id: "risk", title: "Risk", value: "backend checks", meta: "Requires live market stream", variant: "warning" as const },
    { id: "language", title: "Language", value: language, meta: "stored in runtime settings", variant: "success" as const },
  ];
  const dataSourceSettings = [
    { id: "market", label: "Market source", value: "HTX WebSocket", meta: "Frontend connects to backend /ws/market only.", status: "live-only", variant: "info" as const },
    { id: "rest", label: "REST snapshots", value: "disabled", meta: "No REST cache or fallback is used for market data.", status: "disabled", variant: "warning" as const },
    { id: "simulated", label: "Simulated data", value: "disabled", meta: "Disconnected sources display unavailable.", status: "disabled", variant: "warning" as const },
  ];
  const riskSettings = [
    { id: "execution", label: "Execution", value: "not connected", meta: "Simulated paper order creation is disabled.", status: "disconnected", variant: "warning" as const },
    { id: "realTrading", label: "Real trading", value: "disabled", meta: "No exchange execution connector is configured.", status: "locked", variant: "danger" as const },
  ];

  return (
    <section className="settings-workspace" aria-label={t("settings.aria")}>
      <section className="settings-brief" aria-labelledby="settings-brief-title">
        <div>
          <span className="settings-brief__eyebrow">{t("settings.sections.controlPlane")}</span>
          <h2 id="settings-brief-title">{t("settings.brief.title")}</h2>
          <p>{t("settings.brief.summary")}</p>
        </div>
        <div className="settings-brief__lock">
          <Lock size={17} aria-hidden="true" />
          <span>{t("settings.labels.executionBoundary")}</span>
          <strong>{t("status.liveTradingDisabled")}</strong>
        </div>
      </section>

      <div className="settings-metrics">
        {settingsMetrics.map((metric, index) => {
          const MetricIcon = metricIcons[index % metricIcons.length];
          return (
            <article className="settings-metric" key={metric.id}>
              <header>
                <span className={`command-state--${metric.variant}`}>
                  <MetricIcon size={15} aria-hidden="true" />
                </span>
                <h3>{metric.title}</h3>
              </header>
              <strong>{metric.value}</strong>
              <p>{metric.meta}</p>
            </article>
          );
        })}
      </div>

      <div className="settings-grid">
        <section className="settings-panel settings-panel--data" aria-labelledby="settings-data-source">
          <PanelHeading
            icon={<Database size={15} aria-hidden="true" />}
            title={t("settings.sections.dataSource")}
            pill={t("settings.status.publicOnly")}
            variant="success"
            id="settings-data-source"
          />
          <div className="settings-row-list">
            {dataSourceSettings.map((item) => (
              <article className="settings-row" key={item.id}>
                <div>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <p>{item.meta}</p>
                </div>
            <StatusPill variant={item.variant}>{item.status}</StatusPill>
              </article>
            ))}
          </div>
          <button
            className="secondary-action"
            type="button"
            disabled={dataSourceQuery.isFetching}
            onClick={() => {
              setDataSourceNotice(null);
              void dataSourceQuery.refetch().then((result) => {
                if (result.data) {
                  showToast({
                    variant: result.data.status === "disconnected" ? "warning" : "success",
                    message: `${t("settings.actions.testDataSource")}: ${result.data.status} / ${result.data.source}`,
                  });
                } else if (result.error) {
                  showToast({
                    variant: "error",
                    message: `${t("settings.actions.testDataSource")}: ${(result.error as Error).message}`,
                  });
                }
              });
            }}
          >
            <Radio size={14} aria-hidden="true" />
            <span>{dataSourceQuery.isFetching ? t("loadingStates.syncing") : t("settings.actions.testDataSource")}</span>
          </button>
          {dataSourceQuery.data ? (
            <div className="action-feedback action-feedback--inline" role="status">
              {`${dataSourceQuery.data.status} - ${dataSourceQuery.data.source} (${dataSourceQuery.data.tickerStatus}/${dataSourceQuery.data.orderBookStatus})`}
            </div>
          ) : dataSourceQuery.error ? (
            <div className="action-feedback action-feedback--inline" role="status">
              disconnected - {(dataSourceQuery.error as Error).message}
            </div>
          ) : dataSourceNotice ? (
            <div className="action-feedback action-feedback--inline" role="status">
              {dataSourceNotice}
            </div>
          ) : null}
        </section>

        <section className="settings-panel settings-panel--agent" aria-labelledby="settings-agent">
          <PanelHeading
            icon={<Bot size={15} aria-hidden="true" />}
            title={t("settings.sections.aiProvider")}
            pill={settingsQuery.isFetching ? t("loadingStates.syncing") : t("settings.status.configurable")}
            variant="info"
            id="settings-agent"
          />
          <div className="settings-form-grid">
            <label className="settings-field">
              <span>{t("settings.ai.provider")}</span>
              <select value={defaultAIProvider} onChange={(event) => setDefaultAIProvider(event.target.value as AIProviderKey)}>
                {aiProviderOptions.map((provider) => (
                  <option key={provider.key} value={provider.key}>
                    {provider.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="settings-field">
              <span>{t("settings.ai.model")}</span>
              <input
                value={selectedProviderConfig.model}
                onChange={(event) => updateSelectedProviderConfig("model", event.target.value)}
                placeholder={t("settings.ai.modelPlaceholder")}
              />
            </label>
            <label className="settings-field">
              <span>{t("settings.ai.apiBase")}</span>
              <input
                value={selectedProviderConfig.api_base}
                onChange={(event) => updateSelectedProviderConfig("api_base", event.target.value)}
                placeholder={t("settings.ai.apiBasePlaceholder")}
              />
            </label>
            <label className="settings-field settings-field--secret">
              <span>{t("settings.ai.apiKey")}</span>
              <input
                type="password"
                autoComplete="off"
                value={selectedProviderConfig.api_key}
                onChange={(event) => updateSelectedProviderConfig("api_key", event.target.value)}
                placeholder={t("settings.ai.apiKeyPlaceholder")}
              />
            </label>
          </div>
          <button className="primary-action" type="button" disabled={saveSettingsMutation.isPending} onClick={() => saveSettingsMutation.mutate()}>
            <Save size={14} aria-hidden="true" />
            <span>{saveSettingsMutation.isPending ? t("loadingStates.syncing") : t("actions.saveSettings")}</span>
          </button>
          <p className="settings-language-note">{t("settings.ai.persistenceNote")}</p>
        </section>

        <section className="settings-panel settings-panel--risk" aria-labelledby="settings-risk">
          <PanelHeading
            icon={<ShieldCheck size={15} aria-hidden="true" />}
            title={t("settings.sections.risk")}
            pill={t("settings.status.guardrailsLocked")}
            variant="warning"
            id="settings-risk"
          />
          <div className="settings-rule-table">
            {riskSettings.map((item) => (
              <article className="settings-rule-row" key={item.id}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <p>{item.meta}</p>
                <StatusPill variant={item.variant}>{item.status}</StatusPill>
              </article>
            ))}
          </div>
        </section>

        <section className="settings-panel settings-panel--language" aria-labelledby="settings-language">
          <PanelHeading
            icon={<Globe2 size={15} aria-hidden="true" />}
            title={t("settings.sections.language")}
            pill={t("settings.status.synced")}
            variant="success"
            id="settings-language"
          />
          <div className="settings-language-options" aria-label={t("settings.labels.languageOptions")}>
            <button
              className={language === "en" ? "is-active" : undefined}
              type="button"
              onClick={() => selectLanguage("en")}
            >
              <strong>{t("language.english")}</strong>
              <span>{t("language.englishShort")}</span>
            </button>
            <button
              className={language === "zh-CN" ? "is-active" : undefined}
              type="button"
              onClick={() => selectLanguage("zh-CN")}
            >
              <strong>{t("language.chinese")}</strong>
              <span>{t("language.chineseShort")}</span>
            </button>
          </div>
          <p className="settings-language-note">{t("settings.language.persistenceNote")}</p>
        </section>
      </div>
    </section>
  );
}

type PanelHeadingProps = {
  icon: ReactNode;
  title: string;
  pill: string;
  variant: StatusPillVariant;
  id: string;
};

function PanelHeading({ icon, title, pill, variant, id }: PanelHeadingProps) {
  return (
    <div className="settings-panel__heading">
      <span id={id}>
        {icon}
        {title}
      </span>
      <StatusPill variant={variant}>{pill}</StatusPill>
    </div>
  );
}
