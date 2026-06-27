# OathFi 前端修复约束包

这个压缩包用于约束 Codex 修复 OathFi / NeuroTrade 的专业 K 线工作区。

## 使用方式

1. 解压本包。
2. 将 `AGENTS.md` 放到项目根目录。
3. 将 `docs/` 文件夹整体复制到项目根目录。
4. 打开 Codex，让它先阅读：
   - `AGENTS.md`
   - `docs/INDICATOR_ENGINE_SPEC.md`
   - `docs/CHART_PANE_POLICY.md`
   - `docs/RESIZABLE_WORKSPACE_SPEC.md`
   - `docs/I18N_ZH_SPEC.md`
   - `docs/FRONTEND_ACCEPTANCE_CHECKLIST.md`
   - `docs/CODEX_FIX_PROMPT.md`
5. 让 Codex 按 `docs/CODEX_FIX_PROMPT.md` 执行修复。

## 目标

修复以下问题：

- 指标重复生成。
- MA、EMA、BOLL、VWAP、SAR 错误生成副图。
- MACD、RSI、KDJ 等副图指标重复渲染。
- 指标参数无法自由调节。
- 指标删除不完整。
- 右侧盘口卡片过小。
- 图表区、盘口区、成交区无法拖拽调整。
- 中文界面中英文混杂。
- 实时成交缓存太多。
