# 组件手审账 · Batch 04（考试侧栏 / 沉浸给分 / 质量图 / 表格提示 / 采集）

> 逐文件 Read · Impeccable · Finesse · Taste · frontend-design-mark  
> 禁脚本生成结论 · 2026-07-16

## 26. `ExamSubSidebar.vue`

| 项 | 事实 |
|----|------|
| 结构 | 考试切换 → 旅程进度条 → `ExamJourneySidebarNav` →「当前步骤功能」→ `ExamSubSidebarNav` |
| Props | 考试展示名/状态、journeyStages、activeJourneyKey、collapsed… |
| Token | 无硬编码 hex |

**Impeccable：** 概览与步骤功能分层清楚；进度 % 与 attention 态可见。  
**Finesse：** 旅程×步骤双轨符合考试工作台 operate 密度。  
**Taste：** 文案「当前步骤功能」略说明书味，可缩短为「本步功能」。  

**判定：OK / 文案 TUNE**  
**动作：** 保持双轨；文案可收敛。  
**禁：** 与 DualDomainSideNav 混职责；在侧栏堆 KPI 卡。

---

## 27. `ExamSubSidebarNav.vue`

| 项 | 事实 |
|----|------|
| 数据 | `getMenuGroupsForJourney(activeJourneyKey, …)` |
| 角标 | 经验助教待办 count |

**Impeccable：** 菜单随旅程裁剪，合同在 constants。  
**Finesse：** 折叠仅图标，可操作。  
**Taste：** OK。  

**判定：OK**  
**动作：** 新菜单项必须进 journey 分组表，禁止页内私挂。  
**禁：** 在此组件写死跨旅程全量菜单。

---

## 28. `GradingWorkspaceLayout.vue`

| 项 | 事实 |
|----|------|
| 注释 | 左卷右分；layoutWide；涉密强制水印 |
| aside | 默认 380，可拖 280–520，localStorage |

**Impeccable：** 涉密水印合同正确。  
**Finesse：** 行业给分密度对；拖拽宽度有利于长评。  
**Taste：** 非暗色沉浸，符合主题锁。  

**判定：OK**  
**动作：** 保持；勿改暗色监控风。  
**禁：** 沉浸页再套 ContextBar / StageWorkbenchShell。

---

## 29. `GradingImmersionChrome.vue`

| 项 | 事实 |
|----|------|
| 槽 | lead / status / actions |
| 样式 | surface + border panel |

**Impeccable：** 返回任务池默认文案清晰。  
**Finesse：** 顶栏紧凑。  
**Taste：** OK。  

**判定：OK**  
**动作：** 动作槽限 1–2 个主路径按钮。  
**禁：** 堆筛选 KPI。

---

## 30. `QualityWorkbenchCharts.vue`

| 项 | 事实 |
|----|------|
| 实现 | groups → `MarkBarSection`；insight hint；option 缓存 |
| 空组 | `items.length===0` 不渲染 |

**Impeccable：** aria 含项数；空组隐藏优于假图。  
**Finesse：** auto-fit 网格适合质量页。  
**Taste：** 无装饰卡框。  
**缺口：** 无显式「接口失败」态——失败若传空 groups 会像真无数据（调用方债）。  

**判定：OK / 失败态 TUNE（调用方）**  
**动作：** 调用方区分 error vs empty；图色走语义系列。  
**禁：** 方案未确认仍渲染达成图。

---

## 31. `QualityPageContextBar.vue`

| 项 | 事实 |
|----|------|
| 实现 | 条件渲染 `ContextBar`；无 actions/status/title 则不显示 |

**Impeccable：** 有「空则隐藏」语义，略超纯转发。  
**Finesse：** 可接受的域适配。  
**Taste：** OK。  

**判定：OK（边界薄壳可留）**  
**动作：** 勿再包一层 QualityPageHeader。  
**禁：** 在此重复 QualityScopeChrome 字段。

---

## 32. `UiDataTable.vue`

| 项 | 事实 |
|----|------|
| 能力 | 分页/选择/空态 preset/`emptyKind`/响应式列/flat |
| 空态 | `UiEmpty` + empty-action 槽 |

**Impeccable：** 空态可区分 kind（调用方须传对）。  
**Finesse：** 工作台表格主原语。  
**Taste：** 默认卡面包一层，`flat` 可去卡。  

**判定：OK**  
**动作：** 失败/权限用正确 emptyKind 或外层 StateBlock，勿一律「暂无数据」。  
**禁：** 页内再包私有 Table 皮肤。

---

## 33. `UiAlertStrip.vue`

| 项 | 事实 |
|----|------|
| 默认 | `dense: true` `inline: true`（注释：笔记本优先，避免大框） |
| slots | actions / meta / default |

**Impeccable：** 已针对「大框占屏」做默认紧凑——与产品裁决一致。  
**Finesse：** inline 适合工作台门禁。  
**Taste：** 调用方若显式 `inline=false` 会回到大块——纪律在调用方。  

**判定：OK**  
**动作：** 工作台阻断默认保持 inline；多行说明才关 inline。  
**禁：** 方案未确认再用全宽黄 Alert 叠第二层。

---

## 34. `UiEmpty.vue`

| 项 | 事实 |
|----|------|
| 默认 | `showIcon: false`；有 title 时默认不展示废话 description |

**Impeccable：** 防「标题+空话」设计正确。  
**Finesse / Taste：** OK。  

**判定：OK**  
**动作：** 业务空态必须带可执行 action 槽。  
**禁：** 用「暂无数据」掩盖接口失败。

---

## 35. `PortfolioMaterialIntakePanel.vue`

| 项 | 事实 |
|----|------|
| 结构 | SignalBand + 三块 UiCard（来源 / 智能反馈 / 分类字段）+ AlertStrip 阶段 |
| 动作 | 扫描 / 登记 / 重试 AI / 重分类；readOnly 代办场景 |

**Impeccable：** 退回原因、AI 失败、阶段条分态清楚。  
**Finesse：** 三卡纵向偏重；可收为标题分区减少卡壳。  
**Taste：** AlertStrip 默认 inline，好。  

**判定：TUNE**  
**动作：** 减少嵌套 Card；确认入库与代办边界保持「AI 不自动入库」。  
**禁：** AI 失败仍显示「暂无数据」；代办替签隐私。

---

## Batch 04 汇总

| 组件 | 判定 |
|------|------|
| ExamSubSidebar | OK / 文案 TUNE |
| ExamSubSidebarNav | OK |
| GradingWorkspaceLayout | OK |
| GradingImmersionChrome | OK |
| QualityWorkbenchCharts | OK |
| QualityPageContextBar | OK |
| UiDataTable | OK |
| UiAlertStrip | OK（默认紧凑） |
| UiEmpty | OK |
| PortfolioMaterialIntakePanel | TUNE |

累计手审约 **35**。

## 下一批

`UiButton` / `UiTag` / `UiDrawer` / `UiConfirmDialog` / `UiBatchActionBar` · `WorkbenchSurfaceCard` · `MatrixWorkbench` · `ScanImageStage` · `ArchiveVolumeSubSidebar`
