# OathFi Backend Integration Docs

本目录用于约束 OathFi 从前端静态 Demo 升级为前后端闭环 Demo。

建议让 Codex 先阅读本目录全部文件，再开始修改代码。

## 文件说明

```txt
BACKEND_ARCHITECTURE.md       后端整体架构约束
API_CONTRACT.md               前后端 API 合同
FRONTEND_BACKEND_BRIDGE.md    前后端桥接规则
DATABASE_SCHEMA.md            数据库表结构
AI_GATEWAY.md                 AI 厂商 API 接入规则
DEMO_WORKFLOW.md              黑客松 Demo 闭环流程
NO_MOCK_POLICY.md             禁止未标记假数据
ACCEPTANCE_CHECKLIST.md       最终验收清单
```

## 给 Codex 的主指令

```txt
请先阅读 docs/ 下所有约束文件，然后把 OathFi 从静态前端 Demo 升级为前后端闭环 Demo。

技术栈使用 FastAPI + SQLite + SQLAlchemy + Alembic 搭建后端，前端通过 REST API + WebSocket + OpenAPI + TanStack Query 与后端桥接。

必须打通以下流程：

市场情报
→ 生成交易假设
→ Agent 实验室
→ 回测验证
→ 风控检查
→ 模拟执行
→ 审计报告

所有生成、计算、保存、AI 分析、回测、风控、模拟交易、审计报告按钮都必须调用后端 API，并将结果写入数据库。

AI 厂商 API 必须通过后端 AI Gateway 统一代理，API Key 只能存在后端 .env，前端不得出现任何密钥。

订单簿和行情必须通过 MarketDataService 获取，禁止未标记 mock。Mock 数据必须返回 is_mock=true，并在 UI 显示 Mock 标记。

真实交易必须禁用，只允许 Paper Trading。

完成后请输出：
1. 修改文件清单
2. 新增接口清单
3. 新增数据库表清单
4. 前端按钮桥接清单
5. Mock 数据清单
6. Demo 启动方式
7. 验收结果
```
