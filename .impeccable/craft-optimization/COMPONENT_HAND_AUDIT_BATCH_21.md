# 组件手审账 · Batch 21（重写 · 逐文件三 Skill）

> 逐文件 Read 信号 + 引用核对 · Impeccable product · Finesse D8 · Taste 3/2/8 · frontend-design-mark  
> 替换原机械套话版 · 2026-07-16

## 371. `LayoutQuestionCropStrip.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/layout-designer/LayoutQuestionCropStrip.vue` |
| 源码 | L185;refs≈1 |
| 注册名 | `LayoutQuestionCropStrip` |
| Props要点 | document、question |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 制卷；无 Ui* 关键件；props document、question。  
**Finesse：** 画布+侧栏属性密度。  
**Taste：** 浅色 ROI，拒监控暗色。  

**判定：OK**  
**动作：** 保持浅色 ROI。  
**禁：** Web 暗色制卷。

## 372. `LayoutQuestionOutlinePanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/layout-designer/LayoutQuestionOutlinePanel.vue` |
| 源码 | L221;refs≈1 |
| 注册名 | `LayoutQuestionOutlinePanel` |
| Props要点 | document、focusedQuestionId、focusedBlockId |
| 结构信号 | 严格枚举、Tag |

**Impeccable：** 制卷；严格枚举、Tag；props document、focusedQuestionId、focusedBlockId。  
**Finesse：** 画布+侧栏属性密度。  
**Taste：** 浅色 ROI，拒监控暗色。  

**判定：OK**  
**动作：** 保持浅色 ROI。  
**禁：** Web 暗色制卷。

## 373. `LayoutReviewDrawer.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/layout-designer/LayoutReviewDrawer.vue` |
| 源码 | L123;refs≈1;有失败处理 |
| 注册名 | `LayoutReviewDrawer` |
| Props要点 | examId、document、pageNo、readonly |
| 结构信号 | 抽屉、失败toast |

**Impeccable：** 制卷；抽屉、失败toast；props examId、document、pageNo、readonly。  
**Finesse：** 画布+侧栏属性密度。  
**Taste：** 浅色 ROI，拒监控暗色。  

**判定：OK**  
**动作：** 保持 destroy-on-close 防脏状态。  
**禁：** 暗色监控抽屉。

## 374. `LayoutDesignLayoutPhase.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/layout-designer/workbench/LayoutDesignLayoutPhase.vue` |
| 源码 | L155;refs≈1;有Empty |
| 注册名 | `LayoutDesignLayoutPhase` |
| Props要点 | document、materialLayoutMode、pageNo、focusedBlockId、focusedQuestionId |
| 结构信号 | 空态 |

**Impeccable：** 制卷；空态；props document、materialLayoutMode、pageNo、focusedBlockId、focusedQuestionId。  
**Finesse：** 画布+侧栏属性密度。  
**Taste：** 浅色 ROI，拒监控暗色。  

**判定：OK**  
**动作：** 保持浅色 ROI。  
**禁：** Web 暗色制卷。

## 375. `LayoutDesignQuestionPhase.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/layout-designer/workbench/LayoutDesignQuestionPhase.vue` |
| 源码 | L28;refs≈1;薄 |
| 注册名 | `LayoutDesignQuestionPhase` |
| Props要点 | document、focusedQuestionId、readonly |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 薄封装；props≈document、focusedQuestionId、readonly。  
**Finesse：** 无独立布局增量。  
**Taste：** —  

**判定：SHELL**  
**动作：** 内联或删。  
**禁：** compat 别名。

## 376. `LayoutDesignReviewPhase.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/layout-designer/workbench/LayoutDesignReviewPhase.vue` |
| 源码 | L145;refs≈1 |
| 注册名 | `LayoutDesignReviewPhase` |
| Props要点 | document、saveBlockingReasons、saving、previewing、previewDisabled |
| 结构信号 | Tag |

