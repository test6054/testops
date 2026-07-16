# 组件手审账 · Batch 19（重写 · 逐文件三 Skill）

> 逐文件 Read 信号 + 引用核对 · Impeccable product · Finesse D8 · Taste 3/2/8 · frontend-design-mark  
> 替换原机械套话版 · 2026-07-16

## 291. `AiAnalysisCardShell.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/analysis/AiAnalysisCardShell.vue` |
| 源码 | L54;refs≈7 |
| 注册名 | `AiAnalysisCardShell` |
| Props要点 | embedded、title、context、headless、cardClass |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 学情/AI 分析；无 Ui* 关键件。  
**Finesse：** 卡片/图密度克制。  
**Taste：** 系列色语义，禁假达成。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 292. `AiAnalysisSection.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/analysis/AiAnalysisSection.vue` |
| 源码 | L34;refs≈7;薄 |
| 注册名 | `AiAnalysisSection` |
| Props要点 | title、context、headless |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 学情/AI 分析；无 Ui* 关键件。  
**Finesse：** 卡片/图密度克制。  
**Taste：** 系列色语义，禁假达成。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 293. `ArchiveDutyUserSelect.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/ArchiveDutyUserSelect.vue` |
| 源码 | L159;refs≈7;有失败处理 |
| 注册名 | `ArchiveDutyUserSelect` |
| Props要点 | 见源码 |
| 结构信号 | 失败toast |

**Impeccable：** 归档卷子链；失败toast；props 见源码。  
**Finesse：** L159 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 294. `MarkExamSelect.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/MarkExamSelect.vue` |
| 源码 | L68;refs≈7 |
| 注册名 | `MarkExamSelect` |
| Props要点 | selectedExamId、examOptions、loading、searching、resolvingPinned |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 无 Ui* 关键件；props selectedExamId、examOptions、loading、searching、resolvingPinned。  
**Finesse：** L68；slots=['MarkExamSelect', 'option']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 295. `AiAnalysisHistorySelect.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/analysis/AiAnalysisHistorySelect.vue` |
| 源码 | L43;refs≈5;薄 |
| 注册名 | `AiAnalysisHistorySelect` |
| Props要点 | rows、loading |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 薄封装；props≈rows、loading。  
**Finesse：** 无独立布局增量。  
**Taste：** —  

**判定：SHELL**  
**动作：** 内联或删。  
**禁：** compat 别名。

## 296. `ArchiveMaterialTagSelect.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/ArchiveMaterialTagSelect.vue` |
| 源码 | L80;refs≈5;有失败处理 |
| 注册名 | `ArchiveMaterialTagSelect` |
| Props要点 | placeholder、maxTagCount、allowCreate、suggestLimit、searchScopeOnly |
| 结构信号 | 失败toast |

**Impeccable：** 归档卷子链；失败toast；props placeholder、maxTagCount、allowCreate、suggestLimit、searchScopeOnly。  
**Finesse：** L80 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 材料登记用归档专用 modal。  
**禁：** 名册 Excel 模态冒充归档。

## 297. `AiAnalysisCardBody.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/analysis/AiAnalysisCardBody.vue` |
| 源码 | L38;refs≈4;有Empty;薄 |
| 注册名 | `AiAnalysisCardBody` |
| Props要点 | loading、generating、hasContent、emptyDescription、progressTitle |
| 结构信号 | 空态 |

**Impeccable：** 薄封装；props≈loading、generating、hasContent、emptyDescription、progressTitle。  
**Finesse：** 无独立布局增量。  
**Taste：** —  

**判定：SHELL**  
**动作：** 内联或删。  
**禁：** compat 别名。

## 298. `ExperienceAssistBadge.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/ExperienceAssistBadge.vue` |
| 源码 | L54;refs≈4 |
| 注册名 | `ExperienceAssistBadge` |
| Props要点 | applied、sourceExamName、consistencyRate、clickable |
| 结构信号 | Tag |

**Impeccable：** Tag；props applied、sourceExamName、consistencyRate、clickable。  
**Finesse：** L54；slots=['ExperienceAssistBadge']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 299. `DocumentKioskActivationGate.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/components/DocumentKioskActivationGate.vue` |
| 源码 | L54;refs≈4 |
| 注册名 | `DocumentKioskActivationGate` |
| Props要点 | submitLoading、canActivate |
| 结构信号 | 模态 |

