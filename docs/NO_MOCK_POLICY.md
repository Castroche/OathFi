# OathFi No Mock Policy

## 1. 目标

本文件用于防止 OathFi 项目继续出现未标记假数据、假按钮、假订单簿、假 AI、假回测等问题。

Demo 可以使用 mock，但必须明确标记。不能用 mock 伪装真实系统。

---

## 2. 核心原则

```txt
1. 可以 Mock，但必须显式标记。
2. 不可以用随机数伪装实时行情。
3. 不可以用静态数组伪装订单簿。
4. 不可以让按钮点击无反应。
5. 不可以伪造 AI 厂商调用。
6. 不可以伪造回测结果。
7. 不可以伪造真实交易。
```

---

## 3. 数据源状态

所有行情、订单簿、AI、回测、新闻、链上事件必须包含状态字段：

```txt
live
rest_snapshot
stale
disconnected
mock
unavailable
```

前端必须展示这些状态。

---

## 4. Mock 标记要求

如果数据是 mock，后端响应必须包含：

```json
{
  "is_mock": true,
  "source": "local_mock",
  "status": "mock"
}
```

前端必须展示：

```txt
Mock
Demo Data
模拟数据
```

不得隐藏。

---

## 5. 订单簿规则

禁止：

```txt
1. 在组件中硬编码 bids / asks。
2. 使用 Math.random 生成盘口并伪装真实数据。
3. 订单簿不随 symbol 变化。
4. 订单簿不显示更新时间。
5. 订单簿不显示数据源。
```

必须：

```txt
1. 通过 MarketDataService 获取。
2. 优先使用 WebSocket。
3. WebSocket 不可用时使用 REST snapshot。
4. REST snapshot 必须标记 rest_snapshot。
5. 数据过期必须标记 stale。
```

---

## 6. AI Mock 规则

允许：

```txt
local_mock provider
```

但必须：

```txt
1. 返回 is_mock=true。
2. UI 显示 Mock AI。
3. 审计日志记录 provider=local_mock。
4. 不得显示为 DeepSeek / OpenAI / Claude 成功调用。
```

禁止：

```txt
1. 前端伪造 AI 结果。
2. 后端在 AI 调用失败后假装成功。
3. 不记录 AI 输入输出。
```

---

## 7. 回测 Mock 规则

允许 Demo 阶段使用简化回测。

但必须显示：

```txt
data_source
sample_period
sample_quality
is_mock
methodology
```

禁止：

```txt
1. 固定写死胜率。
2. 固定写死收益曲线。
3. 不保存回测任务。
4. 不保存回测结果。
5. 不说明样本质量。
```

---

## 8. 按钮规则

所有按钮必须满足至少一项：

```txt
1. 跳转页面。
2. 调用后端。
3. 打开弹窗。
4. 保存状态。
5. 显示 toast。
6. disabled 并显示原因。
```

禁止：

```txt
1. 无 onClick。
2. 空 onClick。
3. 只 console.log。
4. 点击后 UI 无反馈。
5. 按钮看起来可点但实际不可用。
```

---

## 9. 真实交易规则

Demo 阶段禁止真实交易。

必须：

```txt
1. real_trading_enabled=false。
2. paper_trading_enabled=true。
3. UI 显示“实盘交易已禁用”。
4. paper order 中 is_real_trade=false。
```

禁止：

```txt
1. 接真实下单接口。
2. 保存交易所明文 Secret。
3. 将模拟订单展示成真实订单。
```

---

## 10. 搜索关键词

Codex 修复时必须全局搜索：

```txt
mock
fake
dummy
random
Math.random
static
placeholder
TODO
hardcoded
bids
asks
orderbook
console.log
onClick={() => {}}
Phase
Stage
阶段
第.*阶段
```

---

## 11. 验收标准

```txt
1. 所有 mock 数据都有 is_mock=true。
2. 前端展示 Mock 标记。
3. 订单簿不是未标记假数据。
4. 按钮没有无反应情况。
5. AI Mock 不伪装成真实 AI。
6. 回测 Mock 不伪装成真实回测。
7. 风控 BLOCK 后不能创建模拟订单。
8. 项目内不再出现未处理的 Phase / Stage / 第几阶段文案。
```
