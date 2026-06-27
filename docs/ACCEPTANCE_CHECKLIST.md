# OathFi Acceptance Checklist

## 1. 目标

本文件用于 OathFi 后端接入、前后端桥接、AI Gateway、数据库、回测、风控、模拟执行和审计报告的最终验收。

验收时不要只看 UI，要检查真实数据流、接口、数据库和日志。

---

## 2. 启动验收

### 后端

```txt
[ ] backend 可以安装依赖。
[ ] uvicorn app.main:app --reload --port 8001 可以启动。
[ ] http://localhost:8001/docs 可以打开。
[ ] GET /api/health 返回 ok。
[ ] SQLite 数据库文件生成。
[ ] Alembic migration 可以运行。
```

### 前端

```txt
[ ] npm install 成功。
[ ] npm run dev 成功。
[ ] http://localhost:5173 可以打开。
[ ] 前端 /api 请求可以代理到后端。
[ ] 前端 /ws 可以连接后端 WebSocket。
```

---

## 3. API 验收

```txt
[ ] GET /api/market/events 可用。
[ ] GET /api/market/ticker 可用。
[ ] GET /api/market/orderbook 可用。
[ ] POST /api/ai/analyze 可用。
[ ] POST /api/hypotheses/generate 可用。
[ ] POST /api/backtests 可用。
[ ] POST /api/risk/check 可用。
[ ] POST /api/paper-orders 可用。
[ ] POST /api/audit-reports 可用。
[ ] GET /api/audit-reports/:id 可用。
[ ] GET /api/settings 可用。
[ ] PUT /api/settings 可用。
```

---

## 4. 数据库验收

运行一次 Demo 后，数据库必须存在：

```txt
[ ] market_events 至少 1 条。
[ ] ai_analyses 至少 1 条。
[ ] hypotheses 至少 1 条。
[ ] backtest_jobs 至少 1 条。
[ ] backtest_results 至少 1 条。
[ ] risk_checks 至少 1 条。
[ ] paper_orders 0 或 1 条，取决于风控是否 BLOCK。
[ ] audit_reports 至少 1 条。
[ ] action_logs 多条。
```

并且：

```txt
[ ] audit_report 可以通过 workflow_id 追溯完整链路。
[ ] hypothesis_id 可以关联到 backtest。
[ ] risk_check_id 可以关联到 paper_order。
[ ] BLOCK 风控结果不能创建 paper_order。
```

---

## 5. 前端按钮验收

每个按钮必须有真实行为。

```txt
[ ] 生成交易假设：调用 POST /api/hypotheses/generate。
[ ] 发送至回测：调用 POST /api/backtests。
[ ] 发送至风控火墙：调用 POST /api/risk/check。
[ ] 执行模拟交易：调用 POST /api/paper-orders。
[ ] 生成审计报告：调用 POST /api/audit-reports。
[ ] 打开审计日志：跳转审计报告详情或列表。
[ ] 保存设置：调用 PUT /api/settings。
[ ] 测试数据源：调用后端 health / market source 检查。
[ ] 查看钱包：如果未实现，必须 disabled 或显示“规划中”。
```

所有按钮必须有：

```txt
[ ] loading 状态。
[ ] 成功提示。
[ ] 失败提示。
[ ] 禁用条件。
[ ] 控制台无未处理错误。
```

---

## 6. AI Gateway 验收

```txt
[ ] 前端代码中搜索不到 OpenAI / DeepSeek / Anthropic / Gemini API Key。
[ ] 前端没有直接请求 AI 厂商域名。
[ ] 后端存在 .env.example。
[ ] AI Provider 通过后端统一调用。
[ ] AI 输入输出保存到 ai_analyses。
[ ] AI 失败时返回明确错误。
[ ] Mock AI 返回 is_mock=true。
[ ] UI 显示 Mock 标记。
```

---

## 7. 行情和订单簿验收

