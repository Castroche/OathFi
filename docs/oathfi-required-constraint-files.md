# OathFi 需要哪些约束文件

> 用途：给 Codex 读取的项目约束清单。避免 Codex 只凭一句话乱改，把 UI、行情、新闻、置信度、风控、审计做散。

---

## 1. 当前结论

OathFi 当前阶段不需要一次性新增完整后端，也不要接真实交易 API、账户 API、API Key、Secret、提现或外部 AI API。

当前阶段需要的约束文件主要是：

```text
1. oathfi-style.md
2. docs/live-market-charting-spec.md
3. docs/news-intelligence-spec.md
4. docs/confidence-decision-engine-spec.md
5. docs/final-acceptance-checklist.md
6. docs/backend-roadmap.md
```

其中第 1-4 个是当前开发必须读的核心约束。
第 5 个用于最终验收。
第 6 个只做路线图，不要求现在实现完整后端。

---

## 2. 文件一：oathfi-style.md

位置：

```text
F:\OathFi\oathfi-style.md
```

作用：

```text
约束整体视觉风格、深色交易终端、颜色、布局、组件风格、字体、按钮、卡片、状态标签。
```

Codex 必须遵守：

- 不要把 OathFi 改成 landing page。
- 不要重做整体 UI。
- 保持当前深色交易终端风格。
- 保持 OathFi 产品名。
- 不要出现 Genesis Alpha Agent / NeuroTrade 等旧名称。
- 中英文必须走 i18n，不能乱码。

---

## 3. 文件二：docs/live-market-charting-spec.md

位置：

```text
F:\OathFi\docs\live-market-charting-spec.md
```

作用：

```text
约束 HTX 实时行情接入、K线终端、盘口、成交、指标、画线、订单簿精度、实时响应性能。
```

核心约束：

- HTX public market data 可以接。
- 不需要用户 API Key。
- 不接真实交易。
- 不接账户资产。
- 不接 Secret。
- K线图不能只是静态图，必须是交易所级行情终端。
- MA / EMA / BOLL / VWAP 应叠加在主图。
- MACD / RSI / KDJ / ATR 应放在副图。
- 指标必须能删除、隐藏、清空。
- Order Book 必须支持价格精度 / 聚合粒度调整。
- 当前 candle 必须由 trade/ticker 实时 patch。
- 图表不能一卡一卡。

---

## 4. 文件三：docs/news-intelligence-spec.md

位置：

```text
F:\OathFi\docs\news-intelligence-spec.md
```

作用：

```text
约束新闻与链上情报模块，包括新闻分类、source adapter、mock/live/planned 状态、新闻风险输出、与决策引擎联动。
```

核心约束：

- 新闻模块属于 Market Intelligence，不是孤立页面。
- 新闻和链上信息只作为辅助风险因子。
- 不直接决定交易方向。
- 不强行接律动、金十、新浪等真实 API。
- 需要 API / 后端代理 / 权限 / CORS 的来源标记为 backend-required 或 planned。
- Mock 新闻必须明确显示 mock。
- 不能伪装 live。
- 不复制完整文章。
- 输出 NewsRiskContext：

```text
newsRisk
newsSupport
macroRisk
onChainRisk
hardBlockEvent
hardBlockReasons
warnings
relatedSymbols
```

---

## 5. 文件四：docs/confidence-decision-engine-spec.md

位置：

```text
F:\OathFi\docs\confidence-decision-engine-spec.md
```

来源：

可以把已下载的：

```text
oathfi-confidence-decision-engine-summary.md
```

复制到 `docs/`，并重命名为：

```text
confidence-decision-engine-spec.md
```

作用：

```text
约束置信度、可行度、风险度、实时决策引擎、HardBlock、Action、NewsRisk/OnChainRisk 如何进入公式。
```

核心约束：

- 不叫 AI 置信度，叫“置信度 Confidence”。
- 置信度不是盈利概率。
- 置信度不是 AI 自信度。
- 核心计算不依赖外部 AI API。
- K线、指标、盘口、成交、波动率、流动性、R/R 是主依据。
- 新闻和链上是辅助风险因子。
- 使用加权几何平均，不使用简单加减法。

核心公式：

