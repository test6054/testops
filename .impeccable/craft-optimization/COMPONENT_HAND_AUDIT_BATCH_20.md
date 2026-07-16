# 组件手审账 · Batch 20（重写 · 逐文件三 Skill）

> 逐文件 Read 信号 + 引用核对 · Impeccable product · Finesse D8 · Taste 3/2/8 · frontend-design-mark  
> 替换原机械套话版 · 2026-07-16

## 331. `KioskScanExceptionPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/components/KioskScanExceptionPanel.vue` |
| 源码 | L482;refs≈2 |
| 注册名 | `KioskScanExceptionPanel` |
| Props要点 | open、pageNo、paperInstanceId |
| 结构信号 | 严格枚举 |

**Impeccable：** 一体机阶段；props open、pageNo、paperInstanceId；严格枚举。  
**Finesse：** kiosk 操作密度优先，可深色。  
**Taste：** 勿把暗色抄回 Web 工作台。  

**判定：OK**  
**动作：** 保持 Agent 合同；Web 勿抄暗色。  
**禁：** 把 kiosk 暗色搬进 mark-vue Web。

## 332. `KioskScanSessionStrip.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/components/KioskScanSessionStrip.vue` |
| 源码 | L179;refs≈2 |
| 注册名 | `KioskScanSessionStrip` |
| Props要点 | 见源码 |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 一体机阶段；props 见源码；无 Ui* 关键件。  
**Finesse：** kiosk 操作密度优先，可深色。  
**Taste：** 勿把暗色抄回 Web 工作台。  

**判定：OK**  
**动作：** 保持 Agent 合同；Web 勿抄暗色。  
**禁：** 把 kiosk 暗色搬进 mark-vue Web。

## 333. `KioskSessionBatchPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/components/KioskSessionBatchPanel.vue` |
| 源码 | L378;refs≈2 |
| 注册名 | `KioskSessionBatchPanel` |
| Props要点 | variant |
| 结构信号 | 严格枚举、确认框 |

**Impeccable：** 一体机阶段；props variant；严格枚举、确认框。  
**Finesse：** kiosk 操作密度优先，可深色。  
**Taste：** 勿把暗色抄回 Web 工作台。  

**判定：OK**  
**动作：** 保持 Agent 合同；Web 勿抄暗色。  
**禁：** 把 kiosk 暗色搬进 mark-vue Web。

## 334. `AiGenerationProgressPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/ai-analysis/cards/AiGenerationProgressPanel.vue` |
| 源码 | L131;refs≈2 |
| 注册名 | `AiGenerationProgressPanel` |
| Props要点 | title、active、waitingText |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 学情/AI 分析；无 Ui* 关键件。  
**Finesse：** 卡片/图密度克制。  
**Taste：** 系列色语义，禁假达成。  

**判定：OK**  
**动作：** 失败与空分叉。  
**禁：** 假达成图。

## 335. `ClassWeaknessCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/ai-analysis/cards/ClassWeaknessCard.vue` |
| 源码 | L256;refs≈2;有Empty;有失败处理 |
| 注册名 | `ClassWeaknessCard` |
| Props要点 | examId、reloadToken、classId、examLabel、classOptions |
| 结构信号 | 严格枚举、失败toast |

**Impeccable：** 学情/AI 分析；严格枚举、失败toast。  
**Finesse：** 卡片/图密度克制。  
**Taste：** 系列色语义，禁假达成。  

**判定：OK**  
**动作：** 失败与空分叉。  
**禁：** 假达成图。

## 336. `ErrorCauseClusterCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/ai-analysis/cards/ErrorCauseClusterCard.vue` |
| 源码 | L207;refs≈2;有Empty;有失败处理 |
| 注册名 | `ErrorCauseClusterCard` |
| Props要点 | examId、reloadToken、classId、examLabel、embedded |
| 结构信号 | 严格枚举、失败toast |

**Impeccable：** 学情/AI 分析；严格枚举、失败toast。  
**Finesse：** 卡片/图密度克制。  
**Taste：** 系列色语义，禁假达成。  

**判定：OK**  
**动作：** 失败与空分叉。  
**禁：** 假达成图。

## 337. `RejudgePlanCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/ai-analysis/cards/RejudgePlanCard.vue` |
| 源码 | L437;refs≈2;有失败处理 |
| 注册名 | `RejudgePlanCard` |
| Props要点 | examId、reloadToken、examLabel、embedded |
| 结构信号 | 表格、提示条、严格枚举、失败toast |

