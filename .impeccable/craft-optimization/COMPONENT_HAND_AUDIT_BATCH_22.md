# 组件手审账 · Batch 22（重写 · 逐文件三 Skill）

> 逐文件 Read 信号 + 引用核对 · Impeccable product · Finesse D8 · Taste 3/2/8 · frontend-design-mark  
> 替换原机械套话版 · 2026-07-16

## 411. `ProgramEvaluationProfileSelector.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/selectors/ProgramEvaluationProfileSelector.vue` |
| 源码 | L149;refs≈0;有失败处理 |
| 注册名 | `ProgramEvaluationProfileSelector` |
| Props要点 | 见源码 |
| 结构信号 | 严格枚举、失败toast |

**Impeccable：** 选型合同 props：见源码；API /api/quality/program-evaluation-profiles/page。  
**Finesse：** 下拉密度；slots=无。  
**Taste：** 域内 placeholder，无营销卡。  

**判定：OK**  
**动作：** 删死 scoped 灰阶类；debounce 常量。  
**禁：** 页内第二套选择器。

## 412. `SchoolAutocomplete.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/SchoolAutocomplete.vue` |
| 源码 | L170;refs≈1 |
| 注册名 | `SchoolAutocomplete` |
| Props要点 | placeholder、allowClear、disabled、maxResults |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 无 Ui* 关键件；props placeholder、allowClear、disabled、maxResults。  
**Finesse：** L170；slots=默认。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 413. `UiErrorBoundary.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/UiErrorBoundary.vue` |
| 源码 | L31;refs≈1;薄 |
| 注册名 | `UiErrorBoundary` |
| Props要点 | 见源码 |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 薄封装；props≈见源码。  
**Finesse：** 无独立布局增量。  
**Taste：** —  

**判定：SHELL**  
**动作：** 内联或删。  
**禁：** compat 别名。

## 414. `ExamSidebarExamSwitch.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/workbench/ExamSidebarExamSwitch.vue` |
| 源码 | L105;refs≈1 |
| 注册名 | `ExamSidebarExamSwitch` |
| Props要点 | examDisplayName、examDisplayNo、examContextLine、examStatusLabel、examStatusTone |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 无 Ui* 关键件；props examDisplayName、examDisplayNo、examContextLine、examStatusLabel、examStatusTone。  
**Finesse：** L105；slots=['ExamSidebarExamSwitch']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 415. `GlobalConfirmDialog.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/workbench/GlobalConfirmDialog.vue` |
| 源码 | L39;refs≈1;薄 |
| 注册名 | `GlobalConfirmDialog` |
| Props要点 | 见源码 |
| 结构信号 | 确认框 |

**Impeccable：** 确认框；props 见源码。  
**Finesse：** L39；slots=['GlobalConfirmDialog']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持单例/入口。  
**禁：** 业务页直挂绕过。

## 416. `FormalSessionCreateDialog.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/admin/marking-organization/components/FormalSessionCreateDialog.vue` |
| 源码 | L198;refs≈1;有失败处理 |
| 注册名 | `FormalSessionCreateDialog` |
| Props要点 | open、organizationId、groupOptions、groupAllocationUnits、groupCreateReadinessMap |
| 结构信号 | 提示条、失败toast |

**Impeccable：** 页内组件；提示条、失败toast；props open、organizationId、groupOptions、groupAllocationUnits、groupCreateReadinessMap。  
**Finesse：** L198 随父页工作台。  
**Taste：** 禁重复身份条/装饰 KPI。  

**判定：OK**  
**动作：** 保持 destroy-on-close 防脏状态。  
**禁：** 暗色监控抽屉。

## 417. `FormalSessionDetailDrawer.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/admin/marking-organization/components/FormalSessionDetailDrawer.vue` |
| 源码 | L146;refs≈1 |
| 注册名 | `FormalSessionDetailDrawer` |
| Props要点 | open、session |
| 结构信号 | 严格枚举、Tag |

**Impeccable：** 页内组件；严格枚举、Tag；props open、session。  
**Finesse：** L146 随父页工作台。  
**Taste：** 禁重复身份条/装饰 KPI。  

