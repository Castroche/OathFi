# OathFi API Contract

## 1. 目标

本文件用于约束 OathFi 前后端 API 合同。前端不得绕过本合同直接调用第三方 API 或自行伪造业务结果。

所有接口必须满足：

```txt
1. 请求结构明确。
2. 响应结构明确。
3. 错误结构明确。
4. 前端成功后跳转路径明确。
5. 涉及生成、计算、保存的接口必须写入数据库。
```

---

## 2. 通用响应格式

建议成功响应：

```json
{
  "ok": true,
  "data": {},
  "message": "success"
}
```

建议失败响应：

```json
{
  "ok": false,
  "error": {
    "code": "RISK_BLOCKED",
    "message": "Risk check returned BLOCK. Paper execution is not allowed.",
    "details": {}
  }
}
```

---

## 3. Health

### GET `/api/health`

用途：检查后端是否可用。

响应：

```json
{
  "ok": true,
  "data": {
    "status": "ok",
    "service": "oathfi-backend",
    "version": "0.1.0"
  }
}
```

---

## 4. Market APIs

### GET `/api/market/events`

用途：读取市场事件。

Query:

```txt
symbol?: string
limit?: number
source?: string
```

响应：

```json
{
  "ok": true,
  "data": [
    {
      "id": "me_001",
      "symbol": "ETH/USDT",
      "title": "ETH 突破连续复盘",
      "summary": "市场出现突破尝试，等待 AI 生成假设。",
      "source": "demo",
      "severity": 72,
      "created_at": "2026-06-19T12:00:00Z",
      "is_mock": true
    }
  ]
}
```

### GET `/api/market/ticker`

Query:

```txt
symbol=ETH/USDT
```

响应：

```json
{
  "ok": true,
  "data": {
    "symbol": "ETH/USDT",
    "price": 1709.91,
    "change_24h": 1.26,
    "volume_24h": 123456789,
    "source": "htx",
    "status": "live",
    "updated_at": "2026-06-19T12:00:00Z",
    "is_mock": false
  }
}
```

### GET `/api/market/orderbook`

Query:

```txt
symbol=ETH/USDT
depth=20
```

响应：

```json
{
  "ok": true,
  "data": {
    "symbol": "ETH/USDT",
    "bids": [
      {"price": 1709.8, "size": 2.1, "total": 2.1}
    ],
    "asks": [
      {"price": 1710.2, "size": 1.8, "total": 1.8}
    ],
    "spread": 0.4,
    "mid_price": 1710.0,
    "imbalance": 0.08,
    "source": "htx",
    "status": "live",
    "updated_at": "2026-06-19T12:00:00Z",
    "is_mock": false
  }
}
```

---

## 5. AI APIs

### POST `/api/ai/analyze`

用途：对当前上下文进行 AI 分析。

请求：

```json
{
  "symbol": "ETH/USDT",
  "task": "market_analysis",
  "provider": "deepseek",
  "context": {
    "ticker": {},
    "orderbook": {},
    "market_events": [],
    "kline_summary": {}
  }
}
```

响应：

```json
{
  "ok": true,
  "data": {
    "id": "ai_001",
    "provider": "deepseek",
    "model": "deepseek-chat",
    "summary": "ETH 当前处于突破确认阶段，但订单簿深度不足。",
    "signals": [
      "price above MA20",
      "orderbook imbalance neutral"
    ],
    "risks": [
      "false breakout risk",
      "news-driven volatility"
    ],
    "recommendation": "wait_for_confirmation",
    "confidence": 62,
    "created_at": "2026-06-19T12:00:00Z"
  }
}
```

---

## 6. Hypotheses APIs

### POST `/api/hypotheses/generate`

用途：生成交易假设。

请求：

```json
{
  "symbol": "ETH/USDT",
  "timeframe": "15m",
  "market_event_id": "me_001",
  "provider": "deepseek",
  "context": {
    "ticker": {},
    "orderbook": {},
    "news": [],
    "onchain": []
  }
}
```

响应：

```json
{
  "ok": true,
  "data": {
    "id": "hyp_001",
    "workflow_id": "wf_001",
    "symbol": "ETH/USDT",
    "timeframe": "15m",
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
    "warnings": [],
    "created_at": "2026-06-19T12:00:00Z"
  }
}
```

前端成功后跳转：

```txt
/agent-lab/:hypothesisId
```

---

## 7. Backtest APIs

### POST `/api/backtests`

用途：运行回测。

请求：

```json
{
  "hypothesis_id": "hyp_001",
  "symbol": "ETH/USDT",
  "timeframe": "15m",
  "start_time": "2026-01-01T00:00:00Z",
  "end_time": "2026-06-01T00:00:00Z",
  "initial_capital": 10000
}
```

响应：

```json
{
  "ok": true,
  "data": {
    "id": "bt_001",
    "workflow_id": "wf_001",
    "hypothesis_id": "hyp_001",
    "status": "completed",
    "win_rate": 0.57,
    "profit_factor": 1.84,
    "expectancy": 0.42,
    "max_drawdown": -0.068,
    "trade_count": 128,
    "avg_rr": 1.72,
    "sample_quality": "A-",
    "equity_curve": [],
    "trades": [],
    "created_at": "2026-06-19T12:00:00Z"
  }
}
```

