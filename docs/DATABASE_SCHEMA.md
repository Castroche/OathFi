# OathFi Database Schema

## 1. 目标

本文件用于约束 OathFi Demo 阶段数据库设计。

Demo 阶段推荐使用：

```txt
SQLite + SQLAlchemy + Alembic
```

后续正式化后迁移：

```txt
PostgreSQL
```

数据库必须支撑完整链路：

```txt
市场事件
→ AI 假设
→ 回测结果
→ 风控结果
→ 模拟订单
→ 审计报告
```

---

## 2. 通用字段

建议所有核心表包含：

```txt
id
workflow_id
created_at
updated_at
```

部分表包含：

```txt
symbol
timeframe
source
status
is_mock
metadata_json
```

---

## 3. market_events

用途：保存市场事件、新闻事件、链上事件、风险事件。

字段：

```txt
id                 string primary key
workflow_id        string nullable
symbol             string
title              string
summary            text
event_type         string   // market, news, onchain, risk, audit
source             string
severity           integer
is_mock            boolean
raw_payload_json   json
created_at         datetime
updated_at         datetime
```

---

## 4. ai_analyses

用途：保存 AI 输入、输出、模型、供应商、错误。

字段：

```txt
id                 string primary key
workflow_id        string
provider           string
model              string
task               string
input_json         json
output_json        json
summary            text
confidence         integer
status             string   // completed, failed
error_message      text nullable
latency_ms         integer nullable
token_usage_json   json nullable
is_mock            boolean
created_at         datetime
updated_at         datetime
```

---

## 5. hypotheses

用途：保存交易假设。

字段：

```txt
id                    string primary key
workflow_id           string
market_event_id       string nullable
ai_analysis_id        string nullable
symbol                string
timeframe             string
direction             string   // long, short, neutral, no_trade
entry_condition       text
invalid_condition     text
stop_loss             float nullable
take_profit           float nullable
confidence            integer
feasibility           integer
risk                  integer
long_confidence       integer nullable
short_confidence      integer nullable
summary               text
reasons_json          json
warnings_json         json
status                string   // draft, ready_for_backtest, rejected
is_mock               boolean
created_at            datetime
updated_at            datetime
```

---

## 6. backtest_jobs

用途：保存回测任务。

字段：

```txt
id                    string primary key
workflow_id           string
hypothesis_id         string
symbol                string
timeframe             string
start_time            datetime
end_time              datetime
initial_capital       float
status                string   // pending, running, completed, failed
error_message         text nullable
created_at            datetime
updated_at            datetime
```

---

## 7. backtest_results

用途：保存回测结果。

字段：

```txt
id                    string primary key
workflow_id           string
backtest_job_id       string
hypothesis_id         string
win_rate              float
profit_factor         float
expectancy            float
max_drawdown          float
trade_count           integer
avg_rr                float
sample_quality        string
equity_curve_json     json
trades_json           json
metrics_json          json
status                string
created_at            datetime
updated_at            datetime
```

---

## 8. risk_checks

用途：保存风控检查结果。

字段：

```txt
id                    string primary key
workflow_id           string
hypothesis_id         string
backtest_id           string nullable
decision              string   // PASS, WARNING, BLOCK
account_equity        float
risk_per_trade        float
position_size         float
entry_price           float
stop_loss             float
take_profit           float nullable
checks_json           json
warnings_json         json
block_reasons_json    json
created_at            datetime
updated_at            datetime
```

---

## 9. paper_orders

用途：保存模拟订单。

字段：

```txt
id                    string primary key
workflow_id           string
hypothesis_id         string
backtest_id           string nullable
risk_check_id         string
symbol                string
side                  string   // buy, sell
order_type            string   // market, limit
price                 float
quantity              float
stop_loss             float nullable
take_profit           float nullable
status                string   // created, filled, cancelled, rejected
is_real_trade         boolean  // must be false in Demo
execution_mode        string   // paper
error_message         text nullable
created_at            datetime
updated_at            datetime
```

约束：

```txt
Demo 阶段 is_real_trade 必须为 false。
风控 decision 为 BLOCK 时不得创建 paper_orders。
```

---

## 10. audit_reports

用途：保存审计报告。

字段：

```txt
id                    string primary key
workflow_id           string
title                 string
symbol                string
hypothesis_id         string
backtest_id           string nullable
risk_check_id         string nullable
paper_order_id        string nullable
summary               text
market_context_json   json
hypothesis_json       json
backtest_json         json
risk_json             json
paper_execution_json  json
final_decision        string
lessons_json          json
status                string   // completed, failed
created_at            datetime
updated_at            datetime
```

---

## 11. user_settings

用途：保存用户设置。

字段：

```txt
id                    string primary key
default_symbol        string
default_timeframe     string
demo_mode             boolean
default_ai_provider   string
paper_trading_enabled boolean
real_trading_enabled  boolean
language              string
settings_json         json
created_at            datetime
updated_at            datetime
```

约束：

```txt
Demo 阶段 real_trading_enabled 必须为 false。
```

---

## 12. ai_provider_configs

用途：保存 AI Provider 配置元信息，不保存明文 API Key。

字段：

```txt
id                    string primary key
provider              string
model                 string
enabled               boolean
is_default            boolean
config_json           json
created_at            datetime
updated_at            datetime
```

约束：

```txt
1. 不得保存明文 API Key。
2. API Key 只能从后端 .env 读取。
3. 如果未来必须保存密钥，必须加密保存。
```

---

## 13. action_logs

用途：保存用户操作日志、按钮点击、系统动作。

字段：

```txt
id                    string primary key
workflow_id           string nullable
action_type           string
entity_type           string
entity_id             string nullable
message               text
payload_json          json nullable
status                string
created_at            datetime
```

示例：

```txt
GENERATE_HYPOTHESIS
RUN_BACKTEST
RUN_RISK_CHECK
CREATE_PAPER_ORDER
GENERATE_AUDIT_REPORT
AI_ANALYSIS_FAILED
RISK_BLOCKED_EXECUTION
```

---

## 14. 数据库验收

必须满足：

```txt
1. Alembic migration 可以创建所有核心表。
2. 运行一次 Demo 流程后，数据库中至少存在：
   - 1 条 market_event
   - 1 条 ai_analysis
   - 1 条 hypothesis
   - 1 条 backtest_job
   - 1 条 backtest_result
   - 1 条 risk_check
   - 0 或 1 条 paper_order，取决于风控是否 BLOCK
   - 1 条 audit_report
   - 多条 action_log
3. 审计报告可以通过 workflow_id 追溯完整链路。
```
