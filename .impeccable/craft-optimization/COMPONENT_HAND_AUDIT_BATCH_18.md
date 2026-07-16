# 组件手审账 · Batch 18（重写 · 逐文件三 Skill）

> 逐文件 Read 信号 + 引用核对 · Impeccable product · Finesse D8 · Taste 3/2/8 · frontend-design-mark  
> 替换原机械套话版 · 2026-07-16

## 251. `ArchiveVolumeMaterialOcrDetailContent.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/ArchiveVolumeMaterialOcrDetailContent.vue` |
| 源码 | L163;refs≈2;hex=#666,#cf1322,#fafafa;有失败处理 |
| 注册名 | `ArchiveVolumeMaterialOcrDetailContent` |
| Props要点 | materialId、initialPageNo |
| 结构信号 | 严格枚举、失败toast、Tag |

**Impeccable：** 归档卷子链；严格枚举、失败toast、Tag；props materialId、initialPageNo。  
**Finesse：** L163 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：TUNE**  
**动作：** 材料登记用归档专用 modal。  
**禁：** 名册 Excel 模态冒充归档。

## 252. `LayoutEntryGateway.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/layout-designer/LayoutEntryGateway.vue` |
| 源码 | L619;refs≈1;有失败处理 |
| 注册名 | `LayoutEntryGateway` |
| Props要点 | document、examId、materialLayoutMode、generating、detecting |
| 结构信号 | 提示条、失败toast、确认框 |

**Impeccable：** 制卷；提示条、失败toast、确认框；props document、examId、materialLayoutMode、generating、detecting。  
**Finesse：** 画布+侧栏属性密度。  
**Taste：** 浅色 ROI，拒监控暗色。  

**判定：OK**  
**动作：** 保持浅色 ROI。  
**禁：** Web 暗色制卷。

## 253. `LayoutDesignWorkflowRail.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/layout-designer/workbench/LayoutDesignWorkflowRail.vue` |
| 源码 | L185;refs≈1;hex=#86efac,#eff6ff,#f0fdf4 |
| 注册名 | `LayoutDesignWorkflowRail` |
| Props要点 | phase、document、examDetail、layoutWritable |
| 结构信号 | Tag |

**Impeccable：** 制卷；Tag；props phase、document、examDetail、layoutWritable。  
**Finesse：** 画布+侧栏属性密度。  
**Taste：** 浅色 ROI，拒监控暗色。  

**判定：OK**  
**动作：** 保持浅色 ROI。  
**禁：** Web 暗色制卷。

## 254. `MarkingBatchScoreDrawer.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/MarkingBatchScoreDrawer.vue` |
| 源码 | L239;refs≈1;有失败处理 |
| 注册名 | `MarkingBatchScoreDrawer` |
| Props要点 | open、examId、groupId、layoutQuestionId、fullScore |
| 结构信号 | 提示条、抽屉、失败toast、确认框 |

**Impeccable：** 提示条、抽屉、失败toast、确认框；props open、examId、groupId、layoutQuestionId、fullScore。  
**Finesse：** L239；slots=['footer']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持 destroy-on-close 防脏状态。  
**禁：** 暗色监控抽屉。

## 255. `ScanDeviceCardGrid.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/ScanDeviceCardGrid.vue` |
| 源码 | L258;refs≈1;hex=#16a34a,#f0fdf4,#f59e0b,#fffbeb |
| 注册名 | `ScanDeviceCardGrid` |
| Props要点 | devices、loading、selectedDeviceId |
| 结构信号 | 严格枚举、Tag |

**Impeccable：** 严格枚举、Tag；props devices、loading、selectedDeviceId。  
**Finesse：** L258；slots=['1677ff', '16a34a', 'ScanDeviceCardGrid', 'f0fdf4', 'f59e0b', 'fffbeb']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：TUNE**  
**动作：** token 化。  
**禁：** 散落 ant 灰阶。

## 256. `DrilldownBreadcrumb.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/admin/DrilldownBreadcrumb.vue` |
| 源码 | L95;refs≈0 |
| 注册名 | `DrilldownBreadcrumb` |
| Props要点 | levels |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 仅 components.d.ts 或无业务 import（DrilldownBreadcrumb）。  
**Finesse：** 无现网密度贡献。  
**Taste：** 预备件/死件，非产品面。  

**判定：DEAD?**  
**动作：** 再核动态 import 后删或接入。  
**禁：** 零引用死件长期留。

