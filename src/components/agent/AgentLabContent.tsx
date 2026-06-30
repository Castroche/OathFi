import { ArrowRight, Brain, RefreshCw, TestTube2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  createStrategyRule,
  fetchAgentContext,
  fetchAgentHypothesis,
  fetchAgentHypotheses,
  fetchAgentHypothesisTranslations,
  generateAgentHypotheses,
  rejectAgentHypothesis,
  type AgentGenerateResult,
  type AgentHypothesis,
  type AgentTranslations,
  type StrategyRulePayload,
} from "../../api/agent";
import { fetchAIProviders, testAIProvider, type AIProviderStatus } from "../../api/ai";
import { createBacktest } from "../../api/backtests";
import { ApiError } from "../../api/client";
import { fetchSettings } from "../../api/settings";
import { getAIProvider } from "../../config/aiProviders";
import { agentDisplayText, businessCopyLabel, providerStatusLabel, sideLabel, sourceLabel, statusLabel } from "../../lib/displayLabels";
import { useAppStore } from "../../stores/appStore";
import { useMarketDataStore } from "../../stores/marketDataStore";
import { StatusPill } from "../common/StatusPill";
import { AgentReasoningPanel } from "./AgentReasoningPanel";
import { HypothesisCard } from "./HypothesisCard";
import { MarketContextGrid } from "./MarketContextGrid";
import { StrategyRuleBuilder } from "./StrategyRuleBuilder";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "API request failed";
}

function providerLabel(name: string) {
  const labels: Record<string, string> = {
    deepseek: "DeepSeek",
    openai: "OpenAI",
    anthropic: "Anthropic",
    gemini: "Gemini",
    qwen: "Qwen",
    moonshot: "Kimi",
    zhipu: "GLM",
    doubao: "Doubao",
    minimax: "MiniMax",
    baidu_qianfan: "Baidu Qianfan",
    tencent_hunyuan: "Tencent Hunyuan",
    baichuan: "Baichuan",
    siliconflow: "SiliconFlow",
    xai: "xAI",
    mistral: "Mistral",
    openrouter: "OpenRouter",
    groq: "Groq",
    together: "Together",
    fireworks: "Fireworks",
    ollama: "Ollama",
  };
  return labels[name] ?? name;
}

function providerStatus(provider?: AIProviderStatus) {
  if (!provider) return { code: "loading", variant: "info" as const };
  if (!provider.configured) return { code: "not_configured", variant: "warning" as const };
  if (provider.healthy === false) return { code: "error", variant: "danger" as const };
  return { code: "configured", variant: "success" as const };
}

function sixMonthsAgoRange() {
  const end = new Date();
  const start = new Date(end);
  start.setMonth(start.getMonth() - 6);
  return {
    start_time: start.toISOString(),
    end_time: end.toISOString(),
  };
}

function setPath<T extends Record<string, unknown>>(target: T, path: string, value: string) {
  const parts = path.split(".");
  let cursor: Record<string, unknown> = target;
  for (const part of parts.slice(0, -1)) {
    const next = cursor[part];
    if (!next || typeof next !== "object" || Array.isArray(next)) {
      cursor[part] = {};
    }
    cursor = cursor[part] as Record<string, unknown>;
  }
  cursor[parts[parts.length - 1]] = value;
}

function withTranslations(hypothesis: AgentHypothesis | null, translations?: AgentTranslations): AgentHypothesis | null {
  if (!hypothesis || !translations || Object.keys(translations).length === 0) return hypothesis;
  const translated: AgentHypothesis = {
    ...hypothesis,
    translations: { ...(hypothesis.translations ?? {}), ...translations },
    structured_hypothesis: hypothesis.structured_hypothesis
      ? {
          ...hypothesis.structured_hypothesis,
          evidence: { ...hypothesis.structured_hypothesis.evidence },
          entry_plan: { ...hypothesis.structured_hypothesis.entry_plan },
          backtest_rule: { ...hypothesis.structured_hypothesis.backtest_rule },
        }
      : hypothesis.structured_hypothesis,
  };
  for (const [path, value] of Object.entries(translations)) {
    setPath(translated as unknown as Record<string, unknown>, path, value);
  }
  return translated;
}