**Impeccable：** 一体机阶段；props submitLoading、canActivate；模态。  
**Finesse：** kiosk 操作密度优先，可深色。  
**Taste：** 勿把暗色抄回 Web 工作台。  

**判定：OK**  
**动作：** 保持 Agent 合同；Web 勿抄暗色。  
**禁：** 把 kiosk 暗色搬进 mark-vue Web。

## 300. `GiCellAvatar.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/GiCell/GiCellAvatar.vue` |
| 源码 | L362;refs≈3 |
| 注册名 | `GiCellAvatar` |
| Props要点 | 见源码 |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 无 Ui* 关键件；props 见源码。  
**Finesse：** L362；slots=['GiCellAvatar']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 301. `AnalysisExamMultiSelect.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/AnalysisExamMultiSelect.vue` |
| 源码 | L332;refs≈3;有失败处理 |
| 注册名 | `AnalysisExamMultiSelect` |
| Props要点 | placeholder、defaultRecentSemesterCount、scopeCourseId、scopeClassId、scopeReferenceDepartmentId |
| 结构信号 | 失败toast |

**Impeccable：** 失败toast；props placeholder、defaultRecentSemesterCount、scopeCourseId、scopeClassId、scopeReferenceDepartmentId。  
**Finesse：** L332；slots=['AnalysisExamMultiSelect']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 302. `ConfidentialWatermarkLayer.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/ConfidentialWatermarkLayer.vue` |
| 源码 | L70;refs≈3 |
| 注册名 | `ConfidentialWatermarkLayer` |
| Props要点 | lines、density |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 无 Ui* 关键件；props lines、density。  
**Finesse：** L70；slots=['ConfidentialWatermarkLayer']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 303. `GradingImmersionSection.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/GradingImmersionSection.vue` |
| 源码 | L83;refs≈3 |
| 注册名 | `GradingImmersionSection` |
| Props要点 | title |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 无 Ui* 关键件；props title。  
**Finesse：** L83；slots=['GradingImmersionSection', 'actions', 'tags']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 304. `MarkingScanMaterialPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/MarkingScanMaterialPanel.vue` |
| 源码 | L266;refs≈3;有Empty;有失败处理 |
| 注册名 | `MarkingScanMaterialPanel` |
| Props要点 | sliceFileId、sourceScanPage、layoutPaperPage、confidential、examLabel |
| 结构信号 | 空态、看片、严格枚举、失败toast |

**Impeccable：** 空态、看片、严格枚举、失败toast；props sliceFileId、sourceScanPage、layoutPaperPage、confidential、examLabel。  
**Finesse：** L266；slots=['MarkingScanMaterialPanel']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 305. `ErrorPage.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/error/components/ErrorPage.vue` |
| 源码 | L182;refs≈3 |
| 注册名 | `ErrorPage` |
| Props要点 | 见源码 |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 页内组件；无 Ui* 关键件；props 见源码。  
**Finesse：** L182 随父页工作台。  
**Taste：** 禁重复身份条/装饰 KPI。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 306. `KioskBoundStudentsPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/components/KioskBoundStudentsPanel.vue` |
| 源码 | L220;refs≈3 |
| 注册名 | `KioskBoundStudentsPanel` |
| Props要点 | variant、scanBatchId |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 一体机阶段；props variant、scanBatchId；无 Ui* 关键件。  
**Finesse：** kiosk 操作密度优先，可深色。  
**Taste：** 勿把暗色抄回 Web 工作台。  

**判定：OK**  
**动作：** 保持 Agent 合同；Web 勿抄暗色。  
**禁：** 把 kiosk 暗色搬进 mark-vue Web。

## 307. `KioskDeviceActivationPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/components/KioskDeviceActivationPanel.vue` |
| 源码 | L217;refs≈3 |
| 注册名 | `KioskDeviceActivationPanel` |
| Props要点 | compact、canActivate、submitLoading、showManualCancel |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 一体机阶段；props compact、canActivate、submitLoading、showManualCancel；无 Ui* 关键件。  
**Finesse：** kiosk 操作密度优先，可深色。  
**Taste：** 勿把暗色抄回 Web 工作台。  

**判定：OK**  
**动作：** 保持 Agent 合同；Web 勿抄暗色。  
**禁：** 把 kiosk 暗色搬进 mark-vue Web。