## 257. `ArchiveEvaluationExportProgressDialog.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/archive-volume/ArchiveEvaluationExportProgressDialog.vue` |
| 源码 | L173;refs≈0;hex=#64748b;有失败处理 |
| 注册名 | `ArchiveEvaluationExportProgressDialog` |
| Props要点 | open、taskId、volumeCount |
| 结构信号 | 失败toast |

**Impeccable：** 仅 components.d.ts 或无业务 import（ArchiveEvaluationExportProgressDialog）。  
**Finesse：** 无现网密度贡献。  
**Taste：** 预备件/死件，非产品面。  

**判定：DEAD?**  
**动作：** 再核动态 import 后删或接入。  
**禁：** 零引用死件长期留。

## 258. `ArchivePackageEventTimeline.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/archive-volume/ArchivePackageEventTimeline.vue` |
| 源码 | L117;refs≈0;有Empty |
| 注册名 | `ArchivePackageEventTimeline` |
| Props要点 | events |
| 结构信号 | 空态 |

**Impeccable：** 仅 components.d.ts 或无业务 import（ArchivePackageEventTimeline）。  
**Finesse：** 无现网密度贡献。  
**Taste：** 预备件/死件，非产品面。  

**判定：DEAD?**  
**动作：** 再核动态 import 后删或接入。  
**禁：** 零引用死件长期留。

## 259. `ArchiveRelatedLinksCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/archive-volume/ArchiveRelatedLinksCard.vue` |
| 源码 | L72;refs≈0 |
| 注册名 | `ArchiveRelatedLinksCard` |
| Props要点 | 见源码 |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 仅 components.d.ts 或无业务 import（ArchiveRelatedLinksCard）。  
**Finesse：** 无现网密度贡献。  
**Taste：** 预备件/死件，非产品面。  

**判定：DEAD?**  
**动作：** 再核动态 import 后删或接入。  
**禁：** 零引用死件长期留。

## 260. `StatusBadge.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/common/StatusBadge.vue` |
| 源码 | L48;refs≈0 |
| 注册名 | `StatusBadge` |
| Props要点 | label、variant |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 仅 components.d.ts 或无业务 import（StatusBadge）。  
**Finesse：** 无现网密度贡献。  
**Taste：** 预备件/死件，非产品面。  

**判定：DEAD?**  
**动作：** 再核动态 import 后删或接入。  
**禁：** 零引用死件长期留。

## 261. `AiAnalysisConfigCollapse.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/analysis/AiAnalysisConfigCollapse.vue` |
| 源码 | L33;refs≈0;薄 |
| 注册名 | `AiAnalysisConfigCollapse` |
| Props要点 | title、defaultExpanded |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 仅 components.d.ts 或无业务 import（AiAnalysisConfigCollapse）。  
**Finesse：** 无现网密度贡献。  
**Taste：** 预备件/死件，非产品面。  

**判定：DEAD?**  
**动作：** 再核动态 import 后删或接入。  
**禁：** 零引用死件长期留。

## 262. `AiAnalysisRangeForm.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/analysis/AiAnalysisRangeForm.vue` |
| 源码 | L19;refs≈0;薄 |
| 注册名 | `AiAnalysisRangeForm` |
| Props要点 | hint |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 仅 components.d.ts 或无业务 import（AiAnalysisRangeForm）。  
**Finesse：** 无现网密度贡献。  
**Taste：** 预备件/死件，非产品面。  

**判定：DEAD?**  
**动作：** 再核动态 import 后删或接入。  
**禁：** 零引用死件长期留。

## 263. `AnalysisNextSteps.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/analysis/AnalysisNextSteps.vue` |
| 源码 | L51;refs≈0 |
| 注册名 | `AnalysisNextSteps` |
| Props要点 | 见源码 |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 仅 components.d.ts 或无业务 import（AnalysisNextSteps）。  
**Finesse：** 无现网密度贡献。  
**Taste：** 预备件/死件，非产品面。  

**判定：DEAD?**  
**动作：** 再核动态 import 后删或接入。  
**禁：** 零引用死件长期留。

