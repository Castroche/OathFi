from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[2]
PROJECT_DIR = BACKEND_DIR.parent


class Settings(BaseSettings):
    app_version: str = "0.1.0"
    database_url: str = "sqlite:///./oathfi_demo.db"
    backend_port: int = 8001

    ai_mock_mode: bool = False
    default_ai_provider: str = "deepseek"
    default_ai_task_model: str = ""
    ai_timeout_seconds: int = 45
    ai_require_strict_json: bool = True
    ai_json_repair_enabled: bool = True

    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com"
    deepseek_default_model: str = ""
    deepseek_model: str = "deepseek-chat"

    openai_api_key: str = ""
    openai_base_url: str = "https://api.openai.com/v1"
    openai_default_model: str = ""
    openai_model: str = "gpt-4.1-mini"
    openai_reasoning_model: str = ""

    anthropic_api_key: str = ""
    anthropic_base_url: str = "https://api.anthropic.com/v1"
    anthropic_default_model: str = ""
    anthropic_model: str = "claude-3-5-sonnet-latest"
    anthropic_reasoning_model: str = ""

    gemini_api_key: str = ""
    gemini_base_url: str = "https://generativelanguage.googleapis.com/v1beta"
    gemini_default_model: str = ""
    gemini_model: str = "gemini-1.5-pro"
    gemini_fast_model: str = ""

    qwen_api_key: str = ""
    qwen_base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    qwen_default_model: str = ""

    moonshot_api_key: str = ""
    moonshot_base_url: str = "https://api.moonshot.cn/v1"
    moonshot_default_model: str = ""

    zhipu_api_key: str = ""
    zhipu_base_url: str = "https://open.bigmodel.cn/api/paas/v4"
    zhipu_default_model: str = ""

    volcengine_api_key: str = ""
    volcengine_base_url: str = "https://ark.cn-beijing.volces.com/api/v3"
    doubao_default_model: str = ""

    minimax_api_key: str = ""
    minimax_group_id: str = ""
    minimax_base_url: str = ""
    minimax_default_model: str = ""

    baidu_qianfan_api_key: str = ""
    baidu_qianfan_secret_key: str = ""
    baidu_qianfan_base_url: str = ""
    baidu_qianfan_default_model: str = ""

    tencent_secret_id: str = ""
    tencent_secret_key: str = ""
    tencent_hunyuan_default_model: str = ""

    baichuan_api_key: str = ""
    baichuan_base_url: str = ""
    baichuan_default_model: str = ""

    siliconflow_api_key: str = ""
    siliconflow_base_url: str = "https://api.siliconflow.cn/v1"
    siliconflow_default_model: str = ""

    xai_api_key: str = ""
    xai_base_url: str = "https://api.x.ai/v1"
    xai_default_model: str = ""

    mistral_api_key: str = ""
    mistral_base_url: str = "https://api.mistral.ai/v1"
    mistral_default_model: str = ""

    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_default_model: str = ""
    openrouter_fallback_models: str = ""

    groq_api_key: str = ""
    groq_base_url: str = "https://api.groq.com/openai/v1"
    groq_default_model: str = ""

    together_api_key: str = ""
    together_base_url: str = "https://api.together.xyz/v1"
    together_default_model: str = ""

    fireworks_api_key: str = ""
    fireworks_base_url: str = "https://api.fireworks.ai/inference/v1"
    fireworks_default_model: str = ""

    ollama_base_url: str = "http://127.0.0.1:11434"
    ollama_default_model: str = "gemma4:26b"

    paper_trading_enabled: bool = True
    real_trading_enabled: bool = False

    model_config = SettingsConfigDict(
        env_file=(PROJECT_DIR / ".env", BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