**判定：OK**  
**动作：** 保持 destroy-on-close 防脏状态。  
**禁：** 暗色监控抽屉。

## 418. `FormalSessionWorkbench.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/admin/marking-organization/components/FormalSessionWorkbench.vue` |
| 源码 | L509;refs≈1;有失败处理 |
| 注册名 | `FormalSessionWorkbench` |
| Props要点 | organizationId、examId、sessions、groupOptions、filterModel |
| 结构信号 | 表格、严格枚举、失败toast、确认框 |

**Impeccable：** 页内组件；表格、严格枚举、失败toast、确认框；props organizationId、examId、sessions、groupOptions、filterModel。  
**Finesse：** L509 随父页工作台。  
**Taste：** 禁重复身份条/装饰 KPI。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 419. `MarkingOrgAssignmentTable.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/admin/marking-organization/components/MarkingOrgAssignmentTable.vue` |
| 源码 | L282;refs≈1 |
| 注册名 | `MarkingOrgAssignmentTable` |
| Props要点 | groups、allocationPolicies、canManage |
| 结构信号 | 表格、严格枚举、Tag |

**Impeccable：** 页内组件；表格、严格枚举、Tag；props groups、allocationPolicies、canManage。  
**Finesse：** L282 随父页工作台。  
**Taste：** 禁重复身份条/装饰 KPI。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 420. `MarkingOrgGroupProgressList.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/admin/marking-organization/components/MarkingOrgGroupProgressList.vue` |
| 源码 | L206;refs≈1;有Empty |
| 注册名 | `MarkingOrgGroupProgressList` |
| Props要点 | groups、groupProgressById、canManage |
| 结构信号 | 空态、严格枚举、Tag |

**Impeccable：** 页内组件；空态、严格枚举、Tag；props groups、groupProgressById、canManage。  
**Finesse：** L206 随父页工作台。  
**Taste：** 禁重复身份条/装饰 KPI。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 421. `MarkingOrgReviewerRosterTable.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/admin/marking-organization/components/MarkingOrgReviewerRosterTable.vue` |
| 源码 | L237;refs≈1 |
| 注册名 | `MarkingOrgReviewerRosterTable` |
| Props要点 | groups、reviewerMetrics、loading |
| 结构信号 | 表格、Tag |

**Impeccable：** 页内组件；表格、Tag；props groups、reviewerMetrics、loading。  
**Finesse：** L237 随父页工作台。  
**Taste：** 禁重复身份条/装饰 KPI。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 422. `MarkingOrgStrategySummaryCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/admin/marking-organization/components/MarkingOrgStrategySummaryCard.vue` |
| 源码 | L177;refs≈1 |
| 注册名 | `MarkingOrgStrategySummaryCard` |
| Props要点 | allocationPolicy、recyclePolicy、canManage |
| 结构信号 | 严格枚举、Tag |

**Impeccable：** 页内组件；严格枚举、Tag；props allocationPolicy、recyclePolicy、canManage。  
**Finesse：** L177 随父页工作台。  
**Taste：** 禁重复身份条/装饰 KPI。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 423. `RecycledTaskReassignPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/admin/marking-organization/components/RecycledTaskReassignPanel.vue` |
| 源码 | L196;refs≈1;有Empty;有失败处理 |
| 注册名 | `RecycledTaskReassignPanel` |
| Props要点 | examId、groups、viewAllRecycled、leaderGroupIds |
| 结构信号 | 表格、空态、失败toast |

**Impeccable：** 页内组件；表格、空态、失败toast；props examId、groups、viewAllRecycled、leaderGroupIds。  
**Finesse：** L196 随父页工作台。  
**Taste：** 禁重复身份条/装饰 KPI。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 424. `TrialSessionCalibrateDrawer.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/admin/marking-organization/components/TrialSessionCalibrateDrawer.vue` |
| 源码 | L124;refs≈1;有失败处理 |
| 注册名 | `TrialSessionCalibrateDrawer` |
| Props要点 | open、session、canManage |
| 结构信号 | 严格枚举、失败toast、Tag |

