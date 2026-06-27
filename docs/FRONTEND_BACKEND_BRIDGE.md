# OathFi Frontend-Backend Bridge

## 1. 目标

本文件用于约束 OathFi 前端如何与后端桥接。

当前前端已经具备页面结构，但按钮、数据、回测、AI、风控、审计仍需接入后端。所有涉及业务结果的动作必须通过后端完成。

---

## 2. 桥接技术

统一使用：

```txt
REST API       负责生成、保存、查询、计算类动作
WebSocket      负责实时行情、订单簿、任务进度
OpenAPI        负责前后端接口类型约束
TanStack Query 负责请求状态、缓存、loading、error、mutation
Zustand        负责当前交易对、workflow_id、页面临时状态
Vite Proxy     负责开发环境代理 /api 和 /ws
```

---

## 3. 前端 API 目录

必须建立统一 API 层：

```txt
frontend/src/api/
  client.ts
  market.ts
  ai.ts
  hypotheses.ts
  backtests.ts
  risk.ts
  paperOrders.ts
  auditReports.ts
  settings.ts
```

禁止：

```txt
1. 在页面组件里到处散落 fetch。
2. 在按钮 onClick 中直接写复杂请求逻辑。
3. 在前端直接调用 AI 厂商 API。
4. 将 API Key 写入前端。
```

---

## 4. API Client

建议：

```ts
// src/api/client.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const json = await res.json();

  if (!res.ok || json.ok === false) {
    throw new Error(json?.error?.message || "API request failed");
  }

  return json.data as T;
}
```

---

## 5. Vite Proxy

开发环境建议：

```ts
// vite.config.ts
server: {
  proxy: {
    "/api": {
      target: "http://localhost:8001",
      changeOrigin: true
    },
    "/ws": {
      target: "ws://localhost:8001",
      ws: true
    }
  }
}
```

前端请求：

```txt
/api/hypotheses/generate
```

实际代理到：

```txt
http://localhost:8001/api/hypotheses/generate
```

---

## 6. React Query 使用规范

所有生成类按钮使用 `useMutation`。

示例：

```ts
const generateHypothesisMutation = useMutation({
  mutationFn: generateHypothesis,
  onSuccess: (data) => {
    navigate(`/agent-lab/${data.id}`);
  },
  onError: (error) => {
    toast.error(error.message);
  }
});
```

按钮：

```tsx
<Button
  disabled={generateHypothesisMutation.isPending}
  onClick={() => generateHypothesisMutation.mutate(payload)}
>
  {generateHypothesisMutation.isPending ? "生成中..." : "生成交易假设"}
</Button>
```

---

## 7. 页面按钮桥接规则

### 7.1 生成交易假设

按钮：

```txt
生成交易假设
```

前端动作：

```txt
POST /api/hypotheses/generate
```

成功后：

```txt
navigate("/agent-lab/:hypothesisId")
```

必须显示：

```txt
loading
success toast
error toast
```

---

### 7.2 发送至回测

按钮：

```txt
发送至回测
运行回测
```

前端动作：

```txt
POST /api/backtests
```

成功后：

```txt
navigate("/backtest/:backtestId")
```

---

### 7.3 发送至风控

按钮：

```txt
发送至风控火墙
运行风控检查
```

前端动作：

```txt
POST /api/risk/check
```

成功后：

```txt
navigate("/risk-firewall/:riskCheckId")
```

---

### 7.4 执行模拟交易

按钮：

```txt
执行模拟交易
```

前端动作：

```txt
POST /api/paper-orders
```

成功后：

```txt
navigate("/paper-execution/:paperOrderId")
```

如果后端返回 `RISK_BLOCKED`：

```txt
显示错误 toast
停留在风控页面或模拟执行页面
不得伪造订单成功
```

---

### 7.5 生成审计报告

按钮：

```txt
生成审计报告
打开审计日志
```

前端动作：

```txt
POST /api/audit-reports
```

成功后：

```txt
navigate("/audit-reports/:auditReportId")
```

---

## 8. WebSocket Hook

前端需要封装：

```txt
src/hooks/useMarketSocket.ts
src/hooks/useJobSocket.ts
```

`useMarketSocket` 负责：

```txt
ticker
orderbook
source status
updated_at
stale detection
```

`useJobSocket` 负责：

```txt
AI 分析进度
回测进度
审计报告生成进度
```

---

## 9. Zustand 状态

建议全局状态：

```ts
type OathFiState = {
  selectedSymbol: string;
  selectedTimeframe: string;
  workflowId?: string;
  hypothesisId?: string;
  backtestId?: string;
  riskCheckId?: string;
  paperOrderId?: string;
  auditReportId?: string;
  demoMode: boolean;
};
```

用途：

```txt
1. 保存当前交易对。
2. 串联工作流。
3. 页面之间传递当前对象 ID。
4. 保存 demo mode。
```

---

## 10. 禁止无反馈按钮

所有按钮必须至少具备一种结果：

```txt
1. 跳转。
2. 打开弹窗。
3. 调用后端。
4. 保存状态。
5. 显示 toast。
6. disabled 且显示原因。
```

禁止：

```txt
1. onClick={() => {}}
2. onClick={undefined}
3. console.log 后无 UI 反馈
4. 点击后无任何变化
```

---

## 11. 前端验收

必须检查：

```txt
1. 页面组件中是否还存在散落 fetch。
2. 所有 API 是否统一走 src/api。
3. 所有生成类按钮是否使用 useMutation。
4. 所有列表读取是否使用 useQuery。
5. 所有按钮是否有 loading / error / success。
6. 所有成功跳转是否使用后端返回的 id。
7. 订单簿是否来自 WebSocket 或 REST API。
8. AI 是否只通过后端调用。
```
