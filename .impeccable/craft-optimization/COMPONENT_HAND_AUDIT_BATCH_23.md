# 组件手审账 · Batch 23（重写 · 逐文件三 Skill）

> 逐文件 Read 信号 + 引用核对 · Impeccable product · Finesse D8 · Taste 3/2/8 · frontend-design-mark  
> 替换原机械套话版 · 2026-07-16

## 451. `AiAnalysisTeachingTab.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/ai-analysis/AiAnalysisTeachingTab.vue` |
| 源码 | L104;refs≈1 |
| 注册名 | `AiAnalysisTeachingTab` |
| Props要点 | reloadToken |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 学情/AI 分析；无 Ui* 关键件。  
**Finesse：** 卡片/图密度克制。  
**Taste：** 系列色语义，禁假达成。  

**判定：OK**  
**动作：** 失败与空分叉。  
**禁：** 假达成图。

## 452. `AiAnalysisTrendTab.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/ai-analysis/AiAnalysisTrendTab.vue` |
| 源码 | L68;refs≈1 |
| 注册名 | `AiAnalysisTrendTab` |
| Props要点 | 见源码 |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 学情/AI 分析；无 Ui* 关键件。  
**Finesse：** 卡片/图密度克制。  
**Taste：** 系列色语义，禁假达成。  

**判定：OK**  
**动作：** 失败与空分叉。  
**禁：** 假达成图。

## 453. `CourseAchievementCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/ai-analysis/cards/CourseAchievementCard.vue` |
| 源码 | L469;refs≈1;有Empty;有失败处理 |
| 注册名 | `CourseAchievementCard` |
| Props要点 | scopeReferenceDepartmentId、scopeOrgCourseId、scopeOrgClassId、scopeAcademicYear、scopeSemester |
| 结构信号 | 信号带、严格枚举、失败toast |

**Impeccable：** 学情/AI 分析；信号带、严格枚举、失败toast。  
**Finesse：** 卡片/图密度克制。  
**Taste：** 系列色语义，禁假达成。  

**判定：OK**  
**动作：** 失败与空分叉。  
**禁：** 假达成图。

## 454. `CrossExamTrendCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/ai-analysis/cards/CrossExamTrendCard.vue` |
| 源码 | L591;refs≈1;有Empty |
| 注册名 | `CrossExamTrendCard` |
| Props要点 | drillClassId、drillClassLabel、scopeReferenceDepartmentId、scopeOrgCourseId、scopeOrgClassId |
| 结构信号 | 严格枚举、筛选条、Tag |

**Impeccable：** 学情/AI 分析；严格枚举、筛选条、Tag。  
**Finesse：** 卡片/图密度克制。  
**Taste：** 系列色语义，禁假达成。  

**判定：OK**  
**动作：** 失败与空分叉。  
**禁：** 假达成图。

## 455. `ExamQuestionCourseGoalMappingTable.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/ai-analysis/cards/ExamQuestionCourseGoalMappingTable.vue` |
| 源码 | L310;refs≈1 |
| 注册名 | `ExamQuestionCourseGoalMappingTable` |
| Props要点 | loading、courseGoalConfigured、readiness、courseGoals、rows |
| 结构信号 | 表格、信号带、严格枚举、筛选条 |

**Impeccable：** 学情/AI 分析；表格、信号带、严格枚举、筛选条。  
**Finesse：** 卡片/图密度克制。  
**Taste：** 系列色语义，禁假达成。  

**判定：OK**  
**动作：** 失败与空分叉。  
**禁：** 假达成图。

## 456. `ExperienceEffectivenessCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/ai-analysis/cards/ExperienceEffectivenessCard.vue` |
| 源码 | L676;refs≈1;有Empty;有失败处理 |
| 注册名 | `ExperienceEffectivenessCard` |
| Props要点 | scopeReferenceDepartmentId、scopeOrgCourseId、scopeOrgClassId |
| 结构信号 | 表格、信号带、严格枚举、失败toast |

**Impeccable：** 学情/AI 分析；表格、信号带、严格枚举、失败toast。  
**Finesse：** 卡片/图密度克制。  
**Taste：** 系列色语义，禁假达成。  

