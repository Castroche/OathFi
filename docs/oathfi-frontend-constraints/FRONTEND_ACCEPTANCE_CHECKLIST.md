# Frontend Acceptance Checklist

## 指标系统

- [ ] 点击 MA 只添加一条 MA。
- [ ] MA 默认显示 MA(10)。
- [ ] MA 可以修改为 MA(20)、MA(60)、MA(120)。
- [ ] 可以同时存在 MA(10)、MA(20)、MA(60)。
- [ ] 删除 MA(20) 不影响 MA(10)、MA(60)。
- [ ] MA 不生成副图。
- [ ] EMA 不生成副图。
- [ ] BOLL 不生成副图。
- [ ] VWAP 不生成副图。
- [ ] SAR 不生成副图。
- [ ] MACD 只生成一个副图。
- [ ] MACD 不重复出现两份。
- [ ] RSI/KDJ/ATR/OBV/WR/CCI 只生成各自副图。
- [ ] 删除任意指标后，series、tag、legend 全部消失。
- [ ] Clear all 后，所有指标和副图都消失。
- [ ] 切换周期后，指标不重复生成。
- [ ] 切换交易对后，指标不重复生成。

## 参数系统

- [ ] 所有指标均可打开设置面板。
- [ ] MA 支持 period、source、offset。
- [ ] EMA 支持 period、source、offset。
- [ ] BOLL 支持 period、stdDev、source、basisType。
- [ ] VWAP 支持 anchor、source。
- [ ] SAR 支持 step、max。
- [ ] VOL 支持 showMA、ma1、ma2。
- [ ] MACD 支持 fast、slow、signal、source。
- [ ] RSI 支持 period、source、overbought、oversold。
- [ ] KDJ 支持 period、kSmoothing、dSmoothing。
- [ ] ATR 支持 period。
- [ ] WR 支持 period。
- [ ] CCI 支持 period、source。
- [ ] 修改参数后只更新当前指标，不新增副图，不重复添加。

## 布局

- [ ] 主图区和右侧盘口区可以拖拽调整宽度。
- [ ] 右侧盘口卡片默认宽度足够展示价格、数量、合计。
- [ ] 右侧盘口卡片和成交卡片可以拖拽调整高度。
- [ ] 页面下方没有大面积空白。
- [ ] 右侧卡片不会撑开页面高度。
- [ ] 图表容器不会溢出视口。

## 盘口

- [ ] Precision 改为 聚合粒度。
- [ ] Auto 改为 自动。
- [ ] 默认聚合粒度为 自动。
- [ ] ETH/USDT 默认不是整数盘口。
- [ ] 默认至少展示卖盘 12 档、买盘 12 档。

## 成交

- [ ] 最近实时成交 改为 最新大额成交。
- [ ] 不显示 已缓存 xx 条。
- [ ] 只显示最新 15 条大额成交。
- [ ] 不显示普通小额成交。
- [ ] 切换交易对时清空大额成交列表。

## 中文

- [ ] 不出现 INDICATORS。
- [ ] 不出现 Clear all。
- [ ] 不出现 Precision。
- [ ] 不出现 Auto。
- [ ] 不出现 Kline 终端。
