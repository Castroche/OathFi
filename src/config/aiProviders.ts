export type AIProviderId =
  | "openai"
  | "anthropic"
  | "gemini"
  | "xai"
  | "mistral"
  | "ollama"
  | "deepseek"
  | "qwen"
  | "zhipu"
  | "moonshot"
  | "baidu_qianfan"
  | "tencent_hunyuan"
  | "minimax";

export type AIProviderDefinition = {
  id: AIProviderId;
  displayName: string;
  baseUrl: string;
  authType: "api_key" | "local" | "ak_sk";
  apiKeyEnvName: string;
  modelOptions: string[];
  defaultModel: string;
  supportsStructuredOutput: boolean;
  supportsToolCalling: boolean;
  supportsReasoningMode: boolean;
  supportsVision: boolean;
  supportsStreaming: boolean;
  region: "global" | "china" | "local";
  compatibilityNotes: string;
};

export const AI_PROVIDER_REGISTRY: AIProviderDefinition[] = [
  {
    id: "deepseek",
    displayName: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    authType: "api_key",
    apiKeyEnvName: "DEEPSEEK_API_KEY",
    modelOptions: ["deepseek-v4-flash", "deepseek-chat", "deepseek-reasoner"],
    defaultModel: "deepseek-v4-flash",
    supportsStructuredOutput: true,
    supportsToolCalling: false,
    supportsReasoningMode: true,
    supportsVision: false,
    supportsStreaming: true,
    region: "china",
    compatibilityNotes: "OpenAI-compatible chat API; reasoning model available separately.",
  },
  {
    id: "openai",
    displayName: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    authType: "api_key",
    apiKeyEnvName: "OPENAI_API_KEY",
    modelOptions: ["gpt-4.1", "gpt-4.1-mini", "gpt-4o", "gpt-4o-mini"],
    defaultModel: "gpt-4.1",
    supportsStructuredOutput: true,
    supportsToolCalling: true,
    supportsReasoningMode: true,
    supportsVision: true,
    supportsStreaming: true,
    region: "global",
    compatibilityNotes: "Native OpenAI API provider.",
  },
  {
    id: "anthropic",
    displayName: "Anthropic Claude",
    baseUrl: "https://api.anthropic.com/v1",
    authType: "api_key",
    apiKeyEnvName: "ANTHROPIC_API_KEY",
    modelOptions: ["claude-3-5-sonnet-latest", "claude-3-5-haiku-latest"],
    defaultModel: "claude-3-5-sonnet-latest",
    supportsStructuredOutput: true,
    supportsToolCalling: true,
    supportsReasoningMode: true,
    supportsVision: true,
    supportsStreaming: true,
    region: "global",
    compatibilityNotes: "Claude Messages API provider.",
  },
  {
    id: "gemini",
    displayName: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    authType: "api_key",
    apiKeyEnvName: "GEMINI_API_KEY",
    modelOptions: ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.0-flash"],
    defaultModel: "gemini-1.5-pro",
    supportsStructuredOutput: true,
    supportsToolCalling: true,
    supportsReasoningMode: true,
    supportsVision: true,
    supportsStreaming: true,
    region: "global",
    compatibilityNotes: "Gemini API provider.",
  },
  {
    id: "xai",
    displayName: "xAI Grok",
    baseUrl: "https://api.x.ai/v1",
    authType: "api_key",
    apiKeyEnvName: "XAI_API_KEY",
    modelOptions: ["grok-2-latest", "grok-2-mini-latest"],
    defaultModel: "grok-2-latest",
    supportsStructuredOutput: true,
    supportsToolCalling: true,
    supportsReasoningMode: true,
    supportsVision: false,
    supportsStreaming: true,
    region: "global",
    compatibilityNotes: "OpenAI-compatible Grok API.",
  },
  {
    id: "mistral",
    displayName: "Mistral",
    baseUrl: "https://api.mistral.ai/v1",
    authType: "api_key",
    apiKeyEnvName: "MISTRAL_API_KEY",
    modelOptions: ["mistral-large-latest", "mistral-small-latest"],
    defaultModel: "mistral-large-latest",
    supportsStructuredOutput: true,
    supportsToolCalling: true,
    supportsReasoningMode: false,
    supportsVision: false,
    supportsStreaming: true,
    region: "global",
    compatibilityNotes: "OpenAI-compatible Mistral endpoint.",
  },
  {
    id: "ollama",
    displayName: "Ollama / Local",
    baseUrl: "http://localhost:11434",
    authType: "local",
    apiKeyEnvName: "OLLAMA_BASE_URL",
    modelOptions: ["qwen2.5:7b", "llama3.1:8b", "deepseek-r1:7b"],
    defaultModel: "qwen2.5:7b",
    supportsStructuredOutput: false,
    supportsToolCalling: false,
    supportsReasoningMode: true,
    supportsVision: false,
    supportsStreaming: true,
    region: "local",
    compatibilityNotes: "Local provider; availability depends on installed Ollama models.",
  },
  {
    id: "qwen",
    displayName: "Qwen / DashScope / Alibaba Bailian",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    authType: "api_key",
    apiKeyEnvName: "QWEN_API_KEY",
    modelOptions: ["qwen-plus", "qwen-turbo", "qwen-max"],
    defaultModel: "qwen-plus",
    supportsStructuredOutput: true,
    supportsToolCalling: true,
    supportsReasoningMode: true,
    supportsVision: true,
    supportsStreaming: true,
    region: "china",
    compatibilityNotes: "DashScope OpenAI-compatible endpoint.",
  },
  {
    id: "zhipu",
    displayName: "Zhipu GLM",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    authType: "api_key",
    apiKeyEnvName: "ZHIPU_API_KEY",
    modelOptions: ["glm-4-plus", "glm-4-flash"],
    defaultModel: "glm-4-plus",
    supportsStructuredOutput: true,
    supportsToolCalling: true,
    supportsReasoningMode: false,
    supportsVision: true,
    supportsStreaming: true,
    region: "china",
    compatibilityNotes: "OpenAI-compatible GLM API.",
  },
  {
    id: "moonshot",
    displayName: "Moonshot Kimi",
    baseUrl: "https://api.moonshot.cn/v1",
    authType: "api_key",
    apiKeyEnvName: "MOONSHOT_API_KEY",
    modelOptions: ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"],
    defaultModel: "moonshot-v1-32k",
    supportsStructuredOutput: true,
    supportsToolCalling: false,
    supportsReasoningMode: false,
    supportsVision: false,
    supportsStreaming: true,
    region: "china",
    compatibilityNotes: "OpenAI-compatible Moonshot endpoint.",
  },
  {
    id: "baidu_qianfan",
    displayName: "Baidu Qianfan / ERNIE",
    baseUrl: "https://qianfan.baidubce.com/v2",
    authType: "api_key",
    apiKeyEnvName: "BAIDU_QIANFAN_API_KEY",
    modelOptions: ["ernie-4.0-turbo-8k", "ernie-3.5-8k"],
    defaultModel: "ernie-4.0-turbo-8k",
    supportsStructuredOutput: true,
    supportsToolCalling: true,
    supportsReasoningMode: false,
    supportsVision: true,
    supportsStreaming: true,
    region: "china",
    compatibilityNotes: "Qianfan/ERNIE provider configuration.",
  },
  {
    id: "tencent_hunyuan",
    displayName: "Tencent Hunyuan",
    baseUrl: "https://hunyuan.tencentcloudapi.com",
    authType: "ak_sk",
    apiKeyEnvName: "TENCENT_SECRET_ID",
    modelOptions: ["hunyuan-turbo", "hunyuan-large"],
    defaultModel: "hunyuan-turbo",
    supportsStructuredOutput: true,
    supportsToolCalling: true,
    supportsReasoningMode: false,
    supportsVision: true,
    supportsStreaming: true,
    region: "china",
    compatibilityNotes: "Tencent Cloud credential flow.",
  },
  {
    id: "minimax",
    displayName: "MiniMax",
    baseUrl: "https://api.minimax.chat/v1",
    authType: "api_key",
    apiKeyEnvName: "MINIMAX_API_KEY",
    modelOptions: ["abab6.5s-chat", "abab6.5-chat"],
    defaultModel: "abab6.5s-chat",
    supportsStructuredOutput: true,
    supportsToolCalling: false,
    supportsReasoningMode: false,
    supportsVision: false,
    supportsStreaming: true,
    region: "china",
    compatibilityNotes: "MiniMax chat provider.",
  },
];

export const DEFAULT_AI_PROVIDER_ID: AIProviderId = "deepseek";

export function getAIProvider(providerId: string | undefined) {
  return AI_PROVIDER_REGISTRY.find((provider) => provider.id === providerId) ?? AI_PROVIDER_REGISTRY.find((provider) => provider.id === DEFAULT_AI_PROVIDER_ID)!;
}

export function isModelAllowedForProvider(providerId: string, model: string) {
  return getAIProvider(providerId).modelOptions.includes(model);
}

export function normalizeProviderModel(providerId: string | undefined, model: string | undefined) {
  const provider = getAIProvider(providerId);
  const normalizedModel = model && provider.modelOptions.includes(model) ? model : provider.defaultModel;
  return { providerId: provider.id, model: normalizedModel };
}
