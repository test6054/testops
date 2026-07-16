# 组件手审账 · Batch 24（重写 · 逐文件三 Skill）

> 逐文件 Read 信号 + 引用核对 · Impeccable product · Finesse D8 · Taste 3/2/8 · frontend-design-mark  
> 替换原机械套话版 · 2026-07-16

## 491. `ArchiveVolumePhysicalLocationPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/ArchiveVolumePhysicalLocationPanel.vue` |
| 源码 | L361;refs≈1;hex=#8c8c8c;有失败处理 |
| 注册名 | `ArchiveVolumePhysicalLocationPanel` |
| Props要点 | volumeId、detail、canEdit |
| 结构信号 | 严格枚举、失败toast |

**Impeccable：** 归档卷子链；严格枚举、失败toast；props volumeId、detail、canEdit。  
**Finesse：** L361 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：TUNE**  
**动作：** 材料登记用归档专用 modal。  
**禁：** 名册 Excel 模态冒充归档。

## 492. `ArchiveVolumeScoresPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/ArchiveVolumeScoresPanel.vue` |
| 源码 | L359;refs≈1;有失败处理 |
| 注册名 | `ArchiveVolumeScoresPanel` |
| Props要点 | volumeId、detail、canConfirmScoreCompletion |
| 结构信号 | 表格、严格枚举、失败toast、Tag |

**Impeccable：** 归档卷子链；表格、严格枚举、失败toast、Tag；props volumeId、detail、canConfirmScoreCompletion。  
**Finesse：** L359 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 材料登记用归档专用 modal。  
**禁：** 名册 Excel 模态冒充归档。

## 493. `ArchiveVolumeSelfCheckList.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/ArchiveVolumeSelfCheckList.vue` |
| 源码 | L202;refs≈1;有Empty;有失败处理 |
| 注册名 | `ArchiveVolumeSelfCheckList` |
| Props要点 | volumeId、selfCheckStatus、readonly、embedded |
| 结构信号 | 空态、提示条、严格枚举、Tag |

**Impeccable：** 归档卷子链；空态、提示条、严格枚举、Tag；props volumeId、selfCheckStatus、readonly、embedded。  
**Finesse：** L202 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 材料登记用归档专用 modal。  
**禁：** 名册 Excel 模态冒充归档。

## 494. `ArchiveVolumeSubmitChecklistModal.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/ArchiveVolumeSubmitChecklistModal.vue` |
| 源码 | L215;refs≈1;有失败处理 |
| 注册名 | `ArchiveVolumeSubmitChecklistModal` |
| Props要点 | open、volumeId |
| 结构信号 | 提示条、失败toast |

**Impeccable：** 归档卷子链；提示条、失败toast；props open、volumeId。  
**Finesse：** L215 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 保持 destroy-on-close 防脏状态。  
**禁：** 暗色监控抽屉。

## 495. `ArchiveVolumeSubmitProgressBand.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/ArchiveVolumeSubmitProgressBand.vue` |
| 源码 | L123;refs≈1 |
| 注册名 | `ArchiveVolumeSubmitProgressBand` |
| Props要点 | progress、canSubmitVolume、blockingItems |
| 结构信号 | 严格枚举、Tag |

**Impeccable：** 归档卷子链；严格枚举、Tag；props progress、canSubmitVolume、blockingItems。  
**Finesse：** L123 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 材料登记用归档专用 modal。  
**禁：** 名册 Excel 模态冒充归档。

## 496. `ArchiveVolumeTransferPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/ArchiveVolumeTransferPanel.vue` |
| 源码 | L309;refs≈1;有Empty;有失败处理 |
| 注册名 | `ArchiveVolumeTransferPanel` |
| Props要点 | volumeId、detail、canReviewTransfer、canRejectTransfer |
| 结构信号 | 空态、提示条、严格枚举、失败toast |

**Impeccable：** 归档卷子链；空态、提示条、严格枚举、失败toast；props volumeId、detail、canReviewTransfer、canRejectTransfer。  
**Finesse：** L309 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 材料登记用归档专用 modal。  
**禁：** 名册 Excel 模态冒充归档。

## 497. `DepartmentReviewPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/DepartmentReviewPanel.vue` |
| 源码 | L279;refs≈1;有Empty;有失败处理 |
| 注册名 | `DepartmentReviewPanel` |
| Props要点 | volumeId、detail |
| 结构信号 | 空态、失败toast、Tag |

**Impeccable：** 归档卷子链；空态、失败toast、Tag；props volumeId、detail。  
**Finesse：** L279 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 材料登记用归档专用 modal。  
**禁：** 名册 Excel 模态冒充归档。

## 498. `DigitalMaterialConfirmPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/DigitalMaterialConfirmPanel.vue` |
| 源码 | L173;refs≈1;有失败处理 |
| 注册名 | `DigitalMaterialConfirmPanel` |
| Props要点 | volumeId、detail |
| 结构信号 | 严格枚举、失败toast |

**Impeccable：** 归档卷子链；严格枚举、失败toast；props volumeId、detail。  
**Finesse：** L173 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 材料登记用归档专用 modal。  
**禁：** 名册 Excel 模态冒充归档。

## 499. `TaskSettingsDrawer.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/TaskSettingsDrawer.vue` |
| 源码 | L282;refs≈1;有失败处理 |
| 注册名 | `TaskSettingsDrawer` |
| Props要点 | detail、canManageCollaborators、canUpdateArchiveDueTime |
| 结构信号 | 严格枚举、失败toast |

**Impeccable：** 归档卷子链；严格枚举、失败toast；props detail、canManageCollaborators、canUpdateArchiveDueTime。  
**Finesse：** L282 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 保持 destroy-on-close 防脏状态。  
**禁：** 暗色监控抽屉。

## 500. `ScanDispatchDialog.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/ScanDispatchDialog.vue` |
| 源码 | L142;refs≈1;hex=#595959,#8c8c8c;有失败处理 |
| 注册名 | `ScanDispatchDialog` |
| Props要点 | open、volumeId、catalogCode、materialType、archiveBatchMode |
| 结构信号 | 失败toast |

**Impeccable：** 归档卷子链；失败toast；props open、volumeId、catalogCode、materialType、archiveBatchMode。  
**Finesse：** L142 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 保持 destroy-on-close 防脏状态。  
**禁：** 暗色监控抽屉。

## 501. `ExamListExamWindowCell.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/components/ExamListExamWindowCell.vue` |
| 源码 | L54;refs≈1 |
| 注册名 | `ExamListExamWindowCell` |
| Props要点 | exam |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 页内组件；无 Ui* 关键件；props exam。  
**Finesse：** L54 随父页工作台。  
**Taste：** 禁重复身份条/装饰 KPI。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 502. `BasicSettingsStep.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/exam-create/BasicSettingsStep.vue` |
| 源码 | L365;refs≈1;有失败处理 |
| 注册名 | `BasicSettingsStep` |
| Props要点 | basicRules |
| 结构信号 | 严格枚举、失败toast |

**Impeccable：** 页内组件；严格枚举、失败toast；props basicRules。  
**Finesse：** L365 随父页工作台。  
**Taste：** 禁重复身份条/装饰 KPI。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 503. `CandidateScopeStep.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/exam-create/CandidateScopeStep.vue` |
| 源码 | L448;refs≈1;有Empty;有失败处理 |
| 注册名 | `CandidateScopeStep` |
| Props要点 | rosterRules |
| 结构信号 | 表格、空态、提示条、失败toast |

**Impeccable：** 页内组件；表格、空态、提示条、失败toast；props rosterRules。  
**Finesse：** L448 随父页工作台。  
**Taste：** 禁重复身份条/装饰 KPI。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 504. `ConfirmStep.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/exam-create/ConfirmStep.vue` |
| 源码 | L174;refs≈2 |
| 注册名 | `ConfirmStep` |
| Props要点 | 见源码 |
| 结构信号 | 严格枚举 |

**Impeccable：** 页内组件；严格枚举；props 见源码。  
**Finesse：** L174 随父页工作台。  
**Taste：** 禁重复身份条/装饰 KPI。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 505. `MarkingTeamStep.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/exam-create/MarkingTeamStep.vue` |
| 源码 | L131;refs≈1 |
| 注册名 | `MarkingTeamStep` |
| Props要点 | markingTeamRules |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 页内组件；无 Ui* 关键件；props markingTeamRules。  
**Finesse：** L131 随父页工作台。  
**Taste：** 禁重复身份条/装饰 KPI。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 506. `DuplicateResolutionCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/image-ledger/DuplicateResolutionCard.vue` |
| 源码 | L153;refs≈1 |
| 注册名 | `DuplicateResolutionCard` |
| Props要点 | examId、pendingDuplicateCount |
| 结构信号 | 表格、严格枚举、Tag |

**Impeccable：** 页内组件；表格、严格枚举、Tag；props examId、pendingDuplicateCount。  
**Finesse：** L153 随父页工作台。  
**Taste：** 禁重复身份条/装饰 KPI。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 507. `DuplicateResolveModal.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/image-ledger/DuplicateResolveModal.vue` |
| 源码 | L114;refs≈1;有失败处理 |
| 注册名 | `DuplicateResolveModal` |
| Props要点 | open、examId、resolution |
| 结构信号 | 失败toast |