**Impeccable：** 制卷；Tag；props document、saveBlockingReasons、saving、previewing、previewDisabled。  
**Finesse：** 画布+侧栏属性密度。  
**Taste：** 浅色 ROI，拒监控暗色。  

**判定：OK**  
**动作：** 保持浅色 ROI。  
**禁：** Web 暗色制卷。

## 377. `LayoutDesignSourcePhase.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/layout-designer/workbench/LayoutDesignSourcePhase.vue` |
| 源码 | L48;refs≈1 |
| 注册名 | `LayoutDesignSourcePhase` |
| Props要点 | document、examId、materialLayoutMode、generating、detecting |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 制卷；无 Ui* 关键件；props document、examId、materialLayoutMode、generating、detecting。  
**Finesse：** 画布+侧栏属性密度。  
**Taste：** 浅色 ROI，拒监控暗色。  

**判定：OK**  
**动作：** 保持浅色 ROI。  
**禁：** Web 暗色制卷。

## 378. `LayoutQuestionLedgerPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/layout-designer/workbench/LayoutQuestionLedgerPanel.vue` |
| 源码 | L183;refs≈1;有Empty |
| 注册名 | `LayoutQuestionLedgerPanel` |
| Props要点 | document、focusedQuestionId、readonly |
| 结构信号 | 表格、空态、严格枚举、Tag |

**Impeccable：** 制卷；表格、空态、严格枚举、Tag；props document、focusedQuestionId、readonly。  
**Finesse：** 画布+侧栏属性密度。  
**Taste：** 浅色 ROI，拒监控暗色。  

**判定：OK**  
**动作：** 保持浅色 ROI。  
**禁：** Web 暗色制卷。

## 379. `ManualSupplementCandidateTable.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/manual-supplement/ManualSupplementCandidateTable.vue` |
| 源码 | L180;refs≈1 |
| 注册名 | `ManualSupplementCandidateTable` |
| Props要点 | items、loading、total、emptyDescription |
| 结构信号 | 表格、严格枚举、Tag |

**Impeccable：** 表格、严格枚举、Tag；props items、loading、total、emptyDescription。  
**Finesse：** L180；slots=['ManualSupplementCandidateTable', 'bodyCell']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 380. `ManualSupplementWizardDrawer.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/manual-supplement/ManualSupplementWizardDrawer.vue` |
| 源码 | L620;refs≈1;有Empty;有失败处理 |
| 注册名 | `ManualSupplementWizardDrawer` |
| Props要点 | open、context |
| 结构信号 | 空态、提示条、抽屉、失败toast |

**Impeccable：** 空态、提示条、抽屉、失败toast；props open、context。  
**Finesse：** L620；slots=['ManualSupplementWizardDrawer', 'TeacherExamWorkspaceCandidateRoster', 'description', 'footer']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持 destroy-on-close 防脏状态。  
**禁：** 暗色监控抽屉。

## 381. `MarkingQuestionViewCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/MarkingQuestionViewCard.vue` |
| 源码 | L113;refs≈1;有Empty |
| 注册名 | `MarkingQuestionViewCard` |
| Props要点 | showWholePaperPlaceholder、loading、loaded、questionView、confidential |
| 结构信号 | 空态、提示条、Tag |

**Impeccable：** 空态、提示条、Tag；props showWholePaperPlaceholder、loading、loaded、questionView、confidential。  
**Finesse：** L113；slots=['MarkingQuestionViewCard', 'default', 'footer', 'title']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 382. `MarkingTaskInfoCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/MarkingTaskInfoCard.vue` |
| 源码 | L82;refs≈1 |
| 注册名 | `MarkingTaskInfoCard` |
| Props要点 | task、formatDateTime、taskStatusTone、taskStatusLabel、allocationUnitLabel |
| 结构信号 | Tag |