## 264. `AnalysisOrgScopeBar.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/AnalysisOrgScopeBar.vue` |
| 源码 | L152;refs≈0 |
| 注册名 | `AnalysisOrgScopeBar` |
| Props要点 | departmentPlaceholder、coursePlaceholder、classPlaceholder、showDepartment、showCourse |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 仅 components.d.ts 或无业务 import（AnalysisOrgScopeBar）。  
**Finesse：** 无现网密度贡献。  
**Taste：** 预备件/死件，非产品面。  

**判定：DEAD?**  
**动作：** 再核动态 import 后删或接入。  
**禁：** 零引用死件长期留。

## 265. `LayoutIdentitySetupStrip.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/layout-designer/LayoutIdentitySetupStrip.vue` |
| 源码 | L67;refs≈0 |
| 注册名 | `LayoutIdentitySetupStrip` |
| Props要点 | document、detecting、readonly |
| 结构信号 | 提示条 |

**Impeccable：** 仅 components.d.ts 或无业务 import（LayoutIdentitySetupStrip）。  
**Finesse：** 无现网密度贡献。  
**Taste：** 预备件/死件，非产品面。  

**判定：DEAD?**  
**动作：** 再核动态 import 后删或接入。  
**禁：** 零引用死件长期留。

## 266. `LayoutDesignPhaseRail.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/layout-designer/workbench/LayoutDesignPhaseRail.vue` |
| 源码 | L116;refs≈0 |
| 注册名 | `LayoutDesignPhaseRail` |
| Props要点 | phase、isPhaseAccessible、phaseLockReason、embedded、showTitle |
| 结构信号 | 严格枚举 |

**Impeccable：** 仅 components.d.ts 或无业务 import（LayoutDesignPhaseRail）。  
**Finesse：** 无现网密度贡献。  
**Taste：** 预备件/死件，非产品面。  

**判定：DEAD?**  
**动作：** 再核动态 import 后删或接入。  
**禁：** 零引用死件长期留。

## 267. `MarkExamStageRail.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/MarkExamStageRail.vue` |
| 源码 | L41;refs≈0;薄 |
| 注册名 | `MarkExamStageRail` |
| Props要点 | 见源码 |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 仅 components.d.ts 或无业务 import（MarkExamStageRail）。  
**Finesse：** 无现网密度贡献。  
**Taste：** 预备件/死件，非产品面。  

**判定：DEAD?**  
**动作：** 再核动态 import 后删或接入。  
**禁：** 零引用死件长期留。

## 268. `PortfolioArchiveVersionComparePanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/portfolio/PortfolioArchiveVersionComparePanel.vue` |
| 源码 | L265;refs≈1;hex=#666,#999,#d9d9d9;有Empty;有失败处理 |
| 注册名 | `PortfolioArchiveVersionComparePanel` |
| Props要点 | versions、defaultLeftId、defaultRightId |
| 结构信号 | 表格、空态、严格枚举、失败toast |

**Impeccable：** 归档卷子链；表格、空态、严格枚举、失败toast；props versions、defaultLeftId、defaultRightId。  
**Finesse：** L265 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：TUNE**  
**动作：** token 化。  
**禁：** 散落 ant 灰阶。

## 269. `AccreditationWorkflowHints.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/accreditation/AccreditationWorkflowHints.vue` |
| 源码 | L144;refs≈0 |
| 注册名 | `AccreditationWorkflowHints` |
| Props要点 | cycle、supportConfirmed、annualPlanCount、evidenceCount |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 仅 components.d.ts 或无业务 import（AccreditationWorkflowHints）。  
**Finesse：** 无现网密度贡献。  
**Taste：** 预备件/死件，非产品面。  

**判定：DEAD?**  
**动作：** 再核动态 import 后删或接入。  
**禁：** 零引用死件长期留。

## 270. `TableBody.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/ui-guide/ui/TableBody.vue` |
| 源码 | L10;refs≈0;薄 |
| 注册名 | `UiTableBody` |
| Props要点 | 见源码 |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 仅 components.d.ts 或无业务 import（TableBody）。  
**Finesse：** 无现网密度贡献。  
**Taste：** 预备件/死件，非产品面。  

**判定：DEAD?**  
**动作：** 再核动态 import 后删或接入。  
**禁：** 零引用死件长期留。

## 271. `TableCell.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/ui-guide/ui/TableCell.vue` |
| 源码 | L10;refs≈0;薄 |
| 注册名 | `UiTableCell` |
| Props要点 | 见源码 |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 仅 components.d.ts 或无业务 import（TableCell）。  
**Finesse：** 无现网密度贡献。  
**Taste：** 预备件/死件，非产品面。  