**Impeccable：** 页内组件；失败toast；props open、examId、resolution。  
**Finesse：** L114 随父页工作台。  
**Taste：** 禁重复身份条/装饰 KPI。  

**判定：OK**  
**动作：** 保持 destroy-on-close 防脏状态。  
**禁：** 暗色监控抽屉。

## 508. `LedgerSummaryCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/image-ledger/LedgerSummaryCard.vue` |
| 源码 | L328;refs≈1;有Empty |
| 注册名 | `LedgerSummaryCard` |
| Props要点 | ledger、loading、balancing |
| 结构信号 | 空态、信号带、严格枚举、Tag |

**Impeccable：** 页内组件；空态、信号带、严格枚举、Tag；props ledger、loading、balancing。  
**Finesse：** L328 随父页工作台。  
**Taste：** 禁重复身份条/装饰 KPI。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 509. `NoticePopup.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/user/message/components/NoticePopup.vue` |
| 源码 | L349;refs≈1;有失败处理 |
| 注册名 | `NoticePopup` |
| Props要点 | noticeId |
| 结构信号 | 模态、失败toast |

**Impeccable：** 页内组件；模态、失败toast；props noticeId。  
**Finesse：** L349 随父页工作台。  
**Taste：** 禁重复身份条/装饰 KPI。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 510. `index.vue`

| 项 | 事实 |
|----|------|
| 路径 | `layout/index.vue` |
| 源码 | L10;refs≈27;薄 |
| 注册名 | `Layout` |
| Props要点 | 见源码 |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 应用壳；无 Ui* 关键件。  
**Finesse：** 全局滚动/导航承载。  
**Taste：** 永久浅色 #1677ff。  

**判定：OK**  
**动作：** 保持 light。  
**禁：** 暗色壳/紫渐变顶栏。

## 511. `Logo.vue`

| 项 | 事实 |
|----|------|
| 路径 | `layout/components/Logo.vue` |
| 源码 | L88;refs≈2 |
| 注册名 | `Logo` |
| Props要点 | 见源码 |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 应用壳；无 Ui* 关键件。  
**Finesse：** 全局滚动/导航承载。  
**Taste：** 永久浅色 #1677ff。  

**判定：OK**  
**动作：** 保持 light。  
**禁：** 暗色壳/紫渐变顶栏。

## 512. `index.vue`

| 项 | 事实 |
|----|------|
| 路径 | `layout/components/HeaderRightBar/index.vue` |
| 源码 | L411;refs≈27 |
| 注册名 | `HeaderRight` |
| Props要点 | variant |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 应用壳；无 Ui* 关键件。  
**Finesse：** 全局滚动/导航承载。  
**Taste：** 永久浅色 #1677ff。  

**判定：OK**  
**动作：** 保持 light。  
**禁：** 暗色壳/紫渐变顶栏。

## 513. `MenuCollapsedTooltip.vue`

| 项 | 事实 |
|----|------|
| 路径 | `layout/components/Menu/MenuCollapsedTooltip.vue` |
| 源码 | L41;refs≈3;薄 |
| 注册名 | `MenuCollapsedTooltip` |
| Props要点 | collapsed、label |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 应用壳；无 Ui* 关键件。  
**Finesse：** 全局滚动/导航承载。  
**Taste：** 永久浅色 #1677ff。  

**判定：OK**  
**动作：** 保持 light。  
**禁：** 暗色壳/紫渐变顶栏。

## 514. `MenuIcon.vue`

| 项 | 事实 |
|----|------|
| 路径 | `layout/components/Menu/MenuIcon.vue` |
| 源码 | L251;refs≈4 |
| 注册名 | `MenuIcon` |
| Props要点 | icon |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 应用壳；无 Ui* 关键件。  
**Finesse：** 全局滚动/导航承载。  
**Taste：** 永久浅色 #1677ff。  

**判定：OK**  
**动作：** 保持 light。  
**禁：** 暗色壳/紫渐变顶栏。

## 515. `index.vue`

| 项 | 事实 |
|----|------|
| 路径 | `layout/components/Menu/index.vue` |
| 源码 | L526;refs≈27 |
| 注册名 | `AppMenu` |
| Props要点 | 见源码 |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 应用壳；无 Ui* 关键件。  
**Finesse：** 全局滚动/导航承载。  
**Taste：** 永久浅色 #1677ff。  

**判定：OK**  
**动作：** 保持 light。  
**禁：** 暗色壳/紫渐变顶栏。

## 516. `MenuFoldBtn.vue`

| 项 | 事实 |
|----|------|
| 路径 | `layout/components/MenuFoldBtn.vue` |
| 源码 | L92;refs≈2 |
| 注册名 | `MenuFoldBtn` |
| Props要点 | 见源码 |
| 结构信号 | 抽屉 |