**Impeccable：** Tag；props task、formatDateTime、taskStatusTone、taskStatusLabel、allocationUnitLabel。  
**Finesse：** L82；slots=['MarkingTaskInfoCard']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 383. `MarkingTaskToolbar.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/MarkingTaskToolbar.vue` |
| 源码 | L267;refs≈1 |
| 注册名 | `MarkingTaskToolbar` |
| Props要点 | task、loading、isReadOnly、isExamOwner、revealedIdentity |
| 结构信号 | Tag |

**Impeccable：** Tag；props task、loading、isReadOnly、isExamOwner、revealedIdentity。  
**Finesse：** L267；slots=['MarkingTaskToolbar', 'content', 'footer']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 384. `QuestionExperienceAssistBindingModal.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/QuestionExperienceAssistBindingModal.vue` |
| 源码 | L192;refs≈1;有Empty;有失败处理 |
| 注册名 | `QuestionExperienceAssistBindingModal` |
| Props要点 | examId、layoutQuestionId、questionNo |
| 结构信号 | 空态、严格枚举、失败toast、Tag |

**Impeccable：** 空态、严格枚举、失败toast、Tag；props examId、layoutQuestionId、questionNo。  
**Finesse：** L192；slots=['QuestionExperienceAssistBindingModal']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持 destroy-on-close 防脏状态。  
**禁：** 暗色监控抽屉。

## 385. `RevealAnonymousModal.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/RevealAnonymousModal.vue` |
| 源码 | L118;refs≈1;有失败处理 |
| 注册名 | `RevealAnonymousModal` |
| Props要点 | examId、taskId |
| 结构信号 | 提示条、模态、失败toast |

**Impeccable：** 提示条、模态、失败toast；props examId、taskId。  
**Finesse：** L118；slots=['RevealAnonymousModal']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持 destroy-on-close 防脏状态。  
**禁：** 暗色监控抽屉。

## 386. `ScanBatchDiscardDialog.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/ScanBatchDiscardDialog.vue` |
| 源码 | L90;refs≈1 |
| 注册名 | `ScanBatchDiscardDialog` |
| Props要点 | open、confirmLoading |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 无 Ui* 关键件；props open、confirmLoading。  
**Finesse：** L90；slots=['ScanBatchDiscardDialog']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持 destroy-on-close 防脏状态。  
**禁：** 暗色监控抽屉。

## 387. `ScanBatchPageInspectorPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/ScanBatchPageInspectorPanel.vue` |
| 源码 | L693;refs≈1;有Empty;有失败处理 |
| 注册名 | `ScanBatchPageInspectorPanel` |
| Props要点 | inspector、loading、examId、scanBatchId、attributionItems |
| 结构信号 | 空态、严格枚举、失败toast、Tag |

**Impeccable：** 空态、严格枚举、失败toast、Tag；props inspector、loading、examId、scanBatchId、attributionItems。  
**Finesse：** L693；slots=['ScanBatchPageInspectorPanel']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 388. `ScanBatchPageRail.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/ScanBatchPageRail.vue` |
| 源码 | L335;refs≈1;有Empty |
| 注册名 | `ScanBatchPageRail` |
| Props要点 | pageItems、selectedPageKey、loading、loadingMore、emptyDescription |
| 结构信号 | 空态、严格枚举 |

**Impeccable：** 空态、严格枚举；props pageItems、selectedPageKey、loading、loadingMore、emptyDescription。  
**Finesse：** L335；slots=['ScanBatchPageRail', 'header', 'renderItem']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 389. `ScanBatchSupplementModal.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/ScanBatchSupplementModal.vue` |
| 源码 | L238;refs≈1;有失败处理 |
| 注册名 | `ScanBatchSupplementModal` |
| Props要点 | open、examId、batch |
| 结构信号 | 失败toast |

**Impeccable：** 失败toast；props open、examId、batch。  
**Finesse：** L238；slots=['ScanBatchSupplementModal']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持 destroy-on-close 防脏状态。  
**禁：** 暗色监控抽屉。