## 308. `ExamQuestionCourseGoalMappingCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/ai-analysis/cards/ExamQuestionCourseGoalMappingCard.vue` |
| 源码 | L259;refs≈3;有失败处理 |
| 注册名 | `ExamQuestionCourseGoalMappingCard` |
| Props要点 | examId、reloadToken、examLabel、embedded |
| 结构信号 | 失败toast、确认框 |

**Impeccable：** 学情/AI 分析；失败toast、确认框。  
**Finesse：** 卡片/图密度克制。  
**Taste：** 系列色语义，禁假达成。  

**判定：OK**  
**动作：** 失败与空分叉。  
**禁：** 假达成图。

## 309. `PaperQualityCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/ai-analysis/cards/PaperQualityCard.vue` |
| 源码 | L115;refs≈3 |
| 注册名 | `PaperQualityCard` |
| Props要点 | examId、reloadToken、classId、examLabel、embedded |
| 结构信号 | 信号带 |

**Impeccable：** 学情/AI 分析；信号带。  
**Finesse：** 卡片/图密度克制。  
**Taste：** 系列色语义，禁假达成。  

**判定：OK**  
**动作：** 失败与空分叉。  
**禁：** 假达成图。

## 310. `QuestionAnalysisCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/ai-analysis/cards/QuestionAnalysisCard.vue` |
| 源码 | L858;refs≈3;有Empty;有失败处理 |
| 注册名 | `QuestionAnalysisCard` |
| Props要点 | examId、reloadToken、classId、examLabel、embedded |
| 结构信号 | 表格、提示条、严格枚举、失败toast |

**Impeccable：** 学情/AI 分析；表格、提示条、严格枚举、失败toast。  
**Finesse：** 卡片/图密度克制。  
**Taste：** 系列色语义，禁假达成。  

**判定：OK**  
**动作：** 失败与空分叉。  
**禁：** 假达成图。

## 311. `ArchiveEvaluationExportTaskModal.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/ArchiveEvaluationExportTaskModal.vue` |
| 源码 | L106;refs≈3 |
| 注册名 | `ArchiveEvaluationExportTaskModal` |
| Props要点 | 见源码 |
| 结构信号 | 严格枚举 |

**Impeccable：** 归档卷子链；严格枚举；props 见源码。  
**Finesse：** L106 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 保持 destroy-on-close 防脏状态。  
**禁：** 暗色监控抽屉。

## 312. `ArchiveVolumeMaterialOcrDetailModal.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/ArchiveVolumeMaterialOcrDetailModal.vue` |
| 源码 | L26;refs≈3;薄 |
| 注册名 | `ArchiveVolumeMaterialOcrDetailModal` |
| Props要点 | materialId、initialPageNo |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 薄封装；props≈materialId、initialPageNo。  
**Finesse：** 无独立布局增量。  
**Taste：** —  

**判定：SHELL**  
**动作：** 内联或删。  
**禁：** compat 别名。

## 313. `ScanDispatchResultDialog.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/ScanDispatchResultDialog.vue` |
| 源码 | L309;refs≈3;hex=#262626,#8c8c8c;有失败处理 |
| 注册名 | `ScanDispatchResultDialog` |
| Props要点 | open、payload、volumeId、taskKind |
| 结构信号 | 严格枚举、失败toast、Tag |

**Impeccable：** 归档卷子链；严格枚举、失败toast、Tag；props open、payload、volumeId、taskKind。  
**Finesse：** L309 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 保持 destroy-on-close 防脏状态。  
**禁：** 暗色监控抽屉。

## 314. `ClassStudentTreeSelectorDrawer.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/edu/ClassStudentTreeSelectorDrawer.vue` |
| 源码 | L693;refs≈2;有Empty;有失败处理 |
| 注册名 | `ClassStudentTreeSelectorDrawer` |
| Props要点 | 见源码 |
| 结构信号 | 空态、抽屉、失败toast、Tag |

**Impeccable：** 选型合同 props：见源码。  
**Finesse：** 下拉密度；slots=['ClassStudentTreeSelectorDrawer', 'footer', 'title']。  
**Taste：** 域内 placeholder，无营销卡。  

**判定：OK**  
**动作：** 删死 scoped 灰阶类；debounce 常量。  
**禁：** 页内第二套选择器。