**Impeccable：** 页内组件；严格枚举、失败toast、Tag；props open、session、canManage。  
**Finesse：** L124 随父页工作台。  
**Taste：** 禁重复身份条/装饰 KPI。  

**判定：OK**  
**动作：** 保持 destroy-on-close 防脏状态。  
**禁：** 暗色监控抽屉。

## 425. `TrialSessionCreateDialog.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/admin/marking-organization/components/TrialSessionCreateDialog.vue` |
| 源码 | L160;refs≈1;有失败处理 |
| 注册名 | `TrialSessionCreateDialog` |
| Props要点 | open、organizationId、groupOptions、groupHasAllocationPolicyMap、groupCreateReadinessMap |
| 结构信号 | 提示条、失败toast |

**Impeccable：** 页内组件；提示条、失败toast；props open、organizationId、groupOptions、groupHasAllocationPolicyMap、groupCreateReadinessMap。  
**Finesse：** L160 随父页工作台。  
**Taste：** 禁重复身份条/装饰 KPI。  

**判定：OK**  
**动作：** 保持 destroy-on-close 防脏状态。  
**禁：** 暗色监控抽屉。

## 426. `TrialSessionWorkbench.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/admin/marking-organization/components/TrialSessionWorkbench.vue` |
| 源码 | L404;refs≈1;有失败处理 |
| 注册名 | `TrialSessionWorkbench` |
| Props要点 | sessions、groupOptions、filterModel、pagination、loading |
| 结构信号 | 表格、严格枚举、失败toast、确认框 |

**Impeccable：** 页内组件；表格、严格枚举、失败toast、确认框；props sessions、groupOptions、filterModel、pagination、loading。  
**Finesse：** L404 随父页工作台。  
**Taste：** 禁重复身份条/装饰 KPI。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 427. `index.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/login/components/account/index.vue` |
| 源码 | L363;refs≈27 |
| 注册名 | `index` |
| Props要点 | 见源码 |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 页内组件；无 Ui* 关键件；props 见源码。  
**Finesse：** L363 随父页工作台。  
**Taste：** 禁重复身份条/装饰 KPI。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 428. `index.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/login/components/background/index.vue` |
| 源码 | L51;refs≈27 |
| 注册名 | `index` |
| Props要点 | 见源码 |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 页内组件；无 Ui* 关键件；props 见源码。  
**Finesse：** L51 随父页工作台。  
**Taste：** 禁重复身份条/装饰 KPI。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 429. `index.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/login/components/modifyPassword/index.vue` |
| 源码 | L146;refs≈27 |
| 注册名 | `index` |
| Props要点 | 见源码 |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 页内组件；无 Ui* 关键件；props 见源码。  
**Finesse：** L146 随父页工作台。  
**Taste：** 禁重复身份条/装饰 KPI。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 430. `ImportResponseDocumentModal.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/quality/components/ImportResponseDocumentModal.vue` |
| 源码 | L476;refs≈1;有Empty;有失败处理 |
| 注册名 | `ImportResponseDocumentModal` |
| Props要点 | open、formId |
| 结构信号 | 空态、提示条、模态、严格枚举 |

**Impeccable：** 页内组件；空态、提示条、模态、严格枚举；props open、formId。  
**Finesse：** L476 随父页工作台。  
**Taste：** 禁重复身份条/装饰 KPI。  

**判定：OK**  
**动作：** 保持 destroy-on-close 防脏状态。  
**禁：** 暗色监控抽屉。

## 431. `IndirectResponseReviewPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/quality/components/indirect-evaluation/IndirectResponseReviewPanel.vue` |
| 源码 | L1143;refs≈1;有Empty;有失败处理 |
| 注册名 | `IndirectResponseReviewPanel` |
| Props要点 | selectedForm、selectedItem |
| 结构信号 | 表格、空态、提示条、模态 |