前端成功后跳转：

```txt
/backtest/:backtestId
```

---

## 8. Risk APIs

### POST `/api/risk/check`

用途：运行风控检查。

请求：

```json
{
  "hypothesis_id": "hyp_001",
  "backtest_id": "bt_001",
  "account_equity": 10000,
  "risk_per_trade": 0.011,
  "position_size": 0.65,
  "entry_price": 3446,
  "stop_loss": 3392,
  "take_profit": 3544
}
```

响应：

```json
{
  "ok": true,
  "data": {
    "id": "risk_001",
    "workflow_id": "wf_001",
    "decision": "BLOCK",
    "checks": [
      {
        "name": "position_size",
        "status": "PASS",
        "message": "Position size is within the configured limit."
      },
      {
        "name": "risk_reward",
        "status": "WARNING",
        "message": "Risk/reward is below target."
      }
    ],
    "warnings": [
      "Insufficient confirmation."
    ],
    "block_reasons": [
      "Hard block keyword detected."
    ],
    "created_at": "2026-06-19T12:00:00Z"
  }
}
```

前端成功后跳转：

```txt
/risk-firewall/:riskCheckId
```

---

## 9. Paper Order APIs

### POST `/api/paper-orders`

用途：创建模拟订单。

请求：

```json
{
  "hypothesis_id": "hyp_001",
  "backtest_id": "bt_001",
  "risk_check_id": "risk_001",
  "symbol": "ETH/USDT",
  "side": "buy",
  "order_type": "limit",
  "price": 3446,
  "quantity": 0.65,
  "stop_loss": 3392,
  "take_profit": 3544
}
```

响应：

```json
{
  "ok": true,
  "data": {
    "id": "po_001",
    "workflow_id": "wf_001",
    "status": "created",
    "symbol": "ETH/USDT",
    "side": "buy",
    "order_type": "limit",
    "price": 3446,
    "quantity": 0.65,
    "stop_loss": 3392,
    "take_profit": 3544,
    "is_real_trade": false,
    "created_at": "2026-06-19T12:00:00Z"
  }
}
```

如果风控为 BLOCK，必须返回错误：

```json
{
  "ok": false,
  "error": {
    "code": "RISK_BLOCKED",
    "message": "Risk decision is BLOCK. Paper order creation is not allowed.",
    "details": {
      "risk_check_id": "risk_001"
    }
  }
}
```

前端成功后跳转：

```txt
/paper-execution/:paperOrderId
```

---

## 10. Audit APIs

### POST `/api/audit-reports`

用途：生成审计报告。

请求：

```json
{
  "hypothesis_id": "hyp_001",
  "backtest_id": "bt_001",
  "risk_check_id": "risk_001",
  "paper_order_id": "po_001"
}
```

响应：

```json
{
  "ok": true,
  "data": {
    "id": "audit_001",
    "workflow_id": "wf_001",
    "title": "ETH/USDT 突破连续复盘",
    "symbol": "ETH/USDT",
    "summary": "本次交易假设已完成从市场事件到审计报告的完整链路。",
    "market_context": {},
    "hypothesis": {},
    "backtest_result": {},
    "risk_result": {},
    "paper_execution": {},
    "final_decision": "BLOCK",
    "lessons": [],
    "created_at": "2026-06-19T12:00:00Z"
  }
}
```

前端成功后跳转：

```txt
/audit-reports/:auditReportId
```

---

## 11. Settings APIs

### GET `/api/settings`

用途：读取设置。

### PUT `/api/settings`

用途：保存设置。

请求：

```json
{
  "default_symbol": "ETH/USDT",
  "demo_mode": true,
  "default_ai_provider": "deepseek",
  "paper_trading_enabled": true,
  "real_trading_enabled": false,
  "language": "zh-CN"
}
```

---

## 12. WebSocket APIs

### `/ws/market`

用途：推送实时行情、订单簿、连接状态。

消息示例：

```json
{
  "type": "orderbook",
  "symbol": "ETH/USDT",
  "data": {
    "bids": [],
    "asks": [],
    "spread": 0.4,
    "imbalance": 0.08,
    "source": "htx",
    "status": "live",
    "updated_at": "2026-06-19T12:00:00Z"
  }
}
```

### `/ws/jobs`

用途：推送 AI、回测、审计等任务状态。

消息示例：

```json
{
  "type": "backtest_progress",
  "job_id": "bt_001",
  "status": "running",
  "progress": 0.52
}
```

---

## 13. 必须遵守

```txt
1. 前端不得直接调用 AI 厂商 API。
2. 前端不得出现 AI API Key。
3. 所有生成类接口必须保存数据库。
4. 所有核心接口必须返回 id。
5. 前端跳转必须基于后端返回的 id。
6. BLOCK 风控结果不得进入模拟执行。
7. Mock 数据必须显式标记 is_mock: true。
```