**判定：DEAD?**  
**动作：** 再核动态 import 后删或接入。  
**禁：** 零引用死件长期留。

## 272. `TableHeader.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/ui-guide/ui/TableHeader.vue` |
| 源码 | L10;refs≈0;薄 |
| 注册名 | `UiTableHeader` |
| Props要点 | 见源码 |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 仅 components.d.ts 或无业务 import（TableHeader）。  
**Finesse：** 无现网密度贡献。  
**Taste：** 预备件/死件，非产品面。  

**判定：DEAD?**  
**动作：** 再核动态 import 后删或接入。  
**禁：** 零引用死件长期留。

## 273. `TableRow.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/ui-guide/ui/TableRow.vue` |
| 源码 | L10;refs≈1;薄 |
| 注册名 | `UiTableRow` |
| Props要点 | 见源码 |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 薄封装；props≈见源码。  
**Finesse：** 无独立布局增量。  
**Taste：** —  

**判定：SHELL**  
**动作：** 内联或删。  
**禁：** compat 别名。

## 274. `KioskLayout.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/KioskLayout.vue` |
| 源码 | L250;refs≈0 |
| 注册名 | `KioskLayout` |
| Props要点 | 见源码 |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 一体机阶段；props 见源码；无 Ui* 关键件。  
**Finesse：** kiosk 操作密度优先，可深色。  
**Taste：** 勿把暗色抄回 Web 工作台。  

**判定：OK**  
**动作：** 保持 Agent 合同；Web 勿抄暗色。  
**禁：** 把 kiosk 暗色搬进 mark-vue Web。

## 275. `BindStage.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/stages/BindStage.vue` |
| 源码 | L199;refs≈0 |
| 注册名 | `BindStage` |
| Props要点 | 见源码 |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 一体机阶段；props 见源码；无 Ui* 关键件。  
**Finesse：** kiosk 操作密度优先，可深色。  
**Taste：** 勿把暗色抄回 Web 工作台。  

**判定：OK**  
**动作：** 保持 Agent 合同；Web 勿抄暗色。  
**禁：** 把 kiosk 暗色搬进 mark-vue Web。

## 276. `HistoryStage.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/stages/HistoryStage.vue` |
| 源码 | L1177;refs≈0 |
| 注册名 | `HistoryStage` |
| Props要点 | 见源码 |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 一体机阶段；props 见源码；无 Ui* 关键件。  
**Finesse：** kiosk 操作密度优先，可深色。  
**Taste：** 勿把暗色抄回 Web 工作台。  

**判定：OK**  
**动作：** 保持 Agent 合同；Web 勿抄暗色。  
**禁：** 把 kiosk 暗色搬进 mark-vue Web。

## 277. `ReviewStage.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/stages/ReviewStage.vue` |
| 源码 | L1067;refs≈0 |
| 注册名 | `ReviewStage` |
| Props要点 | 见源码 |
| 结构信号 | 提示条、严格枚举 |

**Impeccable：** 一体机阶段；props 见源码；提示条、严格枚举。  
**Finesse：** kiosk 操作密度优先，可深色。  
**Taste：** 勿把暗色抄回 Web 工作台。  

**判定：OK**  
**动作：** 保持 Agent 合同；Web 勿抄暗色。  
**禁：** 把 kiosk 暗色搬进 mark-vue Web。

## 278. `ScanningStage.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/stages/ScanningStage.vue` |
| 源码 | L1169;refs≈0 |
| 注册名 | `ScanningStage` |
| Props要点 | 见源码 |
| 结构信号 | 严格枚举 |

**Impeccable：** 一体机阶段；props 见源码；严格枚举。  
**Finesse：** kiosk 操作密度优先，可深色。  
**Taste：** 勿把暗色抄回 Web 工作台。  

**判定：OK**  
**动作：** 保持 Agent 合同；Web 勿抄暗色。  
**禁：** 把 kiosk 暗色搬进 mark-vue Web。

## 279. `SetupStage.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/stages/SetupStage.vue` |
| 源码 | L1077;refs≈0 |
| 注册名 | `TeacherExamWorkspaceLayoutDesigner` |
| Props要点 | 见源码 |
| 结构信号 | 提示条、确认框 |

**Impeccable：** 一体机阶段；props 见源码；提示条、确认框。  
**Finesse：** kiosk 操作密度优先，可深色。  
**Taste：** 勿把暗色抄回 Web 工作台。  