**判定：OK**  
**动作：** 失败与空分叉。  
**禁：** 假达成图。

## 457. `QuestionAnswerCorrectionDialog.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/ai-analysis/cards/QuestionAnswerCorrectionDialog.vue` |
| 源码 | L443;refs≈1;有失败处理 |
| 注册名 | `QuestionAnswerCorrectionDialog` |
| Props要点 | open、examId、question |
| 结构信号 | 提示条、模态、严格枚举、失败toast |

**Impeccable：** 学情/AI 分析；提示条、模态、严格枚举、失败toast。  
**Finesse：** 卡片/图密度克制。  
**Taste：** 系列色语义，禁假达成。  

**判定：OK**  
**动作：** 保持 destroy-on-close 防脏状态。  
**禁：** 暗色监控抽屉。

## 458. `SchoolQualityCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/ai-analysis/cards/SchoolQualityCard.vue` |
| 源码 | L548;refs≈1;有Empty;有失败处理 |
| 注册名 | `SchoolQualityCard` |
| Props要点 | scopeReferenceDepartmentId、scopeOrgCourseId、scopeOrgClassId、scopeAcademicYear、scopeSemester |
| 结构信号 | 信号带、严格枚举、失败toast、筛选条 |

**Impeccable：** 学情/AI 分析；信号带、严格枚举、失败toast、筛选条。  
**Finesse：** 卡片/图密度克制。  
**Taste：** 系列色语义，禁假达成。  

**判定：OK**  
**动作：** 失败与空分叉。  
**禁：** 假达成图。

## 459. `ScoreDistributionCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/ai-analysis/cards/ScoreDistributionCard.vue` |
| 源码 | L220;refs≈1;有Empty |
| 注册名 | `ScoreDistributionCard` |
| Props要点 | examId、reloadToken、classId、classOptions、rosterLoading |
| 结构信号 | 信号带 |

**Impeccable：** 学情/AI 分析；信号带。  
**Finesse：** 卡片/图密度克制。  
**Taste：** 系列色语义，禁假达成。  

**判定：OK**  
**动作：** 失败与空分叉。  
**禁：** 假达成图。

## 460. `SemesterGrowthCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/ai-analysis/cards/SemesterGrowthCard.vue` |
| 源码 | L703;refs≈1;有Empty;有失败处理 |
| 注册名 | `SemesterGrowthCard` |
| Props要点 | drillClassId、drillClassLabel、scopeReferenceDepartmentId、scopeOrgCourseId、scopeOrgClassId |
| 结构信号 | 严格枚举、失败toast、筛选条、Tag |

**Impeccable：** 学情/AI 分析；严格枚举、失败toast、筛选条、Tag。  
**Finesse：** 卡片/图密度克制。  
**Taste：** 系列色语义，禁假达成。  

**判定：OK**  
**动作：** 失败与空分叉。  
**禁：** 假达成图。

## 461. `BatchCorrectionPlansCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/appeal-handle/BatchCorrectionPlansCard.vue` |
| 源码 | L1021;refs≈1;有失败处理 |
| 注册名 | `BatchCorrectionPlansCard` |
| Props要点 | examId、reloadToken、scorePolicy |
| 结构信号 | 表格、提示条、严格枚举、失败toast |

**Impeccable：** 页内组件；表格、提示条、严格枚举、失败toast；props examId、reloadToken、scorePolicy。  
**Finesse：** L1021 随父页工作台。  
**Taste：** 禁重复身份条/装饰 KPI。  

**判定：TUNE**  
**动作：** 拆职责时保持 API 合同。  
**禁：** 同页装饰 KPI 墙。

## 462. `CorrectionsCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/appeal-handle/CorrectionsCard.vue` |
| 源码 | L565;refs≈1;有失败处理 |
| 注册名 | `CorrectionsCard` |
| Props要点 | examId、reloadToken、scorePolicy |
| 结构信号 | 表格、提示条、失败toast、筛选条 |

