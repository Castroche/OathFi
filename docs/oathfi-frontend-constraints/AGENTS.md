# OathFi / NeuroTrade Frontend Engineering Rules

## 必读规则

修改专业 K 线工作区、指标、盘口、成交列表、布局前，必须先阅读：

- docs/INDICATOR_ENGINE_SPEC.md
- docs/CHART_PANE_POLICY.md
- docs/RESIZABLE_WORKSPACE_SPEC.md
- docs/I18N_ZH_SPEC.md
- docs/FRONTEND_ACCEPTANCE_CHECKLIST.md
- docs/CODEX_FIX_PROMPT.md

## 禁止事项

1. 禁止在指标按钮组件里直接 `createPane`。
2. 禁止在指标按钮组件里直接 `addLineSeries`。
3. 禁止用 `selectedIndicators: string[]` 作为唯一指标系统。
4. 禁止一个指标有多条渲染路径。
5. 禁止同一个指标实例被 toolbar、tag list、chart renderer 分别重复渲染。
6. 禁止 MA、EMA、BOLL、VWAP、SAR 创建副图。
7. 禁止 MACD、RSI、KDJ、ATR、OBV、WR、CCI 叠加到主图。
8. 禁止删除指标时只删除 UI tag，不删除 chart series。
9. 禁止 `Clear all` 只清空 state，不清空 chart object。
10. 禁止中文界面出现 `Precision`、`Auto`、`INDICATORS`、`Clear all`、`Kline` 等英文文案。
11. 禁止右侧盘口卡片使用过窄固定宽度。
12. 禁止主图区、盘口区、成交区高度和宽度完全不可调节。
13. 禁止缓存普通实时成交数据。
14. 禁止指标参数写死。

## 必须事项

1. 所有指标必须通过统一 Indicator Engine 管理。
2. 所有指标必须是 `IndicatorInstance`。
3. 每个 `IndicatorInstance` 必须包含：
   - `id`
   - `kind`
   - `label`
   - `placement`
   - `params`
   - `paneId`
   - `seriesIds`
   - `createdAt`
4. 所有指标添加必须走 `addIndicator`。
5. 所有指标删除必须走 `removeIndicator`。
6. 所有指标清空必须走 `clearIndicators`。
7. 所有指标参数修改必须走 `updateIndicatorParams`。
8. 主图指标必须叠加在 `pane:main`。
9. 成交量指标必须放在 `pane:volume`。
10. 副图指标必须放在独立 `sub` pane。
11. 右侧盘口区必须可横向拖拽调整宽度。
12. 盘口卡片和成交卡片必须可纵向拖拽调整高度。
13. 布局尺寸可以保存到 `localStorage`，但成交数据不允许缓存。
14. 中文环境下必须使用完整中文 UI 文案。