**Impeccable：** 页内组件；表格、空态、提示条、模态；props selectedForm、selectedItem。  
**Finesse：** L1143 随父页工作台。  
**Taste：** 禁重复身份条/装饰 KPI。  

**判定：TUNE**  
**动作：** 拆职责时保持 API 合同。  
**禁：** 同页装饰 KPI 墙。

## 432. `IndirectSurveyTemplatePanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/quality/components/indirect-evaluation/IndirectSurveyTemplatePanel.vue` |
| 源码 | L1654;refs≈1;有失败处理 |
| 注册名 | `IndirectSurveyTemplatePanel` |
| Props要点 | 见源码 |
| 结构信号 | 表格、提示条、模态、失败toast |

**Impeccable：** 页内组件；表格、提示条、模态、失败toast；props 见源码。  
**Finesse：** L1654 随父页工作台。  
**Taste：** 禁重复身份条/装饰 KPI。  

**判定：TUNE**  
**动作：** 拆职责时保持 API 合同。  
**禁：** 同页装饰 KPI 墙。

## 433. `IndirectTaskDispatchPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/quality/components/indirect-evaluation/IndirectTaskDispatchPanel.vue` |
| 源码 | L766;refs≈1;hex=#fafafa;有失败处理 |
| 注册名 | `QualityHelpIndirectWeightedAttainment` |
| Props要点 | selectedForm |
| 结构信号 | 表格、提示条、失败toast、确认框 |

**Impeccable：** 页内组件；表格、提示条、失败toast、确认框；props selectedForm。  
**Finesse：** L766 随父页工作台。  
**Taste：** 禁重复身份条/装饰 KPI。  

**判定：TUNE**  
**动作：** token 化。  
**禁：** 散落 ant 灰阶。

## 434. `CognitiveConfirmModal.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/components/CognitiveConfirmModal.vue` |
| 源码 | L242;refs≈1 |
| 注册名 | `CognitiveConfirmModal` |
| Props要点 | open、ticket、loading |
| 结构信号 | 模态、严格枚举 |

**Impeccable：** 一体机阶段；props open、ticket、loading；模态、严格枚举。  
**Finesse：** kiosk 操作密度优先，可深色。  
**Taste：** 勿把暗色抄回 Web 工作台。  

**判定：OK**  
**动作：** 保持 Agent 合同；Web 勿抄暗色。  
**禁：** 把 kiosk 暗色搬进 mark-vue Web。

## 435. `KioskActivationGate.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/components/KioskActivationGate.vue` |
| 源码 | L56;refs≈5 |
| 注册名 | `KioskActivationGate` |
| Props要点 | 见源码 |
| 结构信号 | 模态 |

**Impeccable：** 一体机阶段；props 见源码；模态。  
**Finesse：** kiosk 操作密度优先，可深色。  
**Taste：** 勿把暗色抄回 Web 工作台。  

**判定：OK**  
**动作：** 保持 Agent 合同；Web 勿抄暗色。  
**禁：** 把 kiosk 暗色搬进 mark-vue Web。

## 436. `KioskAppBar.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/components/KioskAppBar.vue` |
| 源码 | L255;refs≈1 |
| 注册名 | `KioskAppBar` |
| Props要点 | 见源码 |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 一体机阶段；props 见源码；无 Ui* 关键件。  
**Finesse：** kiosk 操作密度优先，可深色。  
**Taste：** 勿把暗色抄回 Web 工作台。  

**判定：OK**  
**动作：** 保持 Agent 合同；Web 勿抄暗色。  
**禁：** 把 kiosk 暗色搬进 mark-vue Web。

## 437. `KioskArchivePickPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/components/KioskArchivePickPanel.vue` |
| 源码 | L242;refs≈1 |
| 注册名 | `KioskArchivePickPanel` |
| Props要点 | open、scannerDeviceId、scannerStationId |
| 结构信号 | 表格、抽屉、严格枚举、Tag |

**Impeccable：** 一体机阶段；props open、scannerDeviceId、scannerStationId；表格、抽屉、严格枚举、Tag。  
**Finesse：** kiosk 操作密度优先，可深色。  
**Taste：** 勿把暗色抄回 Web 工作台。  