**Impeccable：** 学情/AI 分析；表格、提示条、严格枚举、失败toast。  
**Finesse：** 卡片/图密度克制。  
**Taste：** 系列色语义，禁假达成。  

**判定：OK**  
**动作：** 失败与空分叉。  
**禁：** 假达成图。

## 338. `StudentLearningProfileCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/ai-analysis/cards/StudentLearningProfileCard.vue` |
| 源码 | L439;refs≈2;有Empty;有失败处理 |
| 注册名 | `StudentLearningProfileCard` |
| Props要点 | examId、reloadToken、classIdHint、studentOptions、rosterLoading |
| 结构信号 | 严格枚举、失败toast、Tag |

**Impeccable：** 学情/AI 分析；严格枚举、失败toast、Tag。  
**Finesse：** 卡片/图密度克制。  
**Taste：** 系列色语义，禁假达成。  

**判定：OK**  
**动作：** 失败与空分叉。  
**禁：** 假达成图。

## 339. `TeachingImprovementCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/ai-analysis/cards/TeachingImprovementCard.vue` |
| 源码 | L256;refs≈2;有Empty;有失败处理 |
| 注册名 | `TeachingImprovementCard` |
| Props要点 | examId、reloadToken、classId、examLabel、embedded |
| 结构信号 | 严格枚举、失败toast |

**Impeccable：** 学情/AI 分析；严格枚举、失败toast。  
**Finesse：** 卡片/图密度克制。  
**Taste：** 系列色语义，禁假达成。  

**判定：OK**  
**动作：** 失败与空分叉。  
**禁：** 假达成图。

## 340. `ArchiveTemplateSetEditorDrawer.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/ArchiveTemplateSetEditorDrawer.vue` |
| 源码 | L402;refs≈2 |
| 注册名 | `ArchiveTemplateSetEditorDrawer` |
| Props要点 | open、title、loading、saving、mode |
| 结构信号 | 严格枚举 |

**Impeccable：** 归档卷子链；严格枚举；props open、title、loading、saving、mode。  
**Finesse：** L402 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 保持 destroy-on-close 防脏状态。  
**禁：** 暗色监控抽屉。

## 341. `ArchiveVolumeCollaboratorStrip.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/ArchiveVolumeCollaboratorStrip.vue` |
| 源码 | L74;refs≈2 |
| 注册名 | `ArchiveVolumeCollaboratorStrip` |
| Props要点 | collaborators、canManage |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 归档卷子链；无 Ui* 关键件；props collaborators、canManage。  
**Finesse：** L74 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 材料登记用归档专用 modal。  
**禁：** 名册 Excel 模态冒充归档。

## 342. `ArchiveVolumeTemplateSetsPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/ArchiveVolumeTemplateSetsPanel.vue` |
| 源码 | L973;refs≈2;有Empty;有失败处理 |
| 注册名 | `ArchiveVolumeTemplateSetsPanel` |
| Props要点 | 见源码 |
| 结构信号 | 表格、空态、提示条、严格枚举 |

**Impeccable：** 归档卷子链；表格、空态、提示条、严格枚举；props 见源码。  
**Finesse：** L973 面板，须防按钮墙。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：TUNE**  
**动作：** 材料登记用归档专用 modal。  
**禁：** 名册 Excel 模态冒充归档。

## 343. `DepartmentReviewMaterialSummary.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/DepartmentReviewMaterialSummary.vue` |
| 源码 | L226;refs≈2;有失败处理 |
| 注册名 | `DepartmentReviewMaterialSummary` |
| Props要点 | volumeId、detail、showNavigateActions |
| 结构信号 | 严格枚举、失败toast、Tag |

**Impeccable：** 归档卷子链；严格枚举、失败toast、Tag；props volumeId、detail、showNavigateActions。  
**Finesse：** L226 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 材料登记用归档专用 modal。  
**禁：** 名册 Excel 模态冒充归档。

## 344. `ArchiveVolumeMaterialTagModal.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/ArchiveVolumeMaterialTagModal.vue` |
| 源码 | L89;refs≈2;有失败处理 |
| 注册名 | `ArchiveVolumeMaterialTagModal` |
| Props要点 | open、materialId、volumeId、fileName、initialTags |
| 结构信号 | 失败toast |

**Impeccable：** 归档卷子链；失败toast；props open、materialId、volumeId、fileName、initialTags。  
**Finesse：** L89 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 保持 destroy-on-close 防脏状态。  
**禁：** 暗色监控抽屉。

