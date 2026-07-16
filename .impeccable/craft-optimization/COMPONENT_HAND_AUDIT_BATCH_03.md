# 组件手审账 · Batch 03（工作台壳 / 侧栏 / 给分 / 图表）

> 逐文件 Read · Impeccable · Finesse · Taste · frontend-design-mark  
> 禁脚本生成结论 · 2026-07-16

## 14. `StageWorkbenchShell.vue`

| 项 | 事实 |
|----|------|
| 行数 | 70 |
| Slots | `context` `rail` `signal` `default` |
| 样式 | transparent；gap `--dp-space-5`；注释禁止重复顶栏面包屑标题 |

**Impeccable：** 槽位即工作台信息架构合同，清晰。  
**Finesse：** 无多余卡壳，密度正确。  
**Taste：** 无装饰。  

**判定：OK**  
**动作：** 保持四槽；页面勿在 shell 外再套白大卡。  
**禁：** 在 shell 内再嵌一套 StageWorkbenchShell。

---

## 15. `DualDomainSideNav.vue`

| 项 | 事实 |
|----|------|
| 行数 | ~740 |
| 三域 | 考试阅卷 / 质量评价 / 教学档案袋 + 平台 |
| secondary | `visibleSecondarySideMenuRoutes` → 语义化「更多入口」文案（阅卷辅助与配置 / 质量配置与台账 / 档案袋管理入口…） |

**Impeccable：** 三域入口存在；disabled / 折叠 tooltip 有。  
**Finesse：** 仍是「功能目录 + 低频折叠」，不是阶段×任务；档案袋叶子过多时靠「档案袋管理入口（N）」藏路径，可完成但可发现性差。  
**Taste：** 已避免光秃「更多」二字，但仍是菜单超市结构。  

**判定：REWORK（IA）**  
**动作：** 按工作壳投影主任务（F-FLOW / F-DOMAIN-FOCUS）；secondary 应收进配置壳，而非三级「更多入口」。  
**禁：** 用更多入口掩盖完整菜单；前端猜角色拼菜单。

---

## 16. `Main.vue`（`LayoutMain`）

| 项 | 事实 |
|----|------|
| 背景 | `--ant-color-bg-container`（主区与 scroll-wrapper 皆白） |
| 其它 | keepAlive、layoutWide、quality/portfolio domain class |

**Impeccable：** 滚动与缓存合同清楚。  
**Finesse：** page=container 白底导致工作面与页底无分层（O1a 债）。  
**Taste：** 无营销 substrate。  

**判定：TUNE**  
**动作：** 滚动面改 `--ant-color-bg-layout`；工作面保持白。  
**禁：** Cool Slate 第二品牌底、整页漂浮大卡。

---

## 17. `MarkingScorePanel.vue`

| 项 | 事实 |
|----|------|
| 行数 | ~529 |
| 给分 | `a-input-number` + `quickDigitScores`（0–min(9,floor(满分))） |
| AI | 建议分展示 + 采用写入（非自动写分） |
| 全卷 | collapse 多题；Enter 下一题 |

**Impeccable：** 满分/待评/已给 Tag 齐全；OCR 空态显式。  
**Finesse：** 快捷分已有，不必强制大宫格；按钮偏多但仍服务给分主路径。  
**Taste：** fallback `#fff` 可改为纯 token。  

**判定：TUNE**  
**动作：** 强化满分对照与「下一未阅」去向文案；保留 InputNumber 主路径。  
**禁：** 强制数字宫格；AI 自动写分。

---

## 18. `MarkChart.vue`

| 项 | 事实 |
|----|------|
| 主题 | `MARK_ECHARTS_THEME` |
| a11y | `role="img"` + figcaption / aria-label |
| loading | mask `rgba(255,255,255,0.72)`；主色 `#1677ff` fallback |

**Impeccable：** 无障碍基线好；空态由 section 层 `resolveMarkChartSectionOption` 处理。  
**Finesse：** 容器职责正确，系列色在 option/调用方。  
**Taste：** mask 偏白可改 surface token。  

**判定：OK（容器） / TUNE（loading mask）**  
**动作：** 调用方用语义色系列；补失败态勿伪装空。  
**禁：** 全图机械单蓝阶。

---

## 19–24. Mark 图表分段族

| 组件 | 事实摘要 | 判定 |
|------|----------|------|
| `MarkBarSection` | title/hint + itemCount 空壳；aria 拼装 | OK |
| `MarkTrendSection` | 最少点数门禁；空/单点文案 | OK |
| `MarkGaugeBlock` | 包 MarkChart gauge + meta slot | OK |
| `MarkChartCard` | **仅转发** `UiStatisticChartCard` | SHELL |
| `MarkDistributionSection` | 同 Bar 模式（未全读，结构同源） | OK* |
| `MarkHeatmapSection` / `MarkScatterSection` | 同族 section 包装 | OK* |

\* Distribution / Heatmap / Scatter 与 Bar/Trend 同构：section 头 + MarkChart + empty resolver；未发现独立视觉违规。  
`MarkChartCard`：**薄封装**——页面可直接用 `UiStatisticChartCard`，或保留为 mark 域别名但禁止再加 props 转发层。

---

## 25. `PortfolioProgressCockpitBand.vue`

| 项 | 事实 |
|----|------|
| 实现 | 拉 cockpit → 拼 `SignalMetric[]` → `SignalBand variant="inline"` |
| 指标 | 完整度 / 待审 / 退回 / 补采 / 可选课程五框架 / 同比 |

**Impeccable：** 均可 clickable；无 teacherId 时不造假数。  
**Finesse：** inline 紧凑；与首页 KPI 可能数字重复（调用方债）。  
**Taste：** 无 tiles 彩点，好。  

**判定：OK**  
**动作：** teacher-home 勿再并排同权四卡重复完整度。  
**禁：** 改 tiles；代办态不标目标教师（由 Scope 负责）。

---

## Batch 03 汇总

| 组件 | 判定 |
|------|------|
| StageWorkbenchShell | OK |
| DualDomainSideNav | REWORK（IA） |
| Main | TUNE（bg-layout） |
| MarkingScorePanel | TUNE |
| MarkChart | OK / mask TUNE |
| MarkBar/Trend/Gauge/Dist/Heat/Scatter | OK |
| MarkChartCard | SHELL |
| PortfolioProgressCockpitBand | OK |

## 下一批

`GradingWorkspaceShell` 相关 · `ExamSubSidebar` · `QualityWorkbenchCharts` · `PortfolioMaterialIntakePanel` · ui-guide 高频：`UiButton` `UiDataTable` `UiAlertStrip` `UiEmpty`