```text
MarketConfidence =
100 ×
T^0.25 ×
M^0.20 ×
V^0.15 ×
L^0.15 ×
Q^0.10 ×
RR^0.15
```

FinalConfidence：

```text
FinalConfidence =
clamp(
  MarketConfidence
  × EventRiskMultiplier
  × DataReliabilityMultiplier
  × ConflictMultiplier,
  0,
  100
)
```

必须同时输出：

```text
Confidence
Feasibility
Risk
LongConfidence
ShortConfidence
Action
BlockingReasons
```

Action 只能是：

```text
OBSERVE
WAIT
ALLOW_PAPER_LONG
ALLOW_PAPER_SHORT
REDUCE_SIZE
BLOCK
NO_TRADE
```

---

## 6. 文件五：docs/final-acceptance-checklist.md

位置：

```text
F:\OathFi\docs\final-acceptance-checklist.md
```

作用：

```text
约束最终验收，不让 Codex 自己说完成就算完成。
```

建议内容包括：

- build/lint 必须通过。
- 中文/英文无乱码。
- 无 `??????`、`undefined`、`null`。
- HTX 实时行情可用。
- 图表不卡顿。
- 指标可删除。
- 主图指标和副图指标位置正确。
- Order Book 精度可调。
- 新闻模块不是孤立列表。
- Confidence / Feasibility / Risk 显示正确。
- Risk Firewall 可以读取决策结果。
- Audit Report 可以记录完整链路。
- 不新增真实交易、账户 API、API Key、Secret、提现。

---

## 7. 文件六：docs/backend-roadmap.md

位置：

```text
F:\OathFi\docs\backend-roadmap.md
```

作用：

```text
说明以后什么时候加后端，不要求当前阶段实现完整后端。
```

当前结论：

```text
现在暂时不加完整后端。
先修前端行情终端、新闻层、置信度引擎。
```

未来后端阶段：

```text
1. Market Data Gateway
2. News Gateway
3. 用户配置和审计报告数据库
4. Agent 后台任务
5. 私有 API Key 安全管理
6. 真实交易接口
```

但当前阶段禁止：

- 真实交易
- 账户 API
- API Key / Secret
- 提现
- 完整用户系统
- 完整数据库

---

## 8. 当前阶段 Codex 应该读取哪些文件

当前如果任务是：

```text
新闻层 + 置信度评分 + 决策引擎
```

Codex 必须读取：

```text
oathfi-style.md
docs/live-market-charting-spec.md
docs/news-intelligence-spec.md
docs/confidence-decision-engine-spec.md
docs/final-acceptance-checklist.md
```

如果只是先做新闻层：

```text
oathfi-style.md
docs/news-intelligence-spec.md
docs/final-acceptance-checklist.md
```

如果只是先做置信度：

```text
oathfi-style.md
docs/live-market-charting-spec.md
docs/news-intelligence-spec.md
docs/confidence-decision-engine-spec.md
```

---

## 9. 对 Codex 的统一硬性约束

无论做哪个任务，必须遵守：

```text
不要新增真实交易。
不要接账户 API。
不要接 API Key。
不要接 Secret。
不要接提现。
不要默认接外部 AI API。
不要把 mock 数据伪装成 live。
不要破坏现有深色交易终端 UI。
不要把 OathFi 改成 landing page。
不要出现旧产品名。
不要出现中英文乱码。
不要出现 ??????。
```

---

## 10. 建议的执行顺序

不要一次乱做全部。

推荐顺序：

```text
1. 修复现有图表和 i18n 基础问题
2. 完成 News & On-chain Intelligence 新闻层
3. 完成 Confidence / Feasibility / Risk 决策引擎
4. 接入 Risk Firewall
5. 接入 Audit Reports
6. 最终验收
```

如果要新闻层和置信度一起做，必须分阶段：

```text
Phase 1：News Intelligence
Phase 2：Confidence Decision Engine
Phase 3：Risk Firewall / Audit 联动
```

---

## 11. 最终判断

当前 OathFi 不需要更多无关页面。

真正需要的是：

```text
市场情报 → 实时决策 → 风控拦截 → 模拟执行 → 审计复盘
```

所有约束文件都应该围绕这个主线。