## 345. `ArchiveVolumeSubmitTaskList.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/ArchiveVolumeSubmitTaskList.vue` |
| 源码 | L103;refs≈2 |
| 注册名 | `ArchiveVolumeSubmitTaskList` |
| Props要点 | items、readonly |
| 结构信号 | Tag |

**Impeccable：** 归档卷子链；Tag；props items、readonly。  
**Finesse：** L103 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 材料登记用归档专用 modal。  
**禁：** 名册 Excel 模态冒充归档。

## 346. `ScanDispatchForceReleaseDialog.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/ScanDispatchForceReleaseDialog.vue` |
| 源码 | L98;refs≈2;有失败处理 |
| 注册名 | `ScanDispatchForceReleaseDialog` |
| Props要点 | open、ticket |
| 结构信号 | 失败toast |

**Impeccable：** 归档卷子链；失败toast；props open、ticket。  
**Finesse：** L98 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 保持 destroy-on-close 防脏状态。  
**禁：** 暗色监控抽屉。

## 347. `ArchiveEvalCampaignScopeSummary.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/archive-volume/ArchiveEvalCampaignScopeSummary.vue` |
| 源码 | L59;refs≈1 |
| 注册名 | `ArchiveEvalCampaignScopeSummary` |
| Props要点 | campaignName、scopeSummary、listTotalVolumeCount、panelTotal |
| 结构信号 | 提示条 |

**Impeccable：** 归档卷子链；提示条；props campaignName、scopeSummary、listTotalVolumeCount、panelTotal。  
**Finesse：** L59 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 348. `ArchiveExamAutoCreateStatus.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/archive-volume/ArchiveExamAutoCreateStatus.vue` |
| 源码 | L108;refs≈1 |
| 注册名 | `ArchiveExamAutoCreateStatus` |
| Props要点 | examGate、pollTimedOut、hasAutoCreateFailure、autoCreateFailedDescription、showRetryAutoCreate |
| 结构信号 | 提示条 |

**Impeccable：** 归档卷子链；提示条；props examGate、pollTimedOut、hasAutoCreateFailure、autoCreateFailedDescription、showRetryAutoCreate。  
**Finesse：** L108 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 349. `ArchiveExamExportTasksCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/archive-volume/ArchiveExamExportTasksCard.vue` |
| 源码 | L346;refs≈1;有Empty;有失败处理 |
| 注册名 | `ArchiveExamExportTasksCard` |
| Props要点 | examId、canCreate |
| 结构信号 | 表格、空态、严格枚举、失败toast |

**Impeccable：** 归档卷子链；表格、空态、严格枚举、失败toast；props examId、canCreate。  
**Finesse：** L346 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 350. `ArchiveExamScoreGatePanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/archive-volume/ArchiveExamScoreGatePanel.vue` |
| 源码 | L266;refs≈1 |
| 注册名 | `ArchiveExamScoreGatePanel` |
| Props要点 | gate、loading、showStats |
| 结构信号 | Tag |

**Impeccable：** 归档卷子链；Tag；props gate、loading、showStats。  
**Finesse：** L266 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 351. `ArchiveLifecyclePipeTrack.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/archive-volume/ArchiveLifecyclePipeTrack.vue` |
| 源码 | L176;refs≈1;有Empty |
| 注册名 | `ArchiveLifecyclePipeTrack` |
| Props要点 | steps、clickable |
| 结构信号 | 空态 |

**Impeccable：** 归档卷子链；空态；props steps、clickable。  
**Finesse：** L176 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 352. `ArchivePackageTimeline.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/archive-volume/ArchivePackageTimeline.vue` |
| 源码 | L130;refs≈1;有Empty |
| 注册名 | `ArchivePackageTimeline` |
| Props要点 | steps |
| 结构信号 | 空态 |

**Impeccable：** 归档卷子链；空态；props steps。  
**Finesse：** L130 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 353. `ExamArchiveGateBanner.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/archive-volume/ExamArchiveGateBanner.vue` |
| 源码 | L223;refs≈1;有失败处理 |
| 注册名 | `ExamArchiveGateBanner` |
| Props要点 | examId、compact、showClassProgressTable、scoresFullyPublished |
| 结构信号 | 表格、提示条、失败toast、Tag |