**Impeccable：** 应用壳；抽屉。  
**Finesse：** 全局滚动/导航承载。  
**Taste：** 永久浅色 #1677ff。  

**判定：OK**  
**动作：** 保持 light。  
**禁：** 暗色壳/紫渐变顶栏。

## 517. `AiTaskRunningBar.vue`

| 项 | 事实 |
|----|------|
| 路径 | `layout/components/AiTaskRunningBar.vue` |
| 源码 | L107;refs≈1 |
| 注册名 | `AiTaskRunningBar` |
| Props要点 | 见源码 |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 应用壳；无 Ui* 关键件。  
**Finesse：** 全局滚动/导航承载。  
**Taste：** 永久浅色 #1677ff。  

**判定：OK**  
**动作：** 保持 light。  
**禁：** 暗色壳/紫渐变顶栏。

## 518. `index.vue`

| 项 | 事实 |
|----|------|
| 路径 | `layout/components/Asider/index.vue` |
| 源码 | L120;refs≈27 |
| 注册名 | `Asider` |
| Props要点 | 见源码 |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 应用壳；无 Ui* 关键件。  
**Finesse：** 全局滚动/导航承载。  
**Taste：** 永久浅色 #1677ff。  

**判定：OK**  
**动作：** 保持 light。  
**禁：** 暗色壳/紫渐变顶栏。

## 519. `index.vue`

| 项 | 事实 |
|----|------|
| 路径 | `layout/components/Breadcrumb/index.vue` |
| 源码 | L121;refs≈27 |
| 注册名 | `Breadcrumb` |
| Props要点 | 见源码 |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 应用壳；无 Ui* 关键件。  
**Finesse：** 全局滚动/导航承载。  
**Taste：** 永久浅色 #1677ff。  

**判定：OK**  
**动作：** 保持 light。  
**禁：** 暗色壳/紫渐变顶栏。

## 520. `index.vue`

| 项 | 事实 |
|----|------|
| 路径 | `layout/components/Header/index.vue` |
| 源码 | L74;refs≈27 |
| 注册名 | `LayoutHeader` |
| Props要点 | 见源码 |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 应用壳；无 Ui* 关键件。  
**Finesse：** 全局滚动/导航承载。  
**Taste：** 永久浅色 #1677ff。  

**判定：OK**  
**动作：** 保持 light。  
**禁：** 暗色壳/紫渐变顶栏。

## 521. `Message.vue`

| 项 | 事实 |
|----|------|
| 路径 | `layout/components/HeaderRightBar/Message.vue` |
| 源码 | L523;refs≈27;有失败处理 |
| 注册名 | `Message` |
| Props要点 | variant |
| 结构信号 | 失败toast |

**Impeccable：** 应用壳；失败toast。  
**Finesse：** 全局滚动/导航承载。  
**Taste：** 永久浅色 #1677ff。  

**判定：OK**  
**动作：** 保持 light。  
**禁：** 暗色壳/紫渐变顶栏。

## 522. `MenuItem.vue`

| 项 | 事实 |
|----|------|
| 路径 | `layout/components/Menu/MenuItem.vue` |
| 源码 | L135;refs≈1 |
| 注册名 | `MenuItem` |
| Props要点 | 见源码 |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 应用壳；无 Ui* 关键件。  
**Finesse：** 全局滚动/导航承载。  
**Taste：** 永久浅色 #1677ff。  

**判定：OK**  
**动作：** 保持 light。  
**禁：** 暗色壳/紫渐变顶栏。

## 523. `index.vue`

| 项 | 事实 |
|----|------|
| 路径 | `layout/components/TabBar/index.vue` |
| 源码 | L199;refs≈27 |
| 注册名 | `TabBar` |
| Props要点 | 见源码 |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 应用壳；无 Ui* 关键件。  
**Finesse：** 全局滚动/导航承载。  
**Taste：** 永久浅色 #1677ff。  

**判定：OK**  
**动作：** 保持 light。  
**禁：** 暗色壳/紫渐变顶栏。

## 524. `LayoutDefault.vue`

| 项 | 事实 |
|----|------|
| 路径 | `layout/LayoutDefault.vue` |
| 源码 | L119;refs≈1 |
| 注册名 | `LayoutDefault` |
| Props要点 | 见源码 |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 制卷；无 Ui* 关键件；props 见源码。  
**Finesse：** 画布+侧栏属性密度。  
**Taste：** 浅色 ROI，拒监控暗色。  

**判定：OK**  
**动作：** 保持 light。  
**禁：** 暗色壳/紫渐变顶栏。