**Impeccable：** 页内组件；表格、提示条、失败toast、筛选条；props examId、reloadToken、scorePolicy。  
**Finesse：** L565 随父页工作台。  
**Taste：** 禁重复身份条/装饰 KPI。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 463. `ReviewRequestsCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/appeal-handle/ReviewRequestsCard.vue` |
| 源码 | L491;refs≈1;有失败处理 |
| 注册名 | `ReviewRequestsCard` |
| Props要点 | examId |
| 结构信号 | 表格、提示条、严格枚举、失败toast |

**Impeccable：** 页内组件；表格、提示条、严格枚举、失败toast；props examId。  
**Finesse：** L491 随父页工作台。  
**Taste：** 禁重复身份条/装饰 KPI。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 464. `ReviewWindowPolicyCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/appeal-handle/ReviewWindowPolicyCard.vue` |
| 源码 | L286;refs≈1;有失败处理 |
| 注册名 | `ReviewWindowPolicyCard` |
| Props要点 | examId |
| 结构信号 | 严格枚举、失败toast、Tag |

**Impeccable：** 页内组件；严格枚举、失败toast、Tag；props examId。  
**Finesse：** L286 随父页工作台。  
**Taste：** 禁重复身份条/装饰 KPI。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 465. `TaskArchivePlanStep.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/archive-task-create/TaskArchivePlanStep.vue` |
| 源码 | L327;refs≈1 |
| 注册名 | `TaskArchivePlanStep` |
| Props要点 | planRules、templateSetOptions、value、label、examForm |
| 结构信号 | 严格枚举 |

**Impeccable：** 归档卷子链；严格枚举；props planRules、templateSetOptions、value、label、examForm。  
**Finesse：** L327 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 材料登记用归档专用 modal。  
**禁：** 名册 Excel 模态冒充归档。

## 466. `TaskBasicInfoStep.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/archive-task-create/TaskBasicInfoStep.vue` |
| 源码 | L350;refs≈1;有失败处理 |
| 注册名 | `TaskBasicInfoStep` |
| Props要点 | basicRules |
| 结构信号 | 失败toast |

**Impeccable：** 归档卷子链；失败toast；props basicRules。  
**Finesse：** L350 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 材料登记用归档专用 modal。  
**禁：** 名册 Excel 模态冒充归档。

## 467. `TaskConfirmStep.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/archive-task-create/TaskConfirmStep.vue` |
| 源码 | L156;refs≈1 |
| 注册名 | `TaskConfirmStep` |
| Props要点 | provenanceLabel |
| 结构信号 | 严格枚举 |

**Impeccable：** 归档卷子链；严格枚举；props provenanceLabel。  
**Finesse：** L156 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 材料登记用归档专用 modal。  
**禁：** 名册 Excel 模态冒充归档。

## 468. `TaskProvenanceStep.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/archive-task-create/TaskProvenanceStep.vue` |
| 源码 | L103;refs≈1 |
| 注册名 | `TaskProvenanceStep` |
| Props要点 | 见源码 |
| 结构信号 | Tag |

**Impeccable：** 归档卷子链；Tag；props 见源码。  
**Finesse：** L103 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 材料登记用归档专用 modal。  
**禁：** 名册 Excel 模态冒充归档。

## 469. `ArchiveCollectionRejectDialog.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/ArchiveCollectionRejectDialog.vue` |
| 源码 | L93;refs≈1;hex=#666;有失败处理 |
| 注册名 | `ArchiveCollectionRejectDialog` |
| Props要点 | open、volumeId |
| 结构信号 | 模态、失败toast |

**Impeccable：** 归档卷子链；模态、失败toast；props open、volumeId。  
**Finesse：** L93 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 保持 destroy-on-close 防脏状态。  
**禁：** 暗色监控抽屉。

## 470. `ArchiveSetupGuideBanner.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/ArchiveSetupGuideBanner.vue` |
| 源码 | L105;refs≈1;有失败处理 |
| 注册名 | `ArchiveSetupGuideBanner` |
| Props要点 | readiness、loading、loadFailed |
| 结构信号 | 提示条 |