**Impeccable：** 归档卷子链；表格、提示条、失败toast、Tag；props examId、compact、showClassProgressTable、scoresFullyPublished。  
**Finesse：** L223 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 354. `ExportTaskCenter.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/export/ExportTaskCenter.vue` |
| 源码 | L592;refs≈1;有Empty;有失败处理 |
| 注册名 | `ExportTaskCenter` |
| Props要点 | 见源码 |
| 结构信号 | 表格、空态、抽屉、失败toast |

**Impeccable：** 表格、空态、抽屉、失败toast；props 见源码。  
**Finesse：** L592；slots=['ExportTaskCenter', 'bodyCell', 'empty', 'field-dateRange', 'image']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 355. `AiClusterTile.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/analysis/AiClusterTile.vue` |
| 源码 | L26;refs≈1;薄 |
| 注册名 | `AiClusterTile` |
| Props要点 | label、proportionText、description、questionNos、suggestion |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 无 Ui* 关键件；props label、proportionText、description、questionNos、suggestion。  
**Finesse：** L26；slots=['AiClusterTile']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 356. `AiObjectiveProgressRow.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/analysis/AiObjectiveProgressRow.vue` |
| 源码 | L49;refs≈1 |
| 注册名 | `AiObjectiveProgressRow` |
| Props要点 | objective、achievementRate、status、targetRate |
| 结构信号 | 严格枚举、Tag |

**Impeccable：** 严格枚举、Tag；props objective、achievementRate、status、targetRate。  
**Finesse：** L49；slots=['AiObjectiveProgressRow']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 357. `AiRecommendationBlock.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/analysis/AiRecommendationBlock.vue` |
| 源码 | L29;refs≈1;薄 |
| 注册名 | `AiRecommendationBlock` |
| Props要点 | areaLabel、issue、suggestion、severityLabel、severityTone |
| 结构信号 | Tag |

**Impeccable：** Tag；props areaLabel、issue、suggestion、severityLabel、severityTone。  
**Finesse：** L29；slots=['AiRecommendationBlock']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 358. `AiWeaknessRow.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/analysis/AiWeaknessRow.vue` |
| 源码 | L27;refs≈1;薄 |
| 注册名 | `AiWeaknessRow` |
| Props要点 | title、weaknessLevel、metricText、questionNos |
| 结构信号 | 严格枚举、Tag |

**Impeccable：** 严格枚举、Tag；props title、weaknessLevel、metricText、questionNos。  
**Finesse：** L27；slots=['AiWeaknessRow']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 359. `AnalysisExamSelect.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/AnalysisExamSelect.vue` |
| 源码 | L138;refs≈1;有失败处理 |
| 注册名 | `AnalysisExamSelect` |
| Props要点 | placeholder、scopeCourseId、scopeClassId、scopeReferenceDepartmentId |
| 结构信号 | 失败toast |

**Impeccable：** 失败toast；props placeholder、scopeCourseId、scopeClassId、scopeReferenceDepartmentId。  
**Finesse：** L138；slots=['AnalysisExamSelect']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 360. `ApplyScoreToRemainingModal.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/ApplyScoreToRemainingModal.vue` |
| 源码 | L126;refs≈1 |
| 注册名 | `ApplyScoreToRemainingModal` |
| Props要点 | open、score、remainingCount、countdownSeconds |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 无 Ui* 关键件；props open、score、remainingCount、countdownSeconds。  
**Finesse：** L126；slots=['ApplyScoreToRemainingModal']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持 destroy-on-close 防脏状态。  
**禁：** 暗色监控抽屉。

## 361. `MarkingOverviewAnalytics.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/dashboard/MarkingOverviewAnalytics.vue` |
| 源码 | L148;refs≈1;有Empty |
| 注册名 | `MarkingOverviewAnalytics` |
| Props要点 | journeyStageSummary、markingProgressSummary、todoTypeSummary、filteredExamCount、loading |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 无 Ui* 关键件；props journeyStageSummary、markingProgressSummary、todoTypeSummary、filteredExamCount、loading。  
**Finesse：** L148；slots=['MarkingOverviewAnalytics']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 362. `OngoingExamCardGrid.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/dashboard/OngoingExamCardGrid.vue` |
| 源码 | L359;refs≈1;有Empty |
| 注册名 | `OngoingExamCardGrid` |
| Props要点 | exams |
| 结构信号 | 空态、Tag |

**Impeccable：** 空态、Tag；props exams。  
**Finesse：** L359；slots=['OngoingExamCardGrid']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 363. `PublishedExamInsightChart.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/dashboard/PublishedExamInsightChart.vue` |
| 源码 | L80;refs≈1;有Empty |
| 注册名 | `PublishedExamInsightChart` |
| Props要点 | insights |
| 结构信号 | 空态 |

