# OathFi Backend Architecture

## 1. 目标

本文件用于约束 OathFi 后端整体架构。当前项目已完成前端主要页面与流程展示，下一步必须从“静态前端 Demo”升级为“前后端闭环 Demo”。

核心目标：

```txt
市场情报
→ 生成交易假设
→ Agent 实验室
→ 回测验证
→ 风控检查
→ 模拟执行
→ 审计报告
```

所有涉及生成、计算、保存、AI 分析、回测、风控、模拟交易、审计报告的动作，必须通过后端完成，不允许只在前端伪造状态。

---

## 2. 技术栈

Demo 阶段使用以下架构：

```txt
Frontend: React / Vite / TypeScript
Backend: FastAPI / Python
Database: SQLite
ORM: SQLAlchemy
Migration: Alembic
Schema: Pydantic
Realtime: FastAPI WebSocket
AI Gateway: 后端统一代理 AI 厂商 API
```

后续正式阶段可以迁移到：

```txt
Database: PostgreSQL
Cache: Redis
Time-series: TimescaleDB
Analytics: ClickHouse
```

Demo 阶段不得引入不必要的复杂设施，例如 Kubernetes、微服务、Kafka、真实交易执行。

---

## 3. 后端目录结构

建议结构：

```txt
backend/
  app/
    main.py

    api/
      health.py
      market.py
      hypotheses.py
      ai.py
      backtests.py
      risk.py
      paper_orders.py
      audit_reports.py
      settings.py

    core/
      config.py
      security.py
      errors.py

    db/
      base.py
      session.py
      init_db.py

    models/
      market_event.py
      hypothesis.py
      ai_analysis.py
      backtest.py
      risk_check.py
      paper_order.py
      audit_report.py
      user_settings.py
      action_log.py

    schemas/
      market.py
      hypothesis.py
      ai.py
      backtest.py
      risk.py
      paper_order.py
      audit_report.py
      settings.py
      common.py

    services/
      market_data_service.py
      ai_gateway.py
      backtest_service.py
      risk_engine.py
      paper_execution_service.py
      audit_service.py
      workflow_service.py

    providers/
      ai/
        base.py
        deepseek.py
        openai.py
        anthropic.py
        gemini.py
        local_mock.py

      market/
        base.py
        htx_rest.py
        htx_ws.py
        binance_rest.py
        okx_rest.py

    websocket/
      manager.py
      market_stream.py
      job_stream.py

  alembic/
  requirements.txt
  .env.example
```

---

## 4. 分层规则

必须遵守以下分层：

```txt
api layer        只负责接收请求、校验参数、返回响应
schemas layer    定义 Pydantic 请求和响应模型
services layer   执行业务逻辑
models layer     定义数据库 ORM 模型
providers layer  封装第三方 API，例如 AI、行情源
db layer         管理数据库连接与 session
websocket layer  管理实时推送
```

禁止：

```txt
1. 在 route 函数里直接堆业务逻辑。
2. 在前端直接拼接 AI Prompt 调用 AI 厂商。
3. 在页面组件中硬编码后端数据。
4. 在服务层中返回未结构化的随意字典。
5. 将 API Key 写入前端代码。
```

---

## 5. 核心后端服务

### 5.1 MarketDataService

负责：

```txt
1. 获取 ticker。
2. 获取 orderbook。
3. 获取 K 线。
4. 获取市场事件。
5. 管理数据源状态：live / stale / disconnected / mock。
```

### 5.2 AIGateway

负责：

```txt
1. 统一代理 DeepSeek / OpenAI / Claude / Gemini / Local Mock。
2. 管理模型选择。
3. 读取后端环境变量中的 API Key。
4. 结构化输出 AI 分析结果。
5. 记录 AI 输入、输出、错误、耗时。
```

### 5.3 BacktestService

负责：

```txt
1. 根据 hypothesis 生成回测任务。
2. 加载历史 K 线。
3. 运行简化回测。
4. 计算胜率、盈亏比、最大回撤、交易次数、收益曲线。
5. 保存 backtest_jobs 和 backtest_results。
```

### 5.4 RiskEngine

负责：

```txt
1. 检查仓位风险。
2. 检查止损距离。
3. 检查最大亏损。
4. 检查滑点风险。
5. 检查盘口深度。
6. 返回 PASS / WARNING / BLOCK。
```

### 5.5 PaperExecutionService

负责：

```txt
1. 创建模拟订单。
2. 禁止真实交易。
3. 风控 BLOCK 时禁止执行。
4. 保存 paper order。
5. 写入 action log。
```

### 5.6 AuditService

负责：

```txt
1. 汇总市场事件。
2. 汇总 AI 假设。
3. 汇总回测结果。
4. 汇总风控结果。
5. 汇总模拟订单。
6. 生成完整审计报告。
```

---

## 6. 工作流 ID

所有核心对象必须能被串联。

建议使用：

```txt
workflow_id
market_event_id
hypothesis_id
backtest_id
risk_check_id
paper_order_id
audit_report_id
```

每一步生成的数据都应能追溯到上一阶段。

---

## 7. 禁止真实交易

当前 Demo 阶段只允许：

```txt
Paper Trading
Simulation
Audit
Backtest
AI Analysis
```

禁止：

```txt
1. 真实交易所下单。
2. 真实资金划转。
3. 保存明文交易所 API Secret。
4. 将模拟执行伪装成真实执行。
```

---

## 8. 启动要求

后端至少需要支持：

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

前端默认：

```bash
cd frontend
npm install
npm run dev
```

默认地址：

```txt
Frontend: http://localhost:5173
Backend:  http://localhost:8001
Docs:     http://localhost:8001/docs
OpenAPI:  http://localhost:8001/openapi.json
```

---

## 9. 最小验收

后端完成后，必须满足：

```txt
1. /api/health 返回 ok。
2. /docs 可以打开。
3. SQLite 数据库文件生成。
4. 数据库表能创建。
5. 前端可以通过 /api 调用后端。
6. 生成交易假设、回测、风控、模拟执行、审计报告至少能跑通一个 ETH/USDT 案例。
```