**Impeccable：** 归档卷子链；提示条；props readiness、loading、loadFailed。  
**Finesse：** L105 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 材料登记用归档专用 modal。  
**禁：** 名册 Excel 模态冒充归档。

## 471. `ArchiveTemplateSetPreviewDrawer.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/ArchiveTemplateSetPreviewDrawer.vue` |
| 源码 | L418;refs≈1 |
| 注册名 | `ArchiveTemplateSetPreviewDrawer` |
| Props要点 | open、loading、preview、categoryGroupMap、forkSourceSetCode |
| 结构信号 | 表格、信号带、严格枚举、Tag |

**Impeccable：** 归档卷子链；表格、信号带、严格枚举、Tag；props open、loading、preview、categoryGroupMap、forkSourceSetCode。  
**Finesse：** L418 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 保持 destroy-on-close 防脏状态。  
**禁：** 暗色监控抽屉。

## 472. `ArchiveTemplateSortableTableShell.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/ArchiveTemplateSortableTableShell.vue` |
| 源码 | L76;refs≈1 |
| 注册名 | `ArchiveTemplateSortableTableShell` |
| Props要点 | columns、rowKey、emptyDescription、active |
| 结构信号 | 表格 |

**Impeccable：** 归档卷子链；表格；props columns、rowKey、emptyDescription、active。  
**Finesse：** L76 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 材料登记用归档专用 modal。  
**禁：** 名册 Excel 模态冒充归档。

## 473. `ArchiveVolumeMemberManageDrawer.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/ArchiveVolumeMemberManageDrawer.vue` |
| 源码 | L170;refs≈1;有失败处理 |
| 注册名 | `ArchiveVolumeMemberManageDrawer` |
| Props要点 | open、volumeId、collaborators |
| 结构信号 | 抽屉、失败toast、确认框 |

**Impeccable：** 归档卷子链；抽屉、失败toast、确认框；props open、volumeId、collaborators。  
**Finesse：** L170 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 保持 destroy-on-close 防脏状态。  
**禁：** 暗色监控抽屉。

## 474. `ArchiveVolumeMineRemediationBanner.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/ArchiveVolumeMineRemediationBanner.vue` |
| 源码 | L161;refs≈1 |
| 注册名 | `ArchiveVolumeMineRemediationBanner` |
| Props要点 | tasks、totalCount、loading |
| 结构信号 | 提示条、严格枚举、Tag |

**Impeccable：** 归档卷子链；提示条、严格枚举、Tag；props tasks、totalCount、loading。  
**Finesse：** L161 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 材料登记用归档专用 modal。  
**禁：** 名册 Excel 模态冒充归档。

## 475. `DepartmentReviewListDrawer.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/DepartmentReviewListDrawer.vue` |
| 源码 | L229;refs≈1;有失败处理 |
| 注册名 | `DepartmentReviewListDrawer` |
| Props要点 | open、volumeId |
| 结构信号 | 失败toast、Tag |

**Impeccable：** 归档卷子链；失败toast、Tag；props open、volumeId。  
**Finesse：** L229 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 保持 destroy-on-close 防脏状态。  
**禁：** 暗色监控抽屉。

## 476. `ArchiveFlowContextBar.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/ArchiveFlowContextBar.vue` |
| 源码 | L117;refs≈1 |
| 注册名 | `ArchiveFlowContextBar` |
| Props要点 | chainSteps、activeTab、title、subtitle、showPipeline |
| 结构信号 | 上下文栏 |

**Impeccable：** 归档卷子链；上下文栏；props chainSteps、activeTab、title、subtitle、showPipeline。  
**Finesse：** L117 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 材料登记用归档专用 modal。  
**禁：** 名册 Excel 模态冒充归档。

## 477. `ArchiveFourPropertyGrid.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/ArchiveFourPropertyGrid.vue` |
| 源码 | L29;refs≈1;薄 |
| 注册名 | `ArchiveFourPropertyGrid` |
| Props要点 | check |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 归档卷子链；无 Ui* 关键件；props check。  
**Finesse：** L29 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 材料登记用归档专用 modal。  
**禁：** 名册 Excel 模态冒充归档。

## 478. `ArchiveScanBatchReviewPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/ArchiveScanBatchReviewPanel.vue` |
| 源码 | L266;refs≈1 |
| 注册名 | `ArchiveScanBatchReviewPanel` |
| Props要点 | volumeId、canReview |
| 结构信号 | 表格、模态、严格枚举、Tag |

**Impeccable：** 归档卷子链；表格、模态、严格枚举、Tag；props volumeId、canReview。  
**Finesse：** L266 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 材料登记用归档专用 modal。  
**禁：** 名册 Excel 模态冒充归档。

## 479. `ArchiveScanBatchSnapshotPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/ArchiveScanBatchSnapshotPanel.vue` |
| 源码 | L213;refs≈1 |
| 注册名 | `ArchiveScanBatchSnapshotPanel` |
| Props要点 | volumeId |
| 结构信号 | 表格、严格枚举、Tag |

**Impeccable：** 归档卷子链；表格、严格枚举、Tag；props volumeId。  
**Finesse：** L213 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 材料登记用归档专用 modal。  
**禁：** 名册 Excel 模态冒充归档。

## 480. `ArchiveVolumeAccessPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/ArchiveVolumeAccessPanel.vue` |
| 源码 | L582;refs≈1;有Empty;有失败处理 |
| 注册名 | `ArchiveVolumeAccessPanel` |
| Props要点 | volumeId、canRequestAccess、canApproveAccessRecord、currentUserId、materials |
| 结构信号 | 空态、失败toast、Tag |

**Impeccable：** 归档卷子链；空态、失败toast、Tag；props volumeId、canRequestAccess、canApproveAccessRecord、currentUserId、materials。  
**Finesse：** L582 面板，须防按钮墙。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 材料登记用归档专用 modal。  
**禁：** 名册 Excel 模态冒充归档。

## 481. `ArchiveVolumeAppraisalPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/ArchiveVolumeAppraisalPanel.vue` |
| 源码 | L1077;refs≈1;有Empty;有失败处理 |
| 注册名 | `ArchiveVolumeAppraisalPanel` |
| Props要点 | volumeId、detail、canManageAppraisal、canApproveDestruction、currentUserId |
| 结构信号 | 空态、提示条、严格枚举、失败toast |

**Impeccable：** 归档卷子链；空态、提示条、严格枚举、失败toast；props volumeId、detail、canManageAppraisal、canApproveDestruction、currentUserId。  
**Finesse：** L1077 面板，须防按钮墙。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：TUNE**  
**动作：** 材料登记用归档专用 modal。  
**禁：** 名册 Excel 模态冒充归档。

## 482. `ArchiveVolumeCatalogEditor.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/ArchiveVolumeCatalogEditor.vue` |
| 源码 | L287;refs≈1;有Empty;有失败处理 |
| 注册名 | `ArchiveVolumeCatalogEditor` |
| Props要点 | volumeId、catalogStatus、readonly |
| 结构信号 | 表格、空态、提示条、严格枚举 |

**Impeccable：** 归档卷子链；表格、空态、提示条、严格枚举；props volumeId、catalogStatus、readonly。  
**Finesse：** L287 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 材料登记用归档专用 modal。  
**禁：** 名册 Excel 模态冒充归档。

## 483. `ArchiveVolumeCatalogPreview.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/ArchiveVolumeCatalogPreview.vue` |
| 源码 | L88;refs≈1;有Empty |
| 注册名 | `ArchiveVolumeCatalogPreview` |
| Props要点 | lines、catalogStatus |
| 结构信号 | 空态、严格枚举、Tag |

**Impeccable：** 归档卷子链；空态、严格枚举、Tag；props lines、catalogStatus。  
**Finesse：** L88 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 材料登记用归档专用 modal。  
**禁：** 名册 Excel 模态冒充归档。

## 484. `ArchiveVolumeEventsPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/ArchiveVolumeEventsPanel.vue` |
| 源码 | L88;refs≈1;有失败处理 |
| 注册名 | `ArchiveVolumeEventsPanel` |
| Props要点 | volumeId、events |
| 结构信号 | 失败toast |

