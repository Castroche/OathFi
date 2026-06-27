import { ArrowRight, Brain, RefreshCw, TestTube2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import {
  createStrategyRule,
  fetchAgentContext,
  fetchAgentHypothesis,
  generateAgentHypotheses,
  rejectAgentHypothesis,
  type AgentGenerateResult,
  type AgentHypothesis,
  type StrategyRulePayload,
} from "../../api/agent";
import { fetchAIProviders, testAIProvider, type AIProviderStatus } from "../../api/ai";
import { createBacktest } from "../../api/backtests";
import { ApiError } from "../../api/client";
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
  if (!provider) return { text: "loading", variant: "info" as const };
  if (!provider.configured) return { text: "not configured", variant: "warning" as const };
  if (provider.healthy === false) return { text: "error", variant: "danger" as const };
  return { text: "configured", variant: "success" as const };
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

export function AgentLabContent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const params = useParams<{ hypothesisId?: string }>();
  const queryClient = useQueryClient();
  const activeSymbol = useMarketDataStore((state) => state.activeSymbol);
  const activeTimeframe = useMarketDataStore((state) => state.activeTimeframe);
  const setWorkflowIds = useAppStore((state) => state.setWorkflowIds);
  const setLatestBacktest = useAppStore((state) => state.setLatestBacktest);
  const showToast = useAppStore((state) => state.showToast);
  const [generated, setGenerated] = useState<AgentGenerateResult | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(params.hypothesisId ?? null);
  const [selectedProvider, setSelectedProvider] = useState("deepseek");
  const [selectedModel, setSelectedModel] = useState("");
  const [providerFeedback, setProviderFeedback] = useState<string | null>(null);

  const contextQuery = useQuery({
    queryKey: ["agent-context", activeSymbol, activeTimeframe],
    queryFn: ({ signal }) => fetchAgentContext(activeSymbol, activeTimeframe, signal),
  });
  const hypothesisQuery = useQuery({
    queryKey: ["agent-hypothesis", params.hypothesisId],
    queryFn: ({ signal }) => fetchAgentHypothesis(params.hypothesisId as string, signal),
    enabled: Boolean(params.hypothesisId),
  });
  const providersQuery = useQuery({
    queryKey: ["ai-providers"],
    queryFn: ({ signal }) => fetchAIProviders(signal),
  });

  const providers = providersQuery.data ?? [];
  const activeProvider = providers.find((item) => item.name === selectedProvider);
  const activeProviderStatus = providerStatus(activeProvider);

  useEffect(() => {
    if (activeProvider?.default_model && !selectedModel) {
      setSelectedModel(activeProvider.default_model);
    }
  }, [activeProvider?.default_model, selectedModel]);

  const hypotheses = useMemo(() => {
    if (generated?.hypotheses.length) return generated.hypotheses;
    if (hypothesisQuery.data) return [hypothesisQuery.data];
    return [];
  }, [generated?.hypotheses, hypothesisQuery.data]);
  const selectedHypothesis = hypotheses.find((item) => item.id === selectedId) ?? hypotheses[0] ?? null;
  const agentRun = generated?.agent_run ?? null;
  const context = generated?.context ?? contextQuery.data;

  const generateMutation = useMutation({
    mutationFn: () =>
      generateAgentHypotheses({
        symbol: activeSymbol,
        timeframe: activeTimeframe,
        provider: selectedProvider,
        model: selectedModel || activeProvider?.default_model,
        mode: "ai",
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
        navigate(`/agent-lab/${first.id}`);
      }
      if (!data.is_ai_generated && data.error_message) {
        setProviderFeedback(`${providerLabel(data.provider)} analysis used rule-based fallback: ${data.error_message}`);
      } else {
        setProviderFeedback(null);
      }
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
      if (hypothesis.status === "rejected") {
        throw new ApiError(t("agentLab.feedback.rejectedCannotBacktest", "Rejected hypotheses cannot be sent to backtest."), "REJECTED_HYPOTHESIS");
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
          <h2>{generated?.summary ?? hypothesisQuery.data?.summary ?? t("agentLab.empty.noRun", "Run a new analysis to generate structured A/B/C hypotheses.")}</h2>
          <p>
            {t(
              "agentLab.brief.scope",
              "Research is constrained to public HTX market data, demo indicators, paper-only risk limits, and a backtest-ready rule packet.",
            )}
          </p>
        </div>
        <div className="agent-lab-hero__actions">
          <StatusPill variant={context?.is_mock ? "warning" : "success"}>{context?.source ?? "htx_rest"}</StatusPill>
          <StatusPill variant={activeProviderStatus.variant}>{providerLabel(selectedProvider)} {activeProviderStatus.text}</StatusPill>
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
            {(providers.length ? providers : [{ name: "deepseek", configured: false, healthy: false, default_model: "deepseek-chat", base_url: "", capabilities: { streaming: true, json_mode: true, tools: false, vision: false, reasoning: true } }]).map((provider) => (
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
          selectedHypothesis={selectedHypothesis}
          summary={generated?.summary ?? hypothesisQuery.data?.summary}
          validity={generated?.validity}
          overallConfidence={generated?.overall_confidence}
        />
        <section className="agent-panel agent-panel--hypothesis-list" aria-labelledby="agent-hypotheses">
          <div className="agent-panel__heading">
            <span id="agent-hypotheses">{t("agentLab.sections.hypothesisQueue", "Hypothesis A/B/C")}</span>
            <StatusPill variant={hypotheses.length ? "success" : "warning"}>{hypotheses.length || "empty"}</StatusPill>
          </div>
          <div className="agent-hypothesis-list">
            {hypotheses.map((hypothesis) => (
              <HypothesisCard
                key={hypothesis.id}
                hypothesis={hypothesis}
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
                <p>{t("agentLab.empty.generateFirst", "Create a new analysis to store Hypothesis A/B/C in the database.")}</p>
              </article>
            ) : null}
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