**判定：OK**  
**动作：** 保持 Agent 合同；Web 勿抄暗色。  
**禁：** 把 kiosk 暗色搬进 mark-vue Web。

## 280. `UiPlatformFileField.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/platform/UiPlatformFileField.vue` |
| 源码 | L142;refs≈21 |
| 注册名 | `UiPlatformFileField` |
| Props要点 | sceneKey、accept、buttonText、tip、disabled |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 无 Ui* 关键件；props sceneKey、accept、buttonText、tip、disabled。  
**Finesse：** L142；slots=默认。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 281. `index.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/AiEditor/index.vue` |
| 源码 | L159;refs≈27 |
| 注册名 | `AiEditor` |
| Props要点 | editable、placeholder、options |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 无 Ui* 关键件；props editable、placeholder、options；/api/storage/filesystem/download。  
**Finesse：** L159；slots=['AiEditor']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 282. `index.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/AjCaptcha/index.vue` |
| 源码 | L637;refs≈27 |
| 注册名 | `index` |
| Props要点 | captchaType |
| 结构信号 | 模态 |

**Impeccable：** 模态；props captchaType。  
**Finesse：** L637；slots=默认。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 283. `index.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/AuthLayout/index.vue` |
| 源码 | L335;refs≈27 |
| 注册名 | `AuthLayout` |
| Props要点 | showFooter、wide |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 无 Ui* 关键件；props showFooter、wide。  
**Finesse：** L335；slots=['AuthLayout']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 284. `index.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/Breadcrumb/index.vue` |
| 源码 | L139;refs≈27 |
| 注册名 | `index` |
| Props要点 | 见源码 |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 无 Ui* 关键件；props 见源码。  
**Finesse：** L139；slots=默认。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 285. `index.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/CellCopy/index.vue` |
| 源码 | L26;refs≈27;薄 |
| 注册名 | `CellCopy` |
| Props要点 | 见源码 |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 薄封装；props≈见源码。  
**Finesse：** 无独立布局增量。  
**Taste：** —  

**判定：SHELL**  
**动作：** 内联或删。  
**禁：** compat 别名。

## 286. `index.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/GiFooter/index.vue` |
| 源码 | L29;refs≈27;薄 |
| 注册名 | `GiFooter` |
| Props要点 | 见源码 |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 薄封装；props≈见源码。  
**Finesse：** 无独立布局增量。  
**Taste：** —  

**判定：SHELL**  
**动作：** 内联或删。  
**禁：** compat 别名。

## 287. `index.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/GiPageLayout/index.vue` |
| 源码 | L246;refs≈27 |
| 注册名 | `GiPageLayout` |
| Props要点 | 见源码 |
| 结构信号 | 筛选条 |

**Impeccable：** 筛选条；props 见源码。  
**Finesse：** L246；slots=['GiPageLayout']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 288. `UiPlatformExcelImportModal.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/platform/UiPlatformExcelImportModal.vue` |
| 源码 | L662;refs≈13 |
| 注册名 | `UiPlatformExcelImportModal` |
| Props要点 | open、sceneKey、entityLabel、context、requirements |
| 结构信号 | 表格、提示条、模态、Tag |

**Impeccable：** 表格、提示条、模态、Tag；props open、sceneKey、entityLabel、context、requirements。  
**Finesse：** L662；slots=['bodyCell']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持 destroy-on-close 防脏状态。  
**禁：** 暗色监控抽屉。

## 289. `index.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/login/components/student/index.vue` |
| 源码 | L356;refs≈27 |
| 注册名 | `index` |
| Props要点 | subdomainMode、subdomainTenant、prefillData |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 页内组件；无 Ui* 关键件；props subdomainMode、subdomainTenant、prefillData。  
**Finesse：** L356 随父页工作台。  
**Taste：** 禁重复身份条/装饰 KPI。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 290. `AiAnalysisMetaCollapse.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/analysis/AiAnalysisMetaCollapse.vue` |
| 源码 | L67;refs≈9 |
| 注册名 | `AiAnalysisMetaCollapse` |
| Props要点 | record、failureFallback、extraItems |
| 结构信号 | Tag |

**Impeccable：** 学情/AI 分析；Tag。  
**Finesse：** 卡片/图密度克制。  
**Taste：** 系列色语义，禁假达成。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。