**Impeccable：** 归档卷子链；失败toast；props volumeId、events。  
**Finesse：** L88 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 材料登记用归档专用 modal。  
**禁：** 名册 Excel 模态冒充归档。

## 485. `ArchiveVolumeEventsTimeline.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/ArchiveVolumeEventsTimeline.vue` |
| 源码 | L58;refs≈1;有Empty |
| 注册名 | `ArchiveVolumeEventsTimeline` |
| Props要点 | events |
| 结构信号 | 空态 |

**Impeccable：** 归档卷子链；空态；props events。  
**Finesse：** L58 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 材料登记用归档专用 modal。  
**禁：** 名册 Excel 模态冒充归档。

## 486. `ArchiveVolumeIntegrityPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/ArchiveVolumeIntegrityPanel.vue` |
| 源码 | L684;refs≈1;有失败处理 |
| 注册名 | `ArchiveVolumeIntegrityPanel` |
| Props要点 | volumeId、detail、displayedIntegrityResult、displayedFourProperty、checkingIntegrity |
| 结构信号 | 表格、严格枚举、失败toast、Tag |

**Impeccable：** 归档卷子链；表格、严格枚举、失败toast、Tag；props volumeId、detail、displayedIntegrityResult、displayedFourProperty、checkingIntegrity。  
**Finesse：** L684 面板，须防按钮墙。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 材料登记用归档专用 modal。  
**禁：** 名册 Excel 模态冒充归档。

## 487. `ArchiveVolumeMaterialTablePanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/ArchiveVolumeMaterialTablePanel.vue` |
| 源码 | L978;refs≈1;有失败处理 |
| 注册名 | `ArchiveVolumeMaterialTablePanel` |
| Props要点 | volumeId、detail、selectedCatalogKeys、canRegisterMaterial |
| 结构信号 | 表格、提示条、严格枚举、失败toast |

**Impeccable：** 归档卷子链；表格、提示条、严格枚举、失败toast；props volumeId、detail、selectedCatalogKeys、canRegisterMaterial。  
**Finesse：** L978 面板，须防按钮墙。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：TUNE**  
**动作：** 材料登记用归档专用 modal。  
**禁：** 名册 Excel 模态冒充归档。

## 488. `ArchiveVolumeMaterialTreePanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/ArchiveVolumeMaterialTreePanel.vue` |
| 源码 | L332;refs≈1;有Empty;有失败处理 |
| 注册名 | `ArchiveVolumeMaterialTreePanel` |
| Props要点 | volumeId、missingItems、catalogStatus |
| 结构信号 | 空态、提示条、严格枚举、失败toast |

**Impeccable：** 归档卷子链；空态、提示条、严格枚举、失败toast；props volumeId、missingItems、catalogStatus。  
**Finesse：** L332 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 材料登记用归档专用 modal。  
**禁：** 名册 Excel 模态冒充归档。

## 489. `ArchiveVolumeNextStepsPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/ArchiveVolumeNextStepsPanel.vue` |
| 源码 | L161;refs≈1;有失败处理 |
| 注册名 | `ArchiveVolumeNextStepsPanel` |
| Props要点 | actions、examId、volumeId |
| 结构信号 | 失败toast |

**Impeccable：** 归档卷子链；失败toast；props actions、examId、volumeId。  
**Finesse：** L161 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 材料登记用归档专用 modal。  
**禁：** 名册 Excel 模态冒充归档。

## 490. `ArchiveVolumeOcrSearchPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/ArchiveVolumeOcrSearchPanel.vue` |
| 源码 | L622;refs≈1;有Empty;有失败处理 |
| 注册名 | `ArchiveVolumeOcrSearchPanel` |
| Props要点 | volumeId、canRegisterMaterial |
| 结构信号 | 表格、空态、提示条、严格枚举 |

**Impeccable：** 归档卷子链；表格、空态、提示条、严格枚举；props volumeId、canRegisterMaterial。  
**Finesse：** L622 面板，须防按钮墙。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 材料登记用归档专用 modal。  
**禁：** 名册 Excel 模态冒充归档。