**Impeccable：** 空态；props insights。  
**Finesse：** L80；slots=['PublishedExamInsightChart']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 364. `PublishedExamInsightTable.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/dashboard/PublishedExamInsightTable.vue` |
| 源码 | L121;refs≈1;有Empty |
| 注册名 | `PublishedExamInsightTable` |
| Props要点 | insights |
| 结构信号 | 表格、空态 |

**Impeccable：** 表格、空态；props insights。  
**Finesse：** L121；slots=['PublishedExamInsightTable', 'bodyCell']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 365. `ExamExperienceAssistPolicyEnableModal.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/ExamExperienceAssistPolicyEnableModal.vue` |
| 源码 | L162;refs≈1;有失败处理 |
| 注册名 | `ExamExperienceAssistPolicyEnableModal` |
| Props要点 | examId、mode、effectiveMinConsistencyRate、effectiveMaxHammingDistance、effectiveMaxExperienceItems |
| 结构信号 | 失败toast |

**Impeccable：** 失败toast；props examId、mode、effectiveMinConsistencyRate、effectiveMaxHammingDistance、effectiveMaxExperienceItems。  
**Finesse：** L162；slots=['ExamExperienceAssistPolicyEnableModal']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持 destroy-on-close 防脏状态。  
**禁：** 暗色监控抽屉。

## 366. `LayoutBlockLayerPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/layout-designer/LayoutBlockLayerPanel.vue` |
| 源码 | L199;refs≈1 |
| 注册名 | `LayoutBlockLayerPanel` |
| Props要点 | document、pageNo、focusedBlockId |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 制卷；无 Ui* 关键件；props document、pageNo、focusedBlockId。  
**Finesse：** 画布+侧栏属性密度。  
**Taste：** 浅色 ROI，拒监控暗色。  

**判定：OK**  
**动作：** 保持浅色 ROI。  
**禁：** Web 暗色制卷。

## 367. `LayoutCanvasLite.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/layout-designer/LayoutCanvasLite.vue` |
| 源码 | L26;refs≈1;薄 |
| 注册名 | `LayoutCanvasLite` |
| Props要点 | document、pageNo、focusedBlockId |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 薄封装；props≈document、pageNo、focusedBlockId。  
**Finesse：** 无独立布局增量。  
**Taste：** —  

**判定：SHELL**  
**动作：** 内联或删。  
**禁：** compat 别名。

## 368. `LayoutCanvasToolbar.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/layout-designer/LayoutCanvasToolbar.vue` |
| 源码 | L138;refs≈1 |
| 注册名 | `LayoutCanvasToolbar` |
| Props要点 | zoom、showGrid、showSafeMargin、snapGridMm、canvasTool |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 制卷；无 Ui* 关键件；props zoom、showGrid、showSafeMargin、snapGridMm、canvasTool。  
**Finesse：** 画布+侧栏属性密度。  
**Taste：** 浅色 ROI，拒监控暗色。  

**判定：OK**  
**动作：** 保持浅色 ROI。  
**禁：** Web 暗色制卷。

## 369. `LayoutPreviewDrawer.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/layout-designer/LayoutPreviewDrawer.vue` |
| 源码 | L78;refs≈1;有Empty;有失败处理 |
| 注册名 | `LayoutPreviewDrawer` |
| Props要点 | previewPdfFileId |
| 结构信号 | 空态、抽屉、失败toast |

**Impeccable：** 制卷；空态、抽屉、失败toast；props previewPdfFileId。  
**Finesse：** 画布+侧栏属性密度。  
**Taste：** 浅色 ROI，拒监控暗色。  

**判定：OK**  
**动作：** 保持 destroy-on-close 防脏状态。  
**禁：** 暗色监控抽屉。

## 370. `LayoutPropertyDrawer.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/layout-designer/LayoutPropertyDrawer.vue` |
| 源码 | L247;refs≈1 |
| 注册名 | `LayoutPropertyDrawer` |
| Props要点 | document、block |
| 结构信号 | 严格枚举 |

**Impeccable：** 制卷；严格枚举；props document、block。  
**Finesse：** 画布+侧栏属性密度。  
**Taste：** 浅色 ROI，拒监控暗色。  

**判定：OK**  
**动作：** 保持 destroy-on-close 防脏状态。  
**禁：** 暗色监控抽屉。
