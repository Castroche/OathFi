# OathFi AI Gateway

## 1. 目标

本文件用于约束 OathFi 的 AI 接入方式。

AI 的职责是对现有数据进行分析、解释、生成交易假设、生成风险说明和复盘报告。AI 不直接下单，不绕过风控，不替代回测结果。

---

## 2. 核心原则

```txt
1. 前端不得直接调用 AI 厂商 API。
2. API Key 只能存在后端 .env。
3. 所有 AI 调用必须经过后端 AI Gateway。
4. 所有 AI 输入、输出、错误都要保存日志。
5. AI 输出必须尽量结构化，不能只返回一段自由文本。
6. AI 分析只能作为辅助，不得伪装成确定性交易信号。
```

---

## 3. 目录结构

```txt
backend/app/providers/ai/
  base.py
  deepseek.py
  openai.py
  anthropic.py
  gemini.py
  local_mock.py

backend/app/services/
  ai_gateway.py

backend/app/api/
  ai.py
  hypotheses.py
```

---

## 4. 环境变量

`.env.example`：

```env
DEFAULT_AI_PROVIDER=deepseek

DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-chat

OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini

ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-3-5-sonnet-latest

GEMINI_API_KEY=
GEMINI_MODEL=gemini-1.5-pro

AI_TIMEOUT_SECONDS=30
AI_MOCK_MODE=true
```

约束：

```txt
1. .env 不得提交到 Git。
2. .env.example 可以提交，但不能包含真实密钥。
3. 前端不得出现任何 AI API Key。
```

---

## 5. Provider 抽象

统一接口：

```python
class AIProvider:
    name: str

    async def analyze(self, request: AIAnalyzeRequest) -> AIAnalyzeResponse:
        ...
```

所有 Provider 返回统一结构：

```json
{
  "provider": "deepseek",
  "model": "deepseek-chat",
  "summary": "...",
  "signals": [],
  "risks": [],
  "recommendation": "wait_for_confirmation",
  "confidence": 62,
  "raw_output": {}
}
```

---

## 6. AI 任务类型

支持任务：

```txt
market_analysis
hypothesis_generation
risk_explanation
backtest_explanation
audit_summary
news_explanation
onchain_explanation
```

---

## 7. 生成交易假设输出格式

AI 生成交易假设时必须输出结构化字段：

```json
{
  "direction": "long",
  "entry_condition": "15m candle closes above resistance with stable spread",
  "invalid_condition": "price falls back below MA20",
  "stop_loss": 3392,
  "take_profit": 3544,
  "confidence": 33,
  "feasibility": 32,
  "risk": 100,
  "long_confidence": 47,
  "short_confidence": 49,
  "summary": "Breakout attempt with insufficient confirmation.",
  "reasons": [],
  "warnings": []
}
```

字段含义：

```txt
confidence       代表方向判断可信度
feasibility      代表交易执行可行性
risk             代表风险强度，越高越危险
long_confidence  做多方向得分
short_confidence 做空方向得分
```

---

## 8. AI 禁止事项

AI 不允许：

```txt
1. 直接创建真实订单。
2. 直接绕过风控。
3. 在没有行情数据时伪造行情。
4. 将 mock 数据说成真实数据。
5. 输出“必涨”“必中”“确定盈利”等绝对化表达。
6. 在没有回测时伪造回测结论。
```

---

## 9. Fallback 策略

当主模型失败：

```txt
1. 记录 ai_analyses.status = failed。
2. 记录 error_message。
3. 返回前端明确错误。
4. 如果 AI_MOCK_MODE=true，可以使用 local_mock，但必须返回 is_mock=true。
5. UI 必须显示 Mock 标记。
```

---

## 10. AI 日志

每次 AI 调用必须记录：

```txt
provider
model
task
input_json
output_json
summary
confidence
status
error_message
latency_ms
token_usage_json
is_mock
created_at
```

---

## 11. Prompt 约束

Prompt 必须包含：

```txt
1. 当前交易对。
2. 当前时间周期。
3. 行情摘要。
4. 订单簿摘要。
5. 新闻和链上事件。
6. 当前风险状态。
7. 输出 JSON Schema。
8. 禁止绝对化收益承诺。
```

---

## 12. 前端使用方式

前端只能调用：

```txt
POST /api/ai/analyze
POST /api/hypotheses/generate
```

不得调用：

```txt
https://api.openai.com/...
https://api.deepseek.com/...
https://api.anthropic.com/...
https://generativelanguage.googleapis.com/...
```

---

## 13. 验收标准

```txt
1. 前端代码中搜索不到 AI API Key。
2. 前端没有直接调用 AI 厂商域名。
3. 后端 .env.example 存在。
4. AI Gateway 支持至少 local_mock 和一个真实 provider 结构。
5. AI 输出可以保存到 ai_analyses。
6. AI 失败时前端可以看到明确错误。
7. Mock AI 输出必须显示 Mock 标记。
```
