# OathFi Demo Workflow

## 1. 目标

本文件用于约束 OathFi 黑客松 Demo 的核心演示流程。

当前项目必须优先打通完整闭环，而不是继续堆页面。

核心 Demo：

```txt
市场情报
→ 生成交易假设
→ Agent 实验室
→ 回测验证
→ 风控检查
→ 模拟执行
→ 审计报告
```

---

## 2. 工作流对象

每次 Demo 需要生成一个 `workflow_id`。

所有后续对象都挂在同一个 `workflow_id` 下：

```txt
market_event
ai_analysis
hypothesis
backtest_job
backtest_result
risk_check
paper_order
audit_report
action_logs
```

---

## 3. Step 1：市场情报

页面：

```txt
/command-center
/market-brief
```

用户动作：

```txt
选择 ETH/USDT
查看市场事件
查看 ticker
查看 orderbook
```

后端接口：

```txt
GET /api/market/events
GET /api/market/ticker?symbol=ETH/USDT
GET /api/market/orderbook?symbol=ETH/USDT
```

要求：

```txt
1. 市场事件必须显示数据源。
2. 行情数据必须显示 live / stale / disconnected / mock。
3. 订单簿不能使用未标记假数据。
```

---

## 4. Step 2：生成交易假设

按钮：

```txt
生成交易假设
```

后端接口：

```txt
POST /api/hypotheses/generate
```

输入：

```txt
symbol
timeframe
market_event_id
ticker
orderbook
news
onchain
provider
```

输出：

```txt
hypothesis_id
workflow_id
direction
entry_condition
invalid_condition
stop_loss
take_profit
confidence
feasibility
risk
summary
warnings
```

前端成功后跳转：

```txt
/agent-lab/:hypothesisId
```

---

## 5. Step 3：Agent 实验室

页面：

```txt
/agent-lab/:hypothesisId
```

展示：

```txt
AI 假设
市场上下文
证据矩阵
置信度
风险提示
可执行性
```

用户动作：

```txt
发送至回测
```

---

## 6. Step 4：回测验证

按钮：

```txt
发送至回测
运行回测
```

后端接口：

```txt
POST /api/backtests
```

输出：

```txt
backtest_id
win_rate
profit_factor
expectancy
max_drawdown
trade_count
avg_rr
sample_quality
equity_curve
trades
```

前端成功后跳转：

```txt
/backtest/:backtestId
```

Demo 阶段允许简化回测，但必须标明：

```txt
sample quality
data source
is_mock
```

---

## 7. Step 5：风控检查

按钮：

```txt
发送至风控火墙
运行风控检查
```

后端接口：

```txt
POST /api/risk/check
```

输出：

```txt
risk_check_id
decision: PASS / WARNING / BLOCK
checks
warnings
block_reasons
```

前端成功后跳转：

```txt
/risk-firewall/:riskCheckId
```

规则：

```txt
1. PASS 可以进入模拟执行。
2. WARNING 可以进入模拟执行，但必须显示风险提示。
3. BLOCK 不允许执行模拟订单。
```

---

## 8. Step 6：模拟执行

按钮：

```txt
执行模拟交易
```

后端接口：

```txt
POST /api/paper-orders
```

要求：

```txt
1. 只允许 paper trading。
2. 不允许真实交易。
3. 风控 BLOCK 时必须返回错误。
4. 创建订单后写入 action_logs。
```

前端成功后跳转：

```txt
/paper-execution/:paperOrderId
```

---

## 9. Step 7：审计报告

按钮：

```txt
生成审计报告
```

后端接口：

```txt
POST /api/audit-reports
```

审计报告必须包含：

```txt
市场事件
AI 假设
回测结果
风控结果
模拟订单
最终结论
风险说明
失败原因
改进建议
```

前端成功后跳转：

```txt
/audit-reports/:auditReportId
```

---

## 10. Demo 成功标准

一次完整 Demo 必须能展示：

```txt
1. 从 ETH/USDT 市场事件开始。
2. 生成 AI 交易假设。
3. 交易假设进入 Agent 实验室。
4. 回测产生结果。
5. 风控给出 PASS / WARNING / BLOCK。
6. 如果允许，生成模拟订单。
7. 生成审计报告。
8. 审计报告可以回溯完整链路。
```

---

## 11. Demo 失败标准

以下情况视为失败：

```txt
1. 按钮点击无反应。
2. 按钮只更新前端假状态。
3. 生成结果没有写入数据库。
4. 审计报告无法追溯前面步骤。
5. 风控 BLOCK 后仍允许模拟执行。
6. AI API Key 出现在前端。
7. 订单簿使用未标记假数据。
8. 回测结果无法复现。
```

---

## 12. 推荐演示脚本

```txt
1. 打开 OathFi 控制中心。
2. 选择 ETH/USDT。
3. 展示实时价格、市场事件、订单簿。
4. 点击“生成交易假设”。
5. 进入 Agent 实验室，解释 AI 如何根据市场上下文生成假设。
6. 点击“发送至回测”。
7. 展示回测胜率、最大回撤、盈亏比。
8. 点击“发送至风控火墙”。
9. 展示风控决策。
10. 如果 PASS/WARNING，进入模拟执行。
11. 创建 paper order。
12. 点击“生成审计报告”。
13. 展示完整可追溯决策链。
```