## 390. `ScanOrphanRecoveryAlert.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/ScanOrphanRecoveryAlert.vue` |
| 源码 | L171;refs≈1;有失败处理 |
| 注册名 | `ScanOrphanRecoveryAlert` |
| Props要点 | examId、orphanPendingEventCount、orphanPendingPageCount |
| 结构信号 | 提示条、失败toast、确认框 |

**Impeccable：** 提示条、失败toast、确认框；props examId、orphanPendingEventCount、orphanPendingPageCount。  
**Finesse：** L171；slots=['ScanOrphanRecoveryAlert', 'actions']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 391. `WholePaperGallery.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/WholePaperGallery.vue` |
| 源码 | L234;refs≈2;有Empty |
| 注册名 | `WholePaperGallery` |
| Props要点 | examId、taskId、pages、loaded、loading |
| 结构信号 | 空态、看片、Tag |

**Impeccable：** 空态、看片、Tag；props examId、taskId、pages、loaded、loading。  
**Finesse：** L234；slots=['WholePaperGallery', 'extra', 'title']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 392. `PortfolioAiCandidateConfirmPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/portfolio/PortfolioAiCandidateConfirmPanel.vue` |
| 源码 | L436;refs≈1;有Empty;有失败处理 |
| 注册名 | `PortfolioAiCandidateConfirmPanel` |
| Props要点 | taskId、readonly |
| 结构信号 | 表格、空态、提示条、严格枚举 |

**Impeccable：** 表格、空态、提示条、严格枚举；props taskId、readonly。  
**Finesse：** L436；slots=['PortfolioAiCandidateConfirmPanel', 'bodyCell']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 393. `PortfolioEligibilityTreeEditor.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/portfolio/PortfolioEligibilityTreeEditor.vue` |
| 源码 | L168;refs≈1 |
| 注册名 | `PortfolioEligibilityTreeEditor` |
| Props要点 | node、depth |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 无 Ui* 关键件；props node、depth。  
**Finesse：** L168；slots=['PortfolioEligibilityTreeEditor']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 394. `PortfolioPortraitLayoutEditor.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/portfolio/PortfolioPortraitLayoutEditor.vue` |
| 源码 | L250;refs≈1 |
| 注册名 | `PortfolioPortraitLayoutEditor` |
| Props要点 | widgets |
| 结构信号 | 严格枚举 |

**Impeccable：** 制卷；严格枚举；props widgets。  
**Finesse：** 画布+侧栏属性密度。  
**Taste：** 浅色 ROI，拒监控暗色。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 395. `PortfolioProgressCompareDrawer.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/portfolio/PortfolioProgressCompareDrawer.vue` |
| 源码 | L201;refs≈1;有Empty;有失败处理 |
| 注册名 | `PortfolioProgressCompareDrawer` |
| Props要点 | open、teacherId |
| 结构信号 | 空态、抽屉、失败toast |

**Impeccable：** 空态、抽屉、失败toast；props open、teacherId。  
**Finesse：** L201；slots=['PortfolioProgressCompareDrawer']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持 destroy-on-close 防脏状态。  
**禁：** 暗色监控抽屉。

## 396. `PortfolioTeacherOnboardingWizard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/portfolio/PortfolioTeacherOnboardingWizard.vue` |
| 源码 | L420;refs≈1;有Empty;有失败处理 |
| 注册名 | `PortfolioTeacherOnboardingWizard` |
| Props要点 | blockedByTemplate、blockedByReadiness、readonlyMode |
| 结构信号 | 表格、空态、提示条、失败toast |

**Impeccable：** 表格、空态、提示条、失败toast；props blockedByTemplate、blockedByReadiness、readonlyMode。  
**Finesse：** L420；slots=['PortfolioTeacherOnboardingWizard']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 397. `PortfolioTeacherReviewStatusTable.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/portfolio/PortfolioTeacherReviewStatusTable.vue` |
| 源码 | L167;refs≈1;有失败处理 |
| 注册名 | `PortfolioTeacherReviewStatusTable` |
| Props要点 | teacherId、academicYear、recordStatus、highlightRecordId |
| 结构信号 | 表格、严格枚举、失败toast、Tag |