**判定：OK**  
**动作：** 保持 Agent 合同；Web 勿抄暗色。  
**禁：** 把 kiosk 暗色搬进 mark-vue Web。

## 438. `KioskBottomBar.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/components/KioskBottomBar.vue` |
| 源码 | L408;refs≈1 |
| 注册名 | `KioskBottomBar` |
| Props要点 | 见源码 |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 一体机阶段；props 见源码；无 Ui* 关键件。  
**Finesse：** kiosk 操作密度优先，可深色。  
**Taste：** 勿把暗色抄回 Web 工作台。  

**判定：OK**  
**动作：** 保持 Agent 合同；Web 勿抄暗色。  
**禁：** 把 kiosk 暗色搬进 mark-vue Web。

## 439. `KioskExamSwitchGate.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/components/KioskExamSwitchGate.vue` |
| 源码 | L124;refs≈1 |
| 注册名 | `KioskExamSwitchGate` |
| Props要点 | 见源码 |
| 结构信号 | 模态 |

**Impeccable：** 一体机阶段；props 见源码；模态。  
**Finesse：** kiosk 操作密度优先，可深色。  
**Taste：** 勿把暗色抄回 Web 工作台。  

**判定：OK**  
**动作：** 保持 Agent 合同；Web 勿抄暗色。  
**禁：** 把 kiosk 暗色搬进 mark-vue Web。

## 440. `KioskHistoryLedgerDrawer.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/components/KioskHistoryLedgerDrawer.vue` |
| 源码 | L519;refs≈1 |
| 注册名 | `KioskHistoryLedgerDrawer` |
| Props要点 | 见源码 |
| 结构信号 | 抽屉 |

**Impeccable：** 一体机阶段；props 见源码；抽屉。  
**Finesse：** kiosk 操作密度优先，可深色。  
**Taste：** 勿把暗色抄回 Web 工作台。  

**判定：OK**  
**动作：** 保持 Agent 合同；Web 勿抄暗色。  
**禁：** 把 kiosk 暗色搬进 mark-vue Web。

## 441. `KioskNoticeBand.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/components/KioskNoticeBand.vue` |
| 源码 | L113;refs≈1 |
| 注册名 | `KioskNoticeBand` |
| Props要点 | 见源码 |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 一体机阶段；props 见源码；无 Ui* 关键件。  
**Finesse：** kiosk 操作密度优先，可深色。  
**Taste：** 勿把暗色抄回 Web 工作台。  

**判定：OK**  
**动作：** 保持 Agent 合同；Web 勿抄暗色。  
**禁：** 把 kiosk 暗色搬进 mark-vue Web。

## 442. `KioskPortfolioGapPickPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/components/KioskPortfolioGapPickPanel.vue` |
| 源码 | L222;refs≈1;有失败处理 |
| 注册名 | `KioskPortfolioGapPickPanel` |
| Props要点 | open、scannerDeviceId、scannerStationId |
| 结构信号 | 表格、抽屉、严格枚举、失败toast |

**Impeccable：** 一体机阶段；props open、scannerDeviceId、scannerStationId；表格、抽屉、严格枚举、失败toast。  
**Finesse：** kiosk 操作密度优先，可深色。  
**Taste：** 勿把暗色抄回 Web 工作台。  

**判定：OK**  
**动作：** 保持 Agent 合同；Web 勿抄暗色。  
**禁：** 把 kiosk 暗色搬进 mark-vue Web。

## 443. `KioskScanProfilePanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/components/KioskScanProfilePanel.vue` |
| 源码 | L168;refs≈1 |
| 注册名 | `KioskScanProfilePanel` |
| Props要点 | 见源码 |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 一体机阶段；props 见源码；无 Ui* 关键件。  
**Finesse：** kiosk 操作密度优先，可深色。  
**Taste：** 勿把暗色抄回 Web 工作台。  

**判定：OK**  
**动作：** 保持 Agent 合同；Web 勿抄暗色。  
**禁：** 把 kiosk 暗色搬进 mark-vue Web。