## 315. `EvaluationWorkgroupPage.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/evaluation/EvaluationWorkgroupPage.vue` |
| 源码 | L865;refs≈2;有Empty;有失败处理 |
| 注册名 | `EvaluationWorkgroupPage` |
| Props要点 | domainShell |
| 结构信号 | 表格、空态、信号带、工作台壳 |

**Impeccable：** 表格、空态、信号带、工作台壳；props domainShell；/api/quality/evaluation-workgroups。  
**Finesse：** L865；slots=['actions', 'bodyCell', 'context', 'extra', 'field-programId', 'status']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 316. `AiAnalysisExamScopePanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/analysis/AiAnalysisExamScopePanel.vue` |
| 源码 | L13;refs≈2;薄 |
| 注册名 | `AiAnalysisExamScopePanel` |
| Props要点 | 见源码 |
| 结构信号 | 筛选条 |

**Impeccable：** 薄封装；props≈见源码。  
**Finesse：** 无独立布局增量。  
**Taste：** —  

**判定：SHELL**  
**动作：** 内联或删。  
**禁：** compat 别名。

## 317. `AiAnalysisOrgTermScopePanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/analysis/AiAnalysisOrgTermScopePanel.vue` |
| 源码 | L10;refs≈2;薄 |
| 注册名 | `AiAnalysisOrgTermScopePanel` |
| Props要点 | 见源码 |
| 结构信号 | 筛选条 |

**Impeccable：** 薄封装；props≈见源码。  
**Finesse：** 无独立布局增量。  
**Taste：** —  

**判定：SHELL**  
**动作：** 内联或删。  
**禁：** compat 别名。

## 318. `AiAnalysisScopeFilterBar.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/analysis/AiAnalysisScopeFilterBar.vue` |
| 源码 | L318;refs≈2 |
| 注册名 | `AiAnalysisScopeFilterBar` |
| Props要点 | mode |
| 结构信号 | 筛选条 |

**Impeccable：** 学情/AI 分析；筛选条。  
**Finesse：** 卡片/图密度克制。  
**Taste：** 系列色语义，禁假达成。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 319. `ExamQuestionIdentityCells.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/analysis/ExamQuestionIdentityCells.vue` |
| 源码 | L45;refs≈2;薄 |
| 注册名 | `ExamQuestionIdentityCells` |
| Props要点 | columnKey、record |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 无 Ui* 关键件；props columnKey、record。  
**Finesse：** L45；slots=['ExamQuestionIdentityCells']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 320. `PendingTodoFeed.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/dashboard/PendingTodoFeed.vue` |
| 源码 | L244;refs≈2;有Empty |
| 注册名 | `PendingTodoFeed` |
| Props要点 | todos、titleSource、emptyDescription、emptyActionLabel |
| 结构信号 | 空态、严格枚举、Tag |

**Impeccable：** 空态、严格枚举、Tag；props todos、titleSource、emptyDescription、emptyActionLabel。  
**Finesse：** L244；slots=['PendingTodoFeed', 'action']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 321. `LayoutCanvas.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/layout-designer/LayoutCanvas.vue` |
| 源码 | L625;refs≈2;有Empty |
| 注册名 | `LayoutCanvas` |
| Props要点 | document、pageNo、focusedBlockId、focusedQuestionId、readOnly |
| 结构信号 | 空态 |

**Impeccable：** 制卷；空态；props document、pageNo、focusedBlockId、focusedQuestionId、readOnly。  
**Finesse：** 画布+侧栏属性密度。  
**Taste：** 浅色 ROI，拒监控暗色。  

**判定：OK**  
**动作：** 保持浅色 ROI。  
**禁：** Web 暗色制卷。

## 322. `LayoutQuestionPropertyPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/layout-designer/LayoutQuestionPropertyPanel.vue` |
| 源码 | L380;refs≈2 |
| 注册名 | `LayoutQuestionPropertyPanel` |
| Props要点 | document、question |
| 结构信号 | 严格枚举 |

**Impeccable：** 制卷；严格枚举；props document、question。  
**Finesse：** 画布+侧栏属性密度。  
**Taste：** 浅色 ROI，拒监控暗色。  

**判定：OK**  
**动作：** 保持浅色 ROI。  
**禁：** Web 暗色制卷。