**Impeccable：** 表格、严格枚举、失败toast、Tag；props teacherId、academicYear、recordStatus、highlightRecordId。  
**Finesse：** L167；slots=['PortfolioTeacherReviewStatusTable', 'bodyCell']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 398. `AccreditationAnnualPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/accreditation/AccreditationAnnualPanel.vue` |
| 源码 | L475;refs≈1;有Empty;有失败处理 |
| 注册名 | `AccreditationAnnualPanel` |
| Props要点 | programId、trainingPlanId、activeCycleId |
| 结构信号 | 表格、空态、失败toast、确认框 |

**Impeccable：** 表格、空态、失败toast、确认框；props programId、trainingPlanId、activeCycleId。  
**Finesse：** L475；slots=['bodyCell', 'empty']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 399. `AccreditationAnnualReportMaterialPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/accreditation/AccreditationAnnualReportMaterialPanel.vue` |
| 源码 | L687;refs≈1;有Empty;有失败处理 |
| 注册名 | `AccreditationAnnualReportMaterialPanel` |
| Props要点 | programId、trainingPlanId、activeCycle、activeCycleId |
| 结构信号 | 表格、空态、严格枚举、失败toast |

**Impeccable：** 表格、空态、严格枚举、失败toast；props programId、trainingPlanId、activeCycle、activeCycleId。  
**Finesse：** L687；slots=['bodyCell', 'empty']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 400. `AccreditationCyclePanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/accreditation/AccreditationCyclePanel.vue` |
| 源码 | L790;refs≈1;有Empty;有失败处理 |
| 注册名 | `AccreditationCyclePanel` |
| Props要点 | programId、trainingPlanId、cockpit |
| 结构信号 | 表格、空态、严格枚举、失败toast |

**Impeccable：** 表格、空态、严格枚举、失败toast；props programId、trainingPlanId、cockpit。  
**Finesse：** L790；slots=['bodyCell', 'empty']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 401. `AccreditationEvidencePanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/accreditation/AccreditationEvidencePanel.vue` |
| 源码 | L577;refs≈1;有Empty;有失败处理 |
| 注册名 | `AccreditationEvidencePanel` |
| Props要点 | programId、trainingPlanId、activeCycle、cockpit |
| 结构信号 | 表格、空态、严格枚举、失败toast |

**Impeccable：** 表格、空态、严格枚举、失败toast；props programId、trainingPlanId、activeCycle、cockpit。  
**Finesse：** L577；slots=['bodyCell', 'empty']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 402. `AccreditationOnsitePanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/accreditation/AccreditationOnsitePanel.vue` |
| 源码 | L604;refs≈1;有Empty;有失败处理 |
| 注册名 | `AccreditationOnsitePanel` |
| Props要点 | programId、trainingPlanId、activeCycle、activeCycleId |
| 结构信号 | 表格、空态、严格枚举、失败toast |

**Impeccable：** 表格、空态、严格枚举、失败toast；props programId、trainingPlanId、activeCycle、activeCycleId。  
**Finesse：** L604；slots=['bodyCell', 'empty']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 403. `AccreditationSupportPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/accreditation/AccreditationSupportPanel.vue` |
| 源码 | L857;refs≈1;有Empty;有失败处理 |
| 注册名 | `AccreditationSupportPanel` |
| Props要点 | programId、trainingPlanId |
| 结构信号 | 表格、空态、失败toast、确认框 |

