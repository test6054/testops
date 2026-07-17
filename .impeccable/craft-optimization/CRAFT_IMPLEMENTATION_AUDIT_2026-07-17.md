# Craft 代码落地审计 · 2026-07-17 §115

> 对照 `craft-board-hi-fi.html` 硬门禁，源码侧核对。**不替代浏览器 #review-confirm 手审。**

## 1. 硬不变量（17/17）

| # | 不变量 | 证据 |
|---|--------|------|
| 1 | ScoreAnalyticsStatusFlow 真源存在 | `components/workbench/ScoreAnalyticsStatusFlow.vue` |
| 2 | 状态流已挂用 | 引用 ≥3（finalize/publish 链） |
| 3 | SignalBand 产品路径无 tiles | 扫描 variant=tiles → 0（kiosk paper-tiles 非 SignalBand） |
| 4 | WorkbenchContextGateStrip | 文件存在 |
| 5 | ExamSelectGateStrip | 文件存在 |
| 6 | QualityPlanGateStrip | 文件存在 |
| 7 | PortfolioTeacherPickGate | 文件存在 |
| 8 | UiEmpty 默认 size=sm | `Empty.vue` default |
| 9 | UiMetricCard 默认 compact | §113 落地 |
| 10 | 品牌 #1677ff | `styles/ui-tokens.scss` |
| 11 | CreatePageLayout 薄壳 | 仅 router-view |
| 12 | ContextBar 无 ≥4 按钮墙（无更多） | 扫描 → 0 |
| 13 | 产品路径无裸 ant 表单 | Form/Input/Select/Date/Textarea → 0 |
| 14–17 | DEAD 不复活 | MessageThread/SidePanel/Conversation/Inbox 磁盘无文件 |

## 2. 已落地主线（§99–§115）

- 空态 densify + B 钉条门禁
- ContextBar 1 主 + ≤2 次 + 更多
- token / 第二蓝 / 营销阴影收口
- 档案/产品路径 Ui* 表单
- 原语 densify（StateBlock/Metric/Chart/AuthLayout）
- 嵌套 Surface densify（质控看板等）

## 3. 明确不在本轮改码

| 项 | 原因 |
|----|------|
| 浏览器 #review-confirm 勾选 | **用户手审** |
| 学生成绩 36px KPI | 读分语义 |
| Kiosk 触控高度 | 禁止压触控 |
| 旧 #components 脚本 TUNE 句 | 假阳性，以本审计与 #hand-audit 为准 |
| 成绩分析三壳合并 | 看板刻意边界，禁止 |

## 4. 结论

- **代码侧 craft-board 优化建议已企业级落地**（可投产门禁与密度合同）。
- **goal 不可 complete**，直至用户浏览器完成 `#review-confirm` 勾选确认。

## 5. §116 全站 Surface densify 真源

- 全局样式 `_prototype-workbench.scss` 为 Surface 密度真源（index 已 load）。
- 嵌套 `.workbench-surface-card .workbench-surface-card` 去双阴影 + 二次 densify。
- 组件 `WorkbenchSurfaceCard.vue` body 与全局对齐。

## 6. §117 高流量壳 densify

- SignalBand / TaskResultPanel / UiDataTable empty / UiArrowTimeline 笔记本密度收口。

## 7. §119 nybc token 清零 + FilterBar

- 产品路径 `--nybc-*` → `--dp-*`（12 Vue 文件）扫描 → 0
- FilterBar 高度真源 `--dp-control-height-md`
- 仍不替代浏览器 `#review-confirm` 手审

## 8. §120 hex fallback 清零

- 产品 + 组件 `var(--token, #hex)` → `var(--token)`（251 处 · residual 0）
- 控件高度真源 `--dp-control-height-md/sm`
- 仍待用户浏览器 `#review-confirm`

## 9. §121 ant rgba 文本色

- 产品路径 `rgba(0,0,0,*)` 文本色 → `--dp-text-*` residual≈0
- ant 桥字面量未改（防循环）
- 阻塞仍为浏览器手审

## 10. §122 ContextBar 动作墙

- achievement-detail / scan-batch-detail 收口为 1 主 + 更多
- 阻塞仍为浏览器手审

## 11. §123 Ui* token

- DataTable/Segmented/Alert/Tooltip/Metric 等硬 rgba → token/color-mix
- 阻塞仍为浏览器手审

## 12. §124 代码侧 craft 全量不变量复验（2026-07-17）

> 不替代浏览器 `#review-confirm` 手审。

| # | 不变量 | 结果 |
|---|--------|------|
| 1 | ScoreAnalyticsStatusFlow 存在 | True |
| 2 | StatusFlow 挂用 | refs=3 |
| 3 | SignalBand 无 tiles | hits=0 |
| 4–7 | 四门禁真源存在 | Exam/Quality/Portfolio/Context 均 True |
| 8 | ExamSelectGateStrip 挂用 | 36 文件 |
| 9 | QualityPlanGateStrip 挂用 | 15 文件 |
| 10 | PortfolioTeacherPickGate 挂用 | 25 文件 |
| 11 | UiEmpty 默认 sm | True |
| 12 | 产品路径无 a-button/empty/result/alert | 0 |
| 13 | 无 nybc-* 产品 token | 0 |
| 14 | ContextBar ≥4 按钮墙 | 0 |
| 15–18 | DEAD 不复活 MessageThread/SidePanel/Conversation/Inbox | all absent |
| 19 | 品牌 #1677ff | True |
| 20 | CreatePageLayout 薄壳 | True |

**结论**：代码侧 craft-board 硬门禁 **全绿**。剩余阻塞仅为用户浏览器 `#review-confirm` A/B 勾选确认。


## 13. §125 文档对齐

- #components 脚本 TUNE 全量对齐 OK
- 阻塞仍为浏览器手审

## 14. §126 SCSS hex fallback

- styles 产品 SCSS residual 0（ui-tokens 除外）
- 阻塞仍为浏览器手审

## 15. §127 Matrix/阴影/主色

- MatrixWorkbench color-mix token
- 阴影 fallback 清零
- 阻塞仍为浏览器手审

## 16. §128 产品路径 rgba 扫尾

- residual 0（边界除外）
- 阻塞仍为浏览器手审

## 129. 代码侧 craft 终验 · 阻塞浏览器手审（2026-07-17）

| 不变量 | 结果 |
|--------|------|
| ScoreAnalyticsStatusFlow | exists · refs=3 |
| ExamSelectGateStrip 挂用 | 36 |
| QualityPlanGateStrip 挂用 | 15 |
| PortfolioTeacherPickGate 挂用 | 25 |
| WorkbenchContextGateStrip | True |
| SignalBand tiles | 0 |
| 产品 a-button/empty/result/alert | 0 |
| nybc-* | 0 |
| ContextBar 墙 | 0 |
| 产品硬 rgba（边界外） | 0 |
| UiEmpty 默认 sm | True |
| 品牌 #1677ff | True |

**结论**：代码侧 craft-board 企业级门禁 **ALL_GREEN=True**。  
**阻塞（需用户）**：浏览器打开 `craft-board-hi-fi.html#review-confirm` 勾选 A/B；未勾选不得 complete goal。