## 323. `ManualSupplementFormCore.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/manual-supplement/ManualSupplementFormCore.vue` |
| 源码 | L228;refs≈2 |
| 注册名 | `ManualSupplementFormCore` |
| Props要点 | mode、model、deviceOptions、deviceLoading、boundPaperOptions |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 无 Ui* 关键件；props mode、model、deviceOptions、deviceLoading、boundPaperOptions。  
**Finesse：** L228；slots=['ManualSupplementFormCore']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 324. `ScorePublishRelatedLinksCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/workbench/ScorePublishRelatedLinksCard.vue` |
| 源码 | L74;refs≈2 |
| 注册名 | `ScorePublishRelatedLinksCard` |
| Props要点 | variant |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 无 Ui* 关键件；props variant。  
**Finesse：** L74；slots=['ScorePublishRelatedLinksCard', 'head']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 325. `WorkflowPrerequisiteEmpty.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/workbench/workflow-readiness/WorkflowPrerequisiteEmpty.vue` |
| 源码 | L92;refs≈2;有Empty |
| 注册名 | `WorkflowPrerequisiteEmpty` |
| Props要点 | model |
| 结构信号 | 空态 |

**Impeccable：** 空态；props model。  
**Finesse：** L92；slots=['WorkflowPrerequisiteEmpty', 'action']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 326. `SessionGroupCreateSummary.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/admin/marking-organization/components/SessionGroupCreateSummary.vue` |
| 源码 | L146;refs≈2 |
| 注册名 | `SessionGroupCreateSummary` |
| Props要点 | phase、policy、groupReadiness、sessionReadiness |
| 结构信号 | 严格枚举 |

**Impeccable：** 页内组件；严格枚举；props phase、policy、groupReadiness、sessionReadiness。  
**Finesse：** L146 随父页工作台。  
**Taste：** 禁重复身份条/装饰 KPI。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 327. `SessionLifecycleReasonModal.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/admin/marking-organization/components/SessionLifecycleReasonModal.vue` |
| 源码 | L154;refs≈2;有失败处理 |
| 注册名 | `SessionLifecycleReasonModal` |
| Props要点 | open、action、sessionId、canManage |
| 结构信号 | 提示条、失败toast |

**Impeccable：** 页内组件；提示条、失败toast；props open、action、sessionId、canManage。  
**Finesse：** L154 随父页工作台。  
**Taste：** 禁重复身份条/装饰 KPI。  

**判定：OK**  
**动作：** 保持 destroy-on-close 防脏状态。  
**禁：** 暗色监控抽屉。

## 328. `index.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/login/components/cas/index.vue` |
| 源码 | L623;refs≈27;有失败处理 |
| 注册名 | `CasLogin` |
| Props要点 | subdomainMode、subdomainTenant、tenantId |
| 结构信号 | 失败toast |

**Impeccable：** 页内组件；失败toast；props subdomainMode、subdomainTenant、tenantId。  
**Finesse：** L623 随父页工作台。  
**Taste：** 禁重复身份条/装饰 KPI。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 329. `PortfolioCockpitAskPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/portfolio/components/PortfolioCockpitAskPanel.vue` |
| 源码 | L463;refs≈2;有失败处理 |
| 注册名 | `PortfolioCockpitAskPanel` |
| Props要点 | departmentId、schoolScopeOnly、initialTaskId |
| 结构信号 | 表格、失败toast |

**Impeccable：** 页内组件；表格、失败toast；props departmentId、schoolScopeOnly、initialTaskId。  
**Finesse：** L463 随父页工作台。  
**Taste：** 禁重复身份条/装饰 KPI。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 330. `KioskExamPickPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/components/KioskExamPickPanel.vue` |
| 源码 | L573;refs≈2 |
| 注册名 | `KioskExamPickPanel` |
| Props要点 | selectedExamId、excludeExamId、interactionLocked、instantBind |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 一体机阶段；props selectedExamId、excludeExamId、interactionLocked、instantBind；无 Ui* 关键件。  
**Finesse：** kiosk 操作密度优先，可深色。  
**Taste：** 勿把暗色抄回 Web 工作台。  

**判定：OK**  
**动作：** 保持 Agent 合同；Web 勿抄暗色。  
**禁：** 把 kiosk 暗色搬进 mark-vue Web。