```txt
[ ] ticker 来自 MarketDataService。
[ ] orderbook 来自 MarketDataService。
[ ] 订单簿随 symbol 切换变化。
[ ] 订单簿显示 source。
[ ] 订单簿显示 updated_at。
[ ] 订单簿显示 live / stale / disconnected / mock。
[ ] 没有未标记的静态 orderbook。
```

---

## 8. 回测验收

```txt
[ ] 回测任务写入 backtest_jobs。
[ ] 回测结果写入 backtest_results。
[ ] 页面展示 win_rate。
[ ] 页面展示 profit_factor。
[ ] 页面展示 max_drawdown。
[ ] 页面展示 trade_count。
[ ] 页面展示 sample_quality。
[ ] 如果使用简化回测，UI 明确显示 Demo / Mock / Simplified。
```

---

## 9. 风控验收

```txt
[ ] 风控结果写入 risk_checks。
[ ] 风控返回 PASS / WARNING / BLOCK。
[ ] 风控检查项可见。
[ ] WARNING 显示风险提示。
[ ] BLOCK 显示阻断原因。
[ ] BLOCK 后执行模拟交易按钮禁用或后端拒绝。
```

---

## 10. 模拟执行验收

```txt
[ ] 模拟订单写入 paper_orders。
[ ] paper_orders.is_real_trade=false。
[ ] UI 显示“仅模拟交易”。
[ ] 不存在真实交易所下单行为。
[ ] 不保存交易所明文 Secret。
```

---

## 11. 审计报告验收

```txt
[ ] 审计报告写入 audit_reports。
[ ] 审计报告展示市场事件。
[ ] 审计报告展示 AI 假设。
[ ] 审计报告展示回测结果。
[ ] 审计报告展示风控结果。
[ ] 审计报告展示模拟订单。
[ ] 审计报告展示最终结论。
[ ] 审计报告可以根据 id 重新打开。
```

---

## 12. Mock 验收

```txt
[ ] 所有 mock 数据都有 is_mock=true。
[ ] UI 显示 Mock 标记。
[ ] 没有随机数伪装实时数据。
[ ] 没有静态盘口伪装真实订单簿。
[ ] 没有 AI Mock 伪装真实 AI。
[ ] 没有回测 Mock 伪装真实回测。
```

---

## 13. 文案验收

```txt
[ ] 页面中不出现“第一阶段”。
[ ] 页面中不出现“第二阶段”。
[ ] 页面中不出现“阶段 MARKET BRIEF”。
[ ] 页面中不出现 Phase。
[ ] 页面中不出现 Stage。
[ ] 页面标题是正式产品模块名称。
```

---

## 14. 最终 Demo 验收

完整流程：

```txt
[ ] 打开控制中心。
[ ] 选择 ETH/USDT。
[ ] 查看市场事件、ticker、orderbook。
[ ] 点击生成交易假设。
[ ] 进入 Agent 实验室。
[ ] 点击发送至回测。
[ ] 进入回测工作台。
[ ] 点击发送至风控。
[ ] 进入风控火墙。
[ ] 如果非 BLOCK，进入模拟执行。
[ ] 创建 paper order。
[ ] 生成审计报告。
[ ] 重新打开审计报告，能看到完整链路。
```

---

## 15. 构建验收

```txt
[ ] 前端 npm run build 通过。
[ ] 后端 pytest 或最小 API 测试通过。
[ ] TypeScript 无关键类型错误。
[ ] 浏览器控制台无未处理异常。
[ ] 后端日志无未处理异常。
```

---

## 16. 最终输出要求

Codex 完成后必须输出：

```txt
1. 修改文件清单。
2. 新增后端接口清单。
3. 新增数据库表清单。
4. 前端已桥接按钮清单。
5. 仍未实现的功能清单。
6. Mock 数据清单。
7. API Key 安全检查结果。
8. Demo 运行方式。
9. 验收结果。
```