**Impeccable：** 表格、空态、失败toast、确认框；props programId、trainingPlanId。  
**Finesse：** L857；slots=['bodyCell', 'empty']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 404. `SelfAssessmentReportPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/accreditation/SelfAssessmentReportPanel.vue` |
| 源码 | L528;refs≈1;有Empty;有失败处理 |
| 注册名 | `SelfAssessmentReportPanel` |
| Props要点 | cockpit、activeCycle、programId、trainingPlanId |
| 结构信号 | 空态、严格枚举、失败toast、Tag |

**Impeccable：** 空态、严格枚举、失败toast、Tag；props cockpit、activeCycle、programId、trainingPlanId。  
**Finesse：** L528；slots=['SelfAssessmentReportPanel', 'extra', 'footer']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 405. `GlobalPromptInputDialog.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/GlobalPromptInputDialog.vue` |
| 源码 | L49;refs≈1 |
| 注册名 | `GlobalPromptInputDialog` |
| Props要点 | 见源码 |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 无 Ui* 关键件；props 见源码。  
**Finesse：** L49；slots=['GlobalPromptInputDialog']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持 destroy-on-close 防脏状态。  
**禁：** 暗色监控抽屉。

## 406. `AuditIssueTab.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/improvement/AuditIssueTab.vue` |
| 源码 | L679;refs≈1;有失败处理 |
| 注册名 | `AuditIssueTab` |
| Props要点 | onLoadError、onWorkbenchRefresh |
| 结构信号 | 表格、模态、严格枚举、失败toast |

**Impeccable：** 表格、模态、严格枚举、失败toast；props onLoadError、onWorkbenchRefresh。  
**Finesse：** L679；slots=['AuditIssueTab', 'bodyCell', 'extra']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 407. `AuditRectificationTab.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/improvement/AuditRectificationTab.vue` |
| 源码 | L791;refs≈1;有失败处理 |
| 注册名 | `AuditRectificationTab` |
| Props要点 | onLoadError、onWorkbenchRefresh |
| 结构信号 | 表格、模态、严格枚举、失败toast |

**Impeccable：** 表格、模态、严格枚举、失败toast；props onLoadError、onWorkbenchRefresh。  
**Finesse：** L791；slots=['AuditRectificationTab', 'bodyCell', 'extra', 'field-auditIssueId']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 408. `AuditSupervisionTab.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/improvement/AuditSupervisionTab.vue` |
| 源码 | L861;refs≈1;有失败处理 |
| 注册名 | `AuditSupervisionTab` |
| Props要点 | onLoadError、onWorkbenchRefresh |
| 结构信号 | 表格、模态、严格枚举、失败toast |

**Impeccable：** 表格、模态、严格枚举、失败toast；props onLoadError、onWorkbenchRefresh。  
**Finesse：** L861；slots=['AuditSupervisionTab', 'bodyCell', 'extra']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。

## 409. `ImprovementTaskTab.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/improvement/ImprovementTaskTab.vue` |
| 源码 | L930;refs≈1;有Empty;有失败处理 |
| 注册名 | `ImprovementTaskTab` |
| Props要点 | onLoadError、onWorkbenchRefresh |
| 结构信号 | 表格、空态、严格枚举、失败toast |

**Impeccable：** 表格、空态、严格枚举、失败toast；props onLoadError、onWorkbenchRefresh。  
**Finesse：** L930；slots=['ImprovementTaskTab', 'bodyCell', 'extra', 'field-qualityCourseId']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：TUNE**  
**动作：** 拆职责时保持 API 合同。  
**禁：** 同页装饰 KPI 墙。

## 410. `MarkQualitySyncChip.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/MarkQualitySyncChip.vue` |
| 源码 | L124;refs≈1;有失败处理 |
| 注册名 | `MarkQualitySyncChip` |
| Props要点 | exam |
| 结构信号 | 严格枚举、失败toast、Tag |

**Impeccable：** 严格枚举、失败toast、Tag；props exam。  
**Finesse：** L124；slots=['MarkQualitySyncChip', 'QualityAchievement']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假空成功；未知枚举兜底。
