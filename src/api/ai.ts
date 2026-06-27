import { apiJson, apiRequest } from "./client";

export type AIAnalyzeRequest = {
  symbol: string;
  task: string;
  provider?: string;
  model?: string;
  context?: Record<string, unknown>;
};

export type AIAnalysis = {
  id: string;
  workflow_id?: string | null;
  provider: string;
  model: string;
  task: string;
  summary: string;
  signals: string[];
  risks: string[];
  recommendation: string;
  confidence: number;
  created_at: string;
  is_mock: boolean;
  source: string;
  status: string;
};

export function analyzeWithBackendAI(payload: AIAnalyzeRequest) {
  return apiJson<AIAnalysis>("/api/ai/analyze", {
    ...payload,
  });
}

export type AIProviderStatus = {
  name: string;
  configured: boolean;
  healthy: boolean | null;
  default_model: string;
  base_url: string;
  capabilities: {
    streaming: boolean;
    json_mode: boolean;
    tools: boolean;
    vision: boolean;
    reasoning: boolean;
  };
  last_error?: string | null;
};

export type AIProviderTestResult = {
  ok: boolean;
  provider: string;
  model: string;
  latency_ms: number;
  error_type?: string | null;
  error_message?: string | null;
};

export function fetchAIProviders(signal?: AbortSignal) {
  return apiRequest<AIProviderStatus[]>("/api/ai/providers", { signal });
}

export function testAIProvider(provider: string, model?: string) {
  return apiJson<AIProviderTestResult>("/api/ai/providers/test", { provider, model });
}