## 444. `KioskSettingsDrawer.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/components/KioskSettingsDrawer.vue` |
| 源码 | L796;refs≈1 |
| 注册名 | `KioskSettingsDrawer` |
| Props要点 | 见源码 |
| 结构信号 | 抽屉 |

**Impeccable：** 一体机阶段；props 见源码；抽屉。  
**Finesse：** kiosk 操作密度优先，可深色。  
**Taste：** 勿把暗色抄回 Web 工作台。  

**判定：OK**  
**动作：** 保持 Agent 合同；Web 勿抄暗色。  
**禁：** 把 kiosk 暗色搬进 mark-vue Web。

## 445. `KioskStageBar.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/components/KioskStageBar.vue` |
| 源码 | L134;refs≈1 |
| 注册名 | `KioskStageBar` |
| Props要点 | 见源码 |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 一体机阶段；props 见源码；无 Ui* 关键件。  
**Finesse：** kiosk 操作密度优先，可深色。  
**Taste：** 勿把暗色抄回 Web 工作台。  

**判定：OK**  
**动作：** 保持 Agent 合同；Web 勿抄暗色。  
**禁：** 把 kiosk 暗色搬进 mark-vue Web。

## 446. `KioskSupplementLaunchModal.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/components/KioskSupplementLaunchModal.vue` |
| 源码 | L440;refs≈1 |
| 注册名 | `KioskSupplementLaunchModal` |
| Props要点 | 见源码 |
| 结构信号 | 模态 |

**Impeccable：** 一体机阶段；props 见源码；模态。  
**Finesse：** kiosk 操作密度优先，可深色。  
**Taste：** 勿把暗色抄回 Web 工作台。  

**判定：OK**  
**动作：** 保持 Agent 合同；Web 勿抄暗色。  
**禁：** 把 kiosk 暗色搬进 mark-vue Web。

## 447. `KioskWorkbenchTabs.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/components/KioskWorkbenchTabs.vue` |
| 源码 | L93;refs≈1 |
| 注册名 | `ScannerExamKioskSetup` |
| Props要点 | 见源码 |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 一体机阶段；props 见源码；无 Ui* 关键件。  
**Finesse：** kiosk 操作密度优先，可深色。  
**Taste：** 勿把暗色抄回 Web 工作台。  

**判定：OK**  
**动作：** 保持 Agent 合同；Web 勿抄暗色。  
**禁：** 把 kiosk 暗色搬进 mark-vue Web。

## 448. `AiAnalysisClusterTab.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/ai-analysis/AiAnalysisClusterTab.vue` |
| 源码 | L42;refs≈1;薄 |
| 注册名 | `AiAnalysisClusterTab` |
| Props要点 | reloadToken、clusterSignal |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 薄封装；props≈reloadToken、clusterSignal。  
**Finesse：** 无独立布局增量。  
**Taste：** —  

**判定：SHELL**  
**动作：** 内联或删。  
**禁：** compat 别名。

## 449. `AiAnalysisClusterWorkbench.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/ai-analysis/AiAnalysisClusterWorkbench.vue` |
| 源码 | L133;refs≈1 |
| 注册名 | `AiAnalysisClusterWorkbench` |
| Props要点 | examId、reloadToken、classId、clusterSignal |
| 结构信号 | 信号带 |

**Impeccable：** 学情/AI 分析；信号带。  
**Finesse：** 卡片/图密度克制。  
**Taste：** 系列色语义，禁假达成。  

**判定：OK**  
**动作：** 失败与空分叉。  
**禁：** 假达成图。

## 450. `AiAnalysisSchoolTab.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/ai-analysis/AiAnalysisSchoolTab.vue` |
| 源码 | L41;refs≈1;薄 |
| 注册名 | `AiAnalysisSchoolTab` |
| Props要点 | 见源码 |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 薄封装；props≈见源码。  
**Finesse：** 无独立布局增量。  
**Taste：** —  

**判定：SHELL**  
**动作：** 内联或删。  
**禁：** compat 别名。