function backtestDisabledReason(t: ReturnType<typeof useTranslation>["t"], hypothesis: AgentHypothesis) {
  const strategy = hypothesis.structured_hypothesis?.executable_strategy;
  const side = strategy?.side ?? hypothesis.direction;
  const entryPrice = strategy?.entry?.price ?? hypothesis.structured_hypothesis?.entry_plan?.trigger_price;
  const stopLoss = strategy?.exit?.stop_loss ?? hypothesis.structured_hypothesis?.entry_plan?.stop_loss;
  const takeProfit = strategy?.exit?.take_profit_1 ?? hypothesis.structured_hypothesis?.entry_plan?.take_profit_1;
  if (hypothesis.status === "rejected") return t("agentLab.feedback.rejectedCannotBacktest", "Rejected hypotheses cannot be sent to backtest.");
  if (side === "no_trade" || side === "neutral") return t("agentLab.feedback.notTradeableHypothesis", "Non-tradeable hypothesis");
  if (!["long", "short"].includes(String(side)) || entryPrice == null || stopLoss == null || takeProfit == null) {
    return t("agentLab.feedback.missingExecutableStrategy", "Missing executable strategy; backtest is disabled.");
  }
  return undefined;
}

export function AgentLabContent() {
  const { i18n, t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams<{ hypothesisId?: string }>();
  const queryClient = useQueryClient();
  const activeSymbol = useMarketDataStore((state) => state.activeSymbol);
  const activeTimeframe = useMarketDataStore((state) => state.activeTimeframe);
  const setWorkflowIds = useAppStore((state) => state.setWorkflowIds);
  const workflowId = useAppStore((state) => state.workflowId);
  const storeHypothesisId = useAppStore((state) => state.hypothesisId);
  const setLatestAgentHypothesis = useAppStore((state) => state.setLatestAgentHypothesis);
  const setLatestBacktest = useAppStore((state) => state.setLatestBacktest);
  const showToast = useAppStore((state) => state.showToast);
  const [generated, setGenerated] = useState<AgentGenerateResult | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(params.hypothesisId ?? null);
  const [selectedProvider, setSelectedProvider] = useState("deepseek");
  const [selectedModel, setSelectedModel] = useState("");
  const [providerFeedback, setProviderFeedback] = useState<string | null>(null);
  const pathHypothesisId = location.pathname.match(/^\/agent-lab\/([^/]+)/)?.[1];
  const activeHypothesisId = params.hypothesisId ?? pathHypothesisId ?? storeHypothesisId ?? null;

  const contextQuery = useQuery({
    queryKey: ["agent-context", activeSymbol, activeTimeframe],
    queryFn: ({ signal }) => fetchAgentContext(activeSymbol, activeTimeframe, signal),
  });
  const hypothesisQuery = useQuery({
    queryKey: ["agent-hypothesis", activeHypothesisId],
    queryFn: ({ signal }) => fetchAgentHypothesis(activeHypothesisId as string, signal),
    enabled: Boolean(activeHypothesisId),
  });
  const recentHypothesesQuery = useQuery({
    queryKey: ["agent-hypotheses", workflowId],
    queryFn: ({ signal }) => fetchAgentHypotheses({ limit: 20, workflowId }, signal),
    enabled: !activeHypothesisId,
  });
  const providersQuery = useQuery({
    queryKey: ["ai-providers"],
    queryFn: ({ signal }) => fetchAIProviders(signal),
  });
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: ({ signal }) => fetchSettings(signal),
    retry: false,
  });

  const providers = providersQuery.data ?? [];
  const activeProvider = providers.find((item) => item.name === selectedProvider);
  const activeProviderStatus = providerStatus(activeProvider);

  useEffect(() => {
    if (!params.hypothesisId && !pathHypothesisId && storeHypothesisId) {
      navigate(`/agent-lab/${storeHypothesisId}`, { replace: true });
    }
  }, [navigate, params.hypothesisId, pathHypothesisId, storeHypothesisId]);

  useEffect(() => {
    const routeHypothesisId = params.hypothesisId ?? pathHypothesisId;
    if (routeHypothesisId) {
      setSelectedId(routeHypothesisId);
    }
  }, [params.hypothesisId, pathHypothesisId]);

  useEffect(() => {
    if (hypothesisQuery.data) {
      setSelectedId(hypothesisQuery.data.id);
      setLatestAgentHypothesis(hypothesisQuery.data);
      setWorkflowIds({
        workflowId: hypothesisQuery.data.workflow_id,
        hypothesisId: hypothesisQuery.data.id,
        marketEventId: hypothesisQuery.data.market_event_id ?? undefined,
        backtestId: hypothesisQuery.data.latest_backtest_result_id ?? undefined,
        riskCheckId: hypothesisQuery.data.latest_risk_check_id ?? undefined,
        paperOrderId: hypothesisQuery.data.latest_paper_order_id ?? undefined,
      });
    }
  }, [hypothesisQuery.data, setLatestAgentHypothesis, setWorkflowIds]);

  useEffect(() => {
    if (!activeHypothesisId && recentHypothesesQuery.data?.[0]) {
      const latest = recentHypothesesQuery.data[0];
      setSelectedId(latest.id);
      setLatestAgentHypothesis(latest);
      setWorkflowIds({
        workflowId: latest.workflow_id,
        hypothesisId: latest.id,
        marketEventId: latest.market_event_id ?? undefined,
        backtestId: latest.latest_backtest_result_id ?? undefined,
        riskCheckId: latest.latest_risk_check_id ?? undefined,
        paperOrderId: latest.latest_paper_order_id ?? undefined,
      });
    }
  }, [activeHypothesisId, recentHypothesesQuery.data, setLatestAgentHypothesis, setWorkflowIds]);

  useEffect(() => {
    if (activeProvider?.default_model && !selectedModel) {
      setSelectedModel(activeProvider.default_model);
    }
  }, [activeProvider?.default_model, selectedModel]);

  useEffect(() => {
    if (!settingsQuery.data) return;
    const provider = getAIProvider(settingsQuery.data.model_provider).id;
    setSelectedProvider(provider);
    setSelectedModel(settingsQuery.data.model_name || providersQuery.data?.find((item) => item.name === provider)?.default_model || "");
  }, [providersQuery.data, settingsQuery.data]);

  const hypotheses = useMemo(() => {
    if (generated?.hypotheses.length) return generated.hypotheses;
    if (hypothesisQuery.data) return [hypothesisQuery.data];
    if (recentHypothesesQuery.data?.length) return recentHypothesesQuery.data;
    return [];
  }, [generated?.hypotheses, hypothesisQuery.data, recentHypothesesQuery.data]);
  const selectedHypothesis = hypotheses.find((item) => item.id === selectedId) ?? hypotheses[0] ?? null;
  const targetLanguage = i18n.language.toLowerCase().startsWith("zh") ? "zh-CN" : "en";
  const translationsQuery = useQuery({
    queryKey: ["agent-hypothesis-translations", selectedHypothesis?.id, targetLanguage],
    queryFn: ({ signal }) => fetchAgentHypothesisTranslations(selectedHypothesis?.id as string, targetLanguage, signal),
    enabled: Boolean(selectedHypothesis?.id),
    staleTime: 5 * 60_000,
    retry: false,
  });
  const selectedHypothesisForDisplay = withTranslations(selectedHypothesis, translationsQuery.data?.translations);
  const agentRun = generated?.agent_run ?? null;
  const context = generated?.context ?? contextQuery.data;
  const heroTitle =
    selectedHypothesisForDisplay?.structured_hypothesis?.thesis_summary ??
    generated?.structured_hypothesis?.thesis_summary ??
    hypothesisQuery.data?.structured_hypothesis?.thesis_summary ??
    generated?.summary ??
    hypothesisQuery.data?.summary;

  const generateMutation = useMutation({
    mutationFn: () =>
      generateAgentHypotheses({
        symbol: activeSymbol,
        timeframe: activeTimeframe,
        provider: selectedProvider,
        model: selectedModel || activeProvider?.default_model,
        mode: "ai",
        language: i18n.language.toLowerCase().startsWith("zh") ? "zh-CN" : "en",
        context: {
          operator_mode: "paper_research_only",
        },
      }),
    onSuccess: (data) => {
      setGenerated(data);
      const first = data.hypotheses[0];
      if (first) {
        setSelectedId(first.id);
        setWorkflowIds({
          workflowId: data.agent_run.workflow_id,
          hypothesisId: first.id,
          marketEventId: first.market_event_id ?? undefined,
        });
        setLatestAgentHypothesis(first);
        navigate(`/agent-lab/${first.id}`);
      }
      if (!data.is_ai_generated && (data.fallback_reason ?? data.error_message)) {
        setProviderFeedback(`${providerLabel(selectedProvider)} ${t("agentLab.feedback.ruleBasedFallback")}: ${data.fallback_reason ?? data.error_message}`);
      } else {
        setProviderFeedback(null);
      }
      void queryClient.invalidateQueries({ queryKey: ["agent-hypotheses"] });
      showToast({ variant: "success", message: t("agentLab.feedback.generated", "Agent run created and hypotheses stored.") });
    },
    onError: (error) => showToast({ variant: "error", message: errorMessage(error) }),
  });

  const testProviderMutation = useMutation({
    mutationFn: () => testAIProvider(selectedProvider, selectedModel || activeProvider?.default_model),
    onSuccess: (result) => {
      const message = result.ok
        ? `${providerLabel(result.provider)} ready (${result.latency_ms} ms)`
        : `${providerLabel(result.provider)} test failed: ${result.error_message ?? result.error_type ?? "provider error"}`;
      setProviderFeedback(message);
      showToast({ variant: result.ok ? "success" : "error", message });
      void queryClient.invalidateQueries({ queryKey: ["ai-providers"] });
    },
    onError: (error) => {
      const message = errorMessage(error);
      setProviderFeedback(message);
      showToast({ variant: "error", message });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (hypothesis: AgentHypothesis) => rejectAgentHypothesis(hypothesis.id),
    onSuccess: (updated) => {
      setGenerated((current) =>
        current
          ? {
              ...current,
              hypotheses: current.hypotheses.map((item) => (item.id === updated.id ? updated : item)),
            }
          : current,
      );
      void queryClient.invalidateQueries({ queryKey: ["agent-hypothesis", updated.id] });
      void queryClient.invalidateQueries({ queryKey: ["agent-hypotheses"] });
      showToast({ variant: "success", message: t("agentLab.feedback.rejected", "Hypothesis rejected and persisted.") });
    },
    onError: (error) => showToast({ variant: "error", message: errorMessage(error) }),
  });

  const saveRuleMutation = useMutation({
    mutationFn: ({ hypothesis, payload }: { hypothesis: AgentHypothesis; payload: StrategyRulePayload }) => createStrategyRule(hypothesis.id, payload),
    onSuccess: (rule) => {
      showToast({ variant: "success", message: t("agentLab.feedback.ruleSaved", { id: rule.id, defaultValue: "Strategy rule draft saved: {{id}}" }) });
    },
    onError: (error) => showToast({ variant: "error", message: errorMessage(error) }),
  });

  const backtestMutation = useMutation({
    mutationFn: (hypothesis: AgentHypothesis) => {
      const disabledReason = backtestDisabledReason(t, hypothesis);
      if (disabledReason) {
        throw new ApiError(disabledReason, "HYPOTHESIS_NOT_TRADEABLE");
      }
      return createBacktest({
        hypothesis_id: hypothesis.id,
        symbol: hypothesis.symbol,
        timeframe: hypothesis.timeframe,
        ...sixMonthsAgoRange(),
        initial_capital: 10000,
      });
    },
    onSuccess: (backtest) => {
      setWorkflowIds({ workflowId: backtest.workflow_id, hypothesisId: backtest.hypothesis_id, backtestId: backtest.id });
      setLatestBacktest(backtest);
      showToast({ variant: "success", message: t("agentLab.feedback.backtestCreated", { id: backtest.id, defaultValue: "Backtest created: {{id}}" }) });
      navigate(`/backtest/${backtest.id}`);
    },
    onError: (error) => showToast({ variant: "error", message: errorMessage(error) }),
  });

  const handleSaveDraft = (payload: StrategyRulePayload) => {
    if (!selectedHypothesis) return;
    saveRuleMutation.mutate({ hypothesis: selectedHypothesis, payload });
  };

  const handleSendToBacktest = (payload: StrategyRulePayload) => {
    if (!selectedHypothesis) return;
    saveRuleMutation.mutate(
      { hypothesis: selectedHypothesis, payload },
      {
        onSuccess: () => backtestMutation.mutate(selectedHypothesis),
      },
    );
  };

  return (
    <section className="agent-lab agent-lab--structured" aria-label={t("agentLab.aria")}>
      <div className="agent-lab-hero">
        <div>
          <span className="agent-lab-hero__eyebrow">
            <Brain size={15} aria-hidden="true" />
            {t("agentLab.name")}
          </span>
          <h2>
            {heroTitle
              ? businessCopyLabel(t, agentDisplayText(t, i18n.language, "summary", heroTitle, selectedHypothesisForDisplay ?? undefined))
                : t("agentLab.empty.noRun", "Run a new analysis to generate structured A/B/C hypotheses.")}
          </h2>
          <p>
            {t(
              "agentLab.brief.scope",
              "Research is constrained to public HTX market data, demo indicators, paper-only risk limits, and a backtest-ready rule packet.",
            )}
          </p>
        </div>
        <div className="agent-lab-hero__actions">
          <StatusPill variant={context?.is_mock ? "warning" : "success"}>{sourceLabel(t, context?.source ?? "htx_rest")}</StatusPill>
          <StatusPill variant={activeProviderStatus.variant}>{providerLabel(selectedProvider)} {providerStatusLabel(t, activeProviderStatus.code)}</StatusPill>
          <StatusPill variant="info">
            {agentDisplayText(t, i18n.language, "output_mode", settingsQuery.data?.output_mode ?? "Structured")} /{" "}
            {agentDisplayText(t, i18n.language, "confidence_calibration", settingsQuery.data?.confidence_calibration ?? "Balanced")}
          </StatusPill>
          <button type="button" className="primary-action" disabled={generateMutation.isPending || contextQuery.isLoading} onClick={() => generateMutation.mutate()}>
            <span>{generateMutation.isPending ? t("loadingStates.generating") : t("agentLab.actions.newAnalysis", "New Analysis")}</span>
            {generateMutation.isPending ? <RefreshCw size={14} aria-hidden="true" /> : <ArrowRight size={14} aria-hidden="true" />}
          </button>
        </div>
      </div>
      <div className="agent-provider-bar" aria-label={t("agentLab.provider.aria", "AI provider controls")}>
        <label>
          <span>{t("agentLab.provider.provider", "Provider")}</span>
          <select
            value={selectedProvider}
            onChange={(event) => {
              const next = event.target.value;
              const nextProvider = providers.find((item) => item.name === next);
              setSelectedProvider(next);
              setSelectedModel(nextProvider?.default_model ?? "");
              setProviderFeedback(null);
            }}
          >
            {(providers.length ? providers : [{ name: "deepseek", configured: false, healthy: false, default_model: "deepseek-v4-flash", base_url: "", capabilities: { streaming: true, json_mode: true, tools: false, vision: false, reasoning: true } }]).map((provider) => (
              <option key={provider.name} value={provider.name}>
                {providerLabel(provider.name)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t("agentLab.provider.model", "Model")}</span>
          <input
            value={selectedModel}
            placeholder={activeProvider?.default_model || t("agentLab.provider.modelPlaceholder", "Model name")}
            onChange={(event) => setSelectedModel(event.target.value)}
          />
        </label>
        <button type="button" className="secondary-action" disabled={testProviderMutation.isPending || providersQuery.isLoading} onClick={() => testProviderMutation.mutate()}>
          {testProviderMutation.isPending ? <RefreshCw size={14} aria-hidden="true" /> : <TestTube2 size={14} aria-hidden="true" />}
          <span>{testProviderMutation.isPending ? t("loadingStates.syncing") : t("agentLab.provider.test", "Test Provider")}</span>
        </button>
        <p>
          {activeProvider?.configured
            ? activeProvider.last_error ?? activeProvider.base_url
            : t("agentLab.provider.configureHint", "Configure this provider API key in backend/.env.")}
        </p>
      </div>

      {generateMutation.isError ? <div className="action-feedback action-feedback--error">{errorMessage(generateMutation.error)}</div> : null}
      {providerFeedback ? <div className={providerFeedback.includes("failed") ? "action-feedback action-feedback--error" : "action-feedback"}>{providerFeedback}</div> : null}
      {hypothesisQuery.isError ? <div className="action-feedback action-feedback--error">{errorMessage(hypothesisQuery.error)}</div> : null}

      <div className="agent-lab-structured-grid">
        <MarketContextGrid context={context} isLoading={contextQuery.isLoading} error={contextQuery.error ? errorMessage(contextQuery.error) : null} />
        <AgentReasoningPanel
          agentRun={agentRun}
          selectedHypothesis={selectedHypothesisForDisplay}
          summary={selectedHypothesisForDisplay?.summary ?? generated?.summary ?? hypothesisQuery.data?.summary}
          validity={generated?.validity}
          overallConfidence={generated?.overall_confidence}
        />
        <section className="agent-panel agent-panel--hypothesis-list" aria-labelledby="agent-hypotheses">
          <div className="agent-panel__heading">
            <span id="agent-hypotheses">{t("agentLab.sections.hypothesisQueue")}</span>
            <StatusPill variant={hypotheses.length ? "success" : "warning"}>{hypotheses.length || t("agentLab.empty.emptyShort")}</StatusPill>
          </div>
          <div className="agent-hypothesis-list">
            {hypotheses.map((hypothesis) => (
              <HypothesisCard
                key={hypothesis.id}
                hypothesis={hypothesis.id === selectedHypothesisForDisplay?.id ? selectedHypothesisForDisplay : hypothesis}
                isSelected={selectedHypothesis?.id === hypothesis.id}
                isRunningBacktest={backtestMutation.isPending}
                isRejecting={rejectMutation.isPending}
                onRunBacktest={(item) => backtestMutation.mutate(item)}
                onEditRule={(item) => setSelectedId(item.id)}
                onReject={(item) => rejectMutation.mutate(item)}
              />
            ))}
            {!hypotheses.length ? (
              <article className="agent-empty-state">
                <strong>{t("agentLab.empty.noHypotheses", "No stored hypotheses yet.")}</strong>
                <p>{t("agentLab.empty.generateFirst")}</p>
              </article>
            ) : null}
          </div>
        </section>
        <section className="agent-panel agent-panel--recent" aria-labelledby="agent-recent-hypotheses">
          <div className="agent-panel__heading">
            <span id="agent-recent-hypotheses">{t("agentLab.sections.recentHypotheses")}</span>
            <StatusPill variant="info">{recentHypothesesQuery.data?.length ?? hypotheses.length}</StatusPill>
          </div>
          <div className="agent-recent-list">
            {(recentHypothesesQuery.data ?? hypotheses).slice(0, 10).map((hypothesis) => (
              <article className="agent-recent-item" key={hypothesis.id}>
                <div>
                  <strong>{hypothesis.symbol}</strong>
                  <span>{new Date(hypothesis.created_at).toLocaleString()}</span>
                </div>
                <span>{sideLabel(t, hypothesis.direction)}</span>
                <span>{hypothesis.confidence}</span>
                <StatusPill variant={hypothesis.status === "rejected" ? "danger" : "info"}>{statusLabel(t, hypothesis.status)}</StatusPill>
                <span>{providerLabel(hypothesis.provider)} / {hypothesis.model}</span>
                <div className="agent-recent-item__actions">
                  <button type="button" className="secondary-action" onClick={() => navigate(`/agent-lab/${hypothesis.id}`)}>
                    {t("agentLab.actions.viewDetails")}
                  </button>
                  <button type="button" className="secondary-action" disabled={backtestMutation.isPending || hypothesis.status === "rejected"} onClick={() => backtestMutation.mutate(hypothesis)}>
                    {backtestMutation.isPending ? t("loadingStates.backtesting") : t("agentLab.actions.sendToBacktest")}
                  </button>
                </div>
              </article>
            ))}
            {recentHypothesesQuery.isLoading ? <div className="market-snapshot-empty">{t("loadingStates.syncing")}</div> : null}
            {recentHypothesesQuery.isError ? <div className="action-feedback action-feedback--error">{errorMessage(recentHypothesesQuery.error)}</div> : null}
          </div>
        </section>
        <StrategyRuleBuilder
          hypothesis={selectedHypothesis}
          isSaving={saveRuleMutation.isPending}
          isSending={saveRuleMutation.isPending || backtestMutation.isPending}
          onSaveDraft={handleSaveDraft}
          onSendToBacktest={handleSendToBacktest}
        />
      </div>
    </section>
  );
}
