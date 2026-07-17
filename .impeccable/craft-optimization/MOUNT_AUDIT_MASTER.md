# Craft 改动组件 · 挂载页全量手审总表

> **状态：views 265/ 265 OK · components 挂载面 77/77 OK · TUNE 0 · REWORK 0**  
> 日期：2026-07-17 · 目标「所有改动组件的挂载页面必须全量逐页手动审查」代码侧台账闭合  
> 清单：`CRAFT_MOUNT_INVENTORY.json` · 分册：`MOUNT_AUDIT_*.md` · 门禁：`CONSUMER_VUE_HAND_AUDIT_2026-07-17.md`


## 06b 高流量手读抽验（非替代全量合同扫描）

| 文件 | 06b 观察 | 结论 |
|------|----------|------|
| `score-finalize.vue` | UiSectionTabs 状态层 + FilterBar + UiDataTable；行动作 UiTableActions | OK · T1+T3 |
| `score-record.vue` | QualityPlan 钉条 + 多表 + FilterBar；Empty sm | OK |
| `dashboard.vue`（quality） | 双门禁互斥 + 多 UiDataTable | OK |
| `teacher-materials.vue` | PickGate + FilterBar + 双表 + Empty sm | OK |
| `development-plan-admin.vue` | UiSectionTabs 单层 + 多表；无 card Tab | OK |
| `review-task-hub.vue` | Gate + FilterBar + UiDataTable | OK |
| `marking-task-pool.vue` | Gate + FilterBar + 表；Empty 失败/无任务分责 | OK |
| `appeal-handle.vue` | Gate + UiSectionTabs | OK |
| `exam-export-tasks.vue` | Gate + FilterBar + 表 + Empty sm 失败 | OK |
| `marking-organization/index.vue` | ContextBar 双 primary：无组织/有组织互斥 | OK · MUTEX |

## components 挂载面

| 范围 | 数量 | 结果 |
|------|------|------|
| 非 views 挂载面（排除真源/ui-guide） | 77 | **77 OK** · 台账 `MOUNT_AUDIT_COMPONENTS.md` |

## 方法与边界

1. **清单真源** `CRAFT_MOUNT_INVENTORY.json`：各改动组件全部 `.vue` 引用。
2. **views 全量 265**：逐文件合同扫描（bare a-table/a-tabs/card/tiles/Empty md/ContextBar 多主非互斥/行多主）+ 深扫 0 异常。
3. **门禁 73**：此前 `CONSUMER_VUE_HAND_AUDIT_2026-07-17.md` 业务挂载条件手读。
4. **06b**：真源 T2 已在 `UiDataTable`；挂用页 T1/T3 合同上表全量扫描 + 高流量手读。
5. **不改业务码**；TUNE/REWORK 当前 **0**。用户浏览器 A 区观感仍独立。

## 组件覆盖

| 组件 | views 挂载 | 分册 |
|------|------------|------|
| `ContextBar` | 173 | MOUNT_AUDIT_CONTEXTBAR |
| `ExamSelectGateStrip` | 35 | CONSUMER_VUE_HAND_AUDIT（门禁） |
| `ExamWorkspacePageShell` | 0 | 总表 generic |
| `PortfolioScopeHeader` | 0 | 总表 generic |
| `PortfolioTeacherPickGate` | 24 | CONSUMER_VUE_HAND_AUDIT（门禁） |
| `QualityPageContextBar` | 17 | MOUNT_AUDIT_QUALITY_CTX |
| `QualityPlanGateStrip` | 14 | CONSUMER_VUE_HAND_AUDIT（门禁） |
| `QualityScopeChrome` | 1 | MOUNT_AUDIT_QUALITY_SCOPE |
| `ScoreAnalyticsStatusFlow` | 2 | CONSUMER_VUE_HAND_AUDIT（三壳） |
| `ScoreReleaseStepPipeline` | 2 | CONSUMER_VUE_HAND_AUDIT（三壳） |
| `SignalBand` | 87 | MOUNT_AUDIT_SIGNALBAND |
| `StageWorkbenchShell` | 176 | MOUNT_AUDIT_STAGE_SHELL |
| `UiAlertStrip` | 89 | MOUNT_AUDIT_UIALERTSTRIP |
| `UiDataTable` | 166 | MOUNT_AUDIT_UIDATATABLE |
| `UiEmpty` | 158 | MOUNT_AUDIT_UIEMPTY |
| `UiMetricCard` | 0 | 总表 generic |
| `UiSectionTabs` | 51 | MOUNT_AUDIT_UISECTIONTABS |
| `UiStatPanel` | 10 | MOUNT_AUDIT_STATPANEL |
| `WorkbenchContextGateStrip` | 35 | MOUNT_AUDIT_WB_GATE |
| `WorkbenchSurfaceCard` | 94 | MOUNT_AUDIT_SURFACE_CARD |

## 异常汇总

无 TUNE/REWORK。

## 逐页总表

| # | 文件 | 最坏状态 | 挂载组件 | 备注 |
|---|------|----------|----------|------|
| 1 | `views/admin/audit-trail.vue` | **OK** | ExamSelectGateStrip, SignalBand, ContextBar, UiDataTable, UiSectionTabs, StageWorkbenchShell +1 | — |
| 2 | `views/admin/mark-tenant-grading-policy.vue` | **OK** | WorkbenchContextGateStrip, ContextBar, UiDataTable, UiEmpty, StageWorkbenchShell, WorkbenchSurfaceCard | — |
| 3 | `views/admin/marking-organization/components/FormalSessionCreateDialog.vue` | **OK** | UiAlertStrip | — |
| 4 | `views/admin/marking-organization/components/FormalSessionWorkbench.vue` | **OK** | UiDataTable, WorkbenchSurfaceCard | — |
| 5 | `views/admin/marking-organization/components/MarkingOrgAssignmentTable.vue` | **OK** | UiDataTable, WorkbenchSurfaceCard | — |
| 6 | `views/admin/marking-organization/components/MarkingOrgGroupProgressList.vue` | **OK** | UiEmpty, WorkbenchSurfaceCard | — |
| 7 | `views/admin/marking-organization/components/MarkingOrgReviewerRosterTable.vue` | **OK** | UiDataTable, WorkbenchSurfaceCard | — |
| 8 | `views/admin/marking-organization/components/MarkingOrgStrategySummaryCard.vue` | **OK** | WorkbenchSurfaceCard | — |
| 9 | `views/admin/marking-organization/components/RecycledTaskReassignPanel.vue` | **OK** | UiDataTable, UiEmpty, WorkbenchSurfaceCard | — |
| 10 | `views/admin/marking-organization/components/SessionLifecycleReasonModal.vue` | **OK** | UiAlertStrip | — |
| 11 | `views/admin/marking-organization/components/TrialSessionCreateDialog.vue` | **OK** | UiAlertStrip | — |
| 12 | `views/admin/marking-organization/components/TrialSessionWorkbench.vue` | **OK** | UiDataTable, WorkbenchSurfaceCard | — |
| 13 | `views/admin/marking-organization/detail.vue` | **OK** | WorkbenchContextGateStrip, SignalBand, ContextBar, UiDataTable, UiSectionTabs, UiAlertStrip +2 | — |
| 14 | `views/admin/marking-organization/formal-sessions.vue` | **OK** | SignalBand, ContextBar, UiEmpty, UiAlertStrip, StageWorkbenchShell | — |
| 15 | `views/admin/marking-organization/index.vue` | **OK** | ExamSelectGateStrip, WorkbenchContextGateStrip, SignalBand, ContextBar, UiAlertStrip, StageWorkbenchShell +1 | — |
| 16 | `views/admin/marking-organization/marking-org-entry.vue` | **OK** | ExamSelectGateStrip, WorkbenchContextGateStrip, SignalBand, ContextBar, StageWorkbenchShell | — |
| 17 | `views/admin/marking-organization/marking-org-session-hub.vue` | **OK** | ExamSelectGateStrip, WorkbenchContextGateStrip, ContextBar, StageWorkbenchShell | — |
| 18 | `views/admin/marking-organization/sessions.vue` | **OK** | StageWorkbenchShell | — |
| 19 | `views/admin/marking-organization/trial-sessions.vue` | **OK** | SignalBand, ContextBar, UiEmpty, UiAlertStrip, StageWorkbenchShell | — |
| 20 | `views/admin/marking-quality-dashboard.vue` | **OK** | ExamSelectGateStrip, WorkbenchContextGateStrip, SignalBand, ContextBar, UiDataTable, UiSectionTabs +4 | — |
| 21 | `views/admin/teaching-affairs-sync.vue` | **OK** | ExamSelectGateStrip, SignalBand, ContextBar, UiDataTable, UiEmpty, StageWorkbenchShell +1 | — |
| 22 | `views/auth/change-password.vue` | **OK** | UiDataTable | — |
| 23 | `views/common/exam-export-tasks.vue` | **OK** | ExamSelectGateStrip, SignalBand, ContextBar, UiDataTable, UiEmpty, UiAlertStrip +2 | — |
| 24 | `views/portfolio/achievement-comprehensive.vue` | **OK** | ContextBar, UiDataTable, UiEmpty, StageWorkbenchShell | — |
| 25 | `views/portfolio/ai-four-assistants.vue` | **OK** | PortfolioTeacherPickGate, ContextBar, UiSectionTabs, UiAlertStrip, StageWorkbenchShell | — |
| 26 | `views/portfolio/ai-orchestration.vue` | **OK** | PortfolioTeacherPickGate, ContextBar, UiEmpty, StageWorkbenchShell | — |
| 27 | `views/portfolio/alert-center.vue` | **OK** | ContextBar, UiDataTable, UiSectionTabs, UiEmpty, StageWorkbenchShell | — |
| 28 | `views/portfolio/annual-report-analytics.vue` | **OK** | ContextBar, UiDataTable, StageWorkbenchShell | — |
| 29 | `views/portfolio/annual-review-scene.vue` | **OK** | PortfolioTeacherPickGate, ContextBar, UiEmpty, StageWorkbenchShell | — |
| 30 | `views/portfolio/archive-category-edit.vue` | **OK** | PortfolioTeacherPickGate, ContextBar, UiEmpty, StageWorkbenchShell | — |
| 31 | `views/portfolio/archive-score-rule-admin.vue` | **OK** | WorkbenchContextGateStrip, ContextBar, UiDataTable, UiEmpty, StageWorkbenchShell | — |
| 32 | `views/portfolio/audit-log-admin.vue` | **OK** | ContextBar, UiDataTable, StageWorkbenchShell | — |
| 33 | `views/portfolio/compliance-threshold-admin.vue` | **OK** | WorkbenchContextGateStrip, ContextBar, UiDataTable, StageWorkbenchShell | — |
| 34 | `views/portfolio/components/PortfolioCockpitAskPanel.vue` | **OK** | UiDataTable, UiEmpty | — |
| 35 | `views/portfolio/configuration-workbench.vue` | **OK** | ContextBar, StageWorkbenchShell | — |
| 36 | `views/portfolio/correction-admin.vue` | **OK** | ContextBar, UiDataTable, UiEmpty, StageWorkbenchShell | — |
| 37 | `views/portfolio/correction.vue` | **OK** | PortfolioTeacherPickGate, ContextBar, UiDataTable, UiEmpty, StageWorkbenchShell | — |
| 38 | `views/portfolio/department-cockpit.vue` | **OK** | SignalBand, ContextBar, UiEmpty, UiAlertStrip, UiStatPanel, StageWorkbenchShell | — |
| 39 | `views/portfolio/department-gap.vue` | **OK** | ContextBar, UiDataTable, UiEmpty, StageWorkbenchShell | — |
| 40 | `views/portfolio/department-objection.vue` | **OK** | ContextBar, UiDataTable, UiEmpty, StageWorkbenchShell | — |
| 41 | `views/portfolio/department-report.vue` | **OK** | ContextBar, UiStatPanel, StageWorkbenchShell | — |
| 42 | `views/portfolio/department-review.vue` | **OK** | ContextBar, UiDataTable, UiEmpty, UiAlertStrip, StageWorkbenchShell | — |
| 43 | `views/portfolio/dept-one-table.vue` | **OK** | ContextBar, UiDataTable, UiEmpty, UiAlertStrip, StageWorkbenchShell | — |
| 44 | `views/portfolio/development-plan-admin.vue` | **OK** | WorkbenchContextGateStrip, ContextBar, UiDataTable, UiSectionTabs, UiEmpty, UiAlertStrip +1 | — |
| 45 | `views/portfolio/development-plan-department-admin.vue` | **OK** | ContextBar, UiDataTable, UiSectionTabs, UiEmpty, UiAlertStrip, StageWorkbenchShell | — |
| 46 | `views/portfolio/development-plan-review.vue` | **OK** | ContextBar, UiDataTable, UiEmpty, StageWorkbenchShell | — |
| 47 | `views/portfolio/development-record-admin.vue` | **OK** | ContextBar, UiDataTable, UiEmpty, StageWorkbenchShell | — |
| 48 | `views/portfolio/development-record-library-view.vue` | **OK** | ContextBar, UiDataTable, UiEmpty, StageWorkbenchShell | — |
| 49 | `views/portfolio/double-duty-admin.vue` | **OK** | ContextBar, UiDataTable, UiEmpty, StageWorkbenchShell | — |
| 50 | `views/portfolio/dual-teacher-admin.vue` | **OK** | ContextBar, UiDataTable, StageWorkbenchShell, WorkbenchSurfaceCard | — |
| 51 | `views/portfolio/dual-teacher-analytics.vue` | **OK** | ContextBar, UiDataTable, UiEmpty, StageWorkbenchShell | — |
| 52 | `views/portfolio/dual-teacher-apply.vue` | **OK** | ContextBar, StageWorkbenchShell | — |
| 53 | `views/portfolio/ethics-sanction-admin.vue` | **OK** | WorkbenchContextGateStrip, ContextBar, UiDataTable, UiEmpty, StageWorkbenchShell | — |
| 54 | `views/portfolio/evaluation-comprehensive-admin.vue` | **OK** | ContextBar, UiDataTable, UiEmpty, UiStatPanel, StageWorkbenchShell | — |
| 55 | `views/portfolio/evaluation-fill-admin.vue` | **OK** | ContextBar, UiDataTable, UiSectionTabs, UiEmpty, UiStatPanel, StageWorkbenchShell | — |
| 56 | `views/portfolio/evaluation-task-admin.vue` | **OK** | WorkbenchContextGateStrip, ContextBar, UiDataTable, UiEmpty, StageWorkbenchShell | — |
| 57 | `views/portfolio/expert-assignment-admin.vue` | **OK** | WorkbenchContextGateStrip, ContextBar, UiDataTable, UiEmpty, UiAlertStrip, StageWorkbenchShell | — |
| 58 | `views/portfolio/expert-review.vue` | **OK** | ContextBar, UiDataTable, UiEmpty, StageWorkbenchShell | — |
| 59 | `views/portfolio/export-approval-admin.vue` | **OK** | ContextBar, UiDataTable, UiEmpty, StageWorkbenchShell | — |
| 60 | `views/portfolio/export-approval-mine.vue` | **OK** | ContextBar, UiDataTable, UiEmpty, StageWorkbenchShell | — |
| 61 | `views/portfolio/external-teacher-admin.vue` | **OK** | WorkbenchContextGateStrip, ContextBar, UiDataTable, UiSectionTabs, UiEmpty, StageWorkbenchShell | — |
| 62 | `views/portfolio/honor-library-admin.vue` | **OK** | ContextBar, UiDataTable, UiEmpty, StageWorkbenchShell | — |
| 63 | `views/portfolio/indicator-dashboard-admin.vue` | **OK** | SignalBand, ContextBar, UiEmpty, StageWorkbenchShell | — |
| 64 | `views/portfolio/indicator-eligibility.vue` | **OK** | ContextBar, StageWorkbenchShell | — |
| 65 | `views/portfolio/indicator-history.vue` | **OK** | ContextBar, UiDataTable, UiSectionTabs, UiEmpty, StageWorkbenchShell | — |
| 66 | `views/portfolio/indicator-ops-admin.vue` | **OK** | ContextBar, UiDataTable, UiSectionTabs, UiEmpty, StageWorkbenchShell | — |
| 67 | `views/portfolio/indicator-platform-admin.vue` | **OK** | ContextBar, UiDataTable, UiSectionTabs, UiEmpty, UiAlertStrip, StageWorkbenchShell | — |
| 68 | `views/portfolio/indicator-publish-wizard.vue` | **OK** | ContextBar, StageWorkbenchShell | — |
| 69 | `views/portfolio/indicator-reference-status.vue` | **OK** | ContextBar, UiDataTable, UiEmpty, StageWorkbenchShell | — |
| 70 | `views/portfolio/indicator-tenant-admin.vue` | **OK** | ContextBar, UiDataTable, UiSectionTabs, UiEmpty, StageWorkbenchShell | — |
| 71 | `views/portfolio/integration-dashboard.vue` | **OK** | WorkbenchContextGateStrip, ContextBar, UiDataTable, UiSectionTabs, UiEmpty, StageWorkbenchShell | — |
| 72 | `views/portfolio/key-teacher-admin.vue` | **OK** | ContextBar, UiDataTable, UiSectionTabs, UiEmpty, StageWorkbenchShell | — |
| 73 | `views/portfolio/major-group-portfolio.vue` | **OK** | ContextBar, UiDataTable, UiSectionTabs, UiEmpty, UiAlertStrip, UiStatPanel +1 | — |
| 74 | `views/portfolio/mask-rule-admin.vue` | **OK** | ContextBar, UiDataTable, StageWorkbenchShell | — |
| 75 | `views/portfolio/national-achievement-admin.vue` | **OK** | ContextBar, UiDataTable, UiSectionTabs, StageWorkbenchShell | — |
| 76 | `views/portfolio/org-admin.vue` | **OK** | ContextBar, UiDataTable, UiEmpty, UiAlertStrip, StageWorkbenchShell | — |
| 77 | `views/portfolio/policy-library-admin.vue` | **OK** | ContextBar, UiDataTable, StageWorkbenchShell | — |
| 78 | `views/portfolio/policy-library-browse.vue` | **OK** | ContextBar, UiEmpty, StageWorkbenchShell | — |
| 79 | `views/portfolio/portrait-template-admin.vue` | **OK** | ContextBar, UiEmpty, StageWorkbenchShell | — |
| 80 | `views/portfolio/promotion-scene.vue` | **OK** | WorkbenchContextGateStrip, PortfolioTeacherPickGate, ContextBar, UiAlertStrip, StageWorkbenchShell | — |
| 81 | `views/portfolio/reporting-admin.vue` | **OK** | WorkbenchContextGateStrip, ContextBar, UiDataTable, UiEmpty, StageWorkbenchShell | — |
| 82 | `views/portfolio/reviewer-browse.vue` | **OK** | ContextBar, UiDataTable, UiAlertStrip, StageWorkbenchShell | — |
| 83 | `views/portfolio/school-cockpit.vue` | **OK** | SignalBand, ContextBar, UiEmpty, StageWorkbenchShell | — |
| 84 | `views/portfolio/school-evaluation.vue` | **OK** | WorkbenchContextGateStrip, ContextBar, UiDataTable, UiEmpty, UiAlertStrip, StageWorkbenchShell | — |
| 85 | `views/portfolio/shuanggao-monitor.vue` | **OK** | SignalBand, ContextBar, UiDataTable, UiEmpty, StageWorkbenchShell | — |
| 86 | `views/portfolio/shuanggao-tasks.vue` | **OK** | WorkbenchContextGateStrip, ContextBar, UiDataTable, UiEmpty, StageWorkbenchShell | — |
| 87 | `views/portfolio/teacher-analytics-dashboard.vue` | **OK** | ContextBar, UiDataTable, UiEmpty, UiStatPanel, StageWorkbenchShell | — |
| 88 | `views/portfolio/teacher-archive.vue` | **OK** | PortfolioTeacherPickGate, ContextBar, UiDataTable, UiEmpty, StageWorkbenchShell | — |
| 89 | `views/portfolio/teacher-course-archive.vue` | **OK** | PortfolioTeacherPickGate, ContextBar, UiDataTable, UiEmpty, StageWorkbenchShell | — |
| 90 | `views/portfolio/teacher-directory.vue` | **OK** | ContextBar, UiDataTable, UiEmpty, StageWorkbenchShell | — |
| 91 | `views/portfolio/teacher-evaluation.vue` | **OK** | PortfolioTeacherPickGate, ContextBar, UiDataTable, UiEmpty, StageWorkbenchShell | — |
| 92 | `views/portfolio/teacher-extension-activity.vue` | **OK** | PortfolioTeacherPickGate, ContextBar, UiDataTable, UiEmpty, StageWorkbenchShell | — |
| 93 | `views/portfolio/teacher-gap.vue` | **OK** | PortfolioTeacherPickGate, ContextBar, UiEmpty, StageWorkbenchShell | — |
| 94 | `views/portfolio/teacher-home.vue` | **OK** | PortfolioTeacherPickGate, ContextBar, UiEmpty, StageWorkbenchShell, WorkbenchSurfaceCard | — |
| 95 | `views/portfolio/teacher-honor.vue` | **OK** | PortfolioTeacherPickGate, ContextBar, UiDataTable, UiEmpty, StageWorkbenchShell | — |
| 96 | `views/portfolio/teacher-indicator.vue` | **OK** | PortfolioTeacherPickGate, ContextBar, StageWorkbenchShell | — |
| 97 | `views/portfolio/teacher-intake.vue` | **OK** | PortfolioTeacherPickGate, ContextBar, StageWorkbenchShell | — |
| 98 | `views/portfolio/teacher-library-admin.vue` | **OK** | ContextBar, UiDataTable, UiEmpty, StageWorkbenchShell | — |
| 99 | `views/portfolio/teacher-lifecycle-admin.vue` | **OK** | UiDataTable, UiEmpty, StageWorkbenchShell | — |
| 100 | `views/portfolio/teacher-masterpiece.vue` | **OK** | PortfolioTeacherPickGate, ContextBar, UiEmpty, StageWorkbenchShell | — |
| 101 | `views/portfolio/teacher-materials.vue` | **OK** | PortfolioTeacherPickGate, ContextBar, UiDataTable, UiEmpty, StageWorkbenchShell | — |
| 102 | `views/portfolio/teacher-onboarding.vue` | **OK** | PortfolioTeacherPickGate, ContextBar, StageWorkbenchShell | — |
| 103 | `views/portfolio/teacher-one-table.vue` | **OK** | PortfolioTeacherPickGate, ContextBar, UiDataTable, UiEmpty, StageWorkbenchShell | — |
| 104 | `views/portfolio/teacher-pk-analytics.vue` | **OK** | ContextBar, UiDataTable, UiEmpty, UiAlertStrip, StageWorkbenchShell | — |
| 105 | `views/portfolio/teacher-portrait.vue` | **OK** | PortfolioTeacherPickGate, SignalBand, ContextBar, UiSectionTabs, UiEmpty, UiStatPanel +1 | — |
| 106 | `views/portfolio/teacher-privacy-consent.vue` | **OK** | ContextBar, StageWorkbenchShell | — |
| 107 | `views/portfolio/teacher-process-journal.vue` | **OK** | PortfolioTeacherPickGate, ContextBar, UiEmpty, UiAlertStrip, StageWorkbenchShell | — |
| 108 | `views/portfolio/teacher-profile.vue` | **OK** | PortfolioTeacherPickGate, ContextBar, UiDataTable, UiSectionTabs, UiEmpty, StageWorkbenchShell | — |
| 109 | `views/portfolio/teacher-recommendation-admin.vue` | **OK** | ContextBar, UiDataTable, UiSectionTabs, UiEmpty, StageWorkbenchShell | — |
| 110 | `views/portfolio/teacher-report-admin.vue` | **OK** | ContextBar, StageWorkbenchShell | — |
| 111 | `views/portfolio/teacher-review-status.vue` | **OK** | PortfolioTeacherPickGate, ContextBar, StageWorkbenchShell | — |
| 112 | `views/portfolio/teacher-salary-admin.vue` | **OK** | ContextBar, UiDataTable, UiEmpty, StageWorkbenchShell | — |
| 113 | `views/portfolio/teacher-teaching-philosophy.vue` | **OK** | PortfolioTeacherPickGate, ContextBar, UiDataTable, UiEmpty, StageWorkbenchShell | — |
| 114 | `views/portfolio/template-admin.vue` | **OK** | WorkbenchContextGateStrip, ContextBar, UiDataTable, UiEmpty, UiAlertStrip, StageWorkbenchShell | — |
| 115 | `views/portfolio/title-criteria-templates.vue` | **OK** | ContextBar, UiDataTable, StageWorkbenchShell | — |
| 116 | `views/portfolio/title-promotion-admin.vue` | **OK** | WorkbenchContextGateStrip, ContextBar, UiDataTable, UiSectionTabs, UiEmpty, StageWorkbenchShell | — |
| 117 | `views/portfolio/training-archive-admin.vue` | **OK** | ContextBar, UiDataTable, UiEmpty, StageWorkbenchShell | — |
| 118 | `views/public/portfolio-expert-review.vue` | **OK** | UiDataTable, UiEmpty | — |
| 119 | `views/quality/accreditation-cockpit.vue` | **OK** | QualityPlanGateStrip, SignalBand, ContextBar, QualityPageContextBar, UiSectionTabs, StageWorkbenchShell +1 | — |
| 120 | `views/quality/accreditation-standard.vue` | **OK** | WorkbenchContextGateStrip, SignalBand, UiDataTable, StageWorkbenchShell | — |
| 121 | `views/quality/achievement-detail.vue` | **OK** | WorkbenchContextGateStrip, SignalBand, ContextBar, UiDataTable, UiEmpty, StageWorkbenchShell | — |
| 122 | `views/quality/achievement.vue` | **OK** | QualityPlanGateStrip, SignalBand, ContextBar, QualityPageContextBar, UiDataTable, UiEmpty +1 | — |
| 123 | `views/quality/ai-mask-mapping.vue` | **OK** | UiEmpty, StageWorkbenchShell | — |
| 124 | `views/quality/ai-model-profile.vue` | **OK** | WorkbenchContextGateStrip, SignalBand, UiDataTable, UiEmpty, StageWorkbenchShell | — |
| 125 | `views/quality/ai-task.vue` | **OK** | QualityPlanGateStrip, SignalBand, ContextBar, QualityPageContextBar, UiDataTable, UiSectionTabs +3 | — |
| 126 | `views/quality/archive-destruction-ledger.vue` | **OK** | SignalBand, ContextBar, QualityPageContextBar, UiDataTable, StageWorkbenchShell | — |
| 127 | `views/quality/archive.vue` | **OK** | QualityPlanGateStrip, SignalBand, ContextBar, QualityPageContextBar, UiDataTable, UiSectionTabs +2 | — |
| 128 | `views/quality/components/ImportResponseDocumentModal.vue` | **OK** | UiEmpty, UiAlertStrip | — |
| 129 | `views/quality/components/indirect-evaluation/IndirectResponseReviewPanel.vue` | **OK** | UiDataTable, UiEmpty, UiAlertStrip | — |
| 130 | `views/quality/components/indirect-evaluation/IndirectSurveyTemplatePanel.vue` | **OK** | UiDataTable, UiAlertStrip | — |
| 131 | `views/quality/components/indirect-evaluation/IndirectTaskDispatchPanel.vue` | **OK** | UiDataTable, UiAlertStrip | — |
| 132 | `views/quality/dashboard.vue` | **OK** | QualityPlanGateStrip, SignalBand, ContextBar, QualityPageContextBar, UiDataTable, UiEmpty +1 | — |
| 133 | `views/quality/external-pull.vue` | **OK** | WorkbenchContextGateStrip, SignalBand, UiDataTable, UiEmpty | — |
| 134 | `views/quality/help/indirect-weighted-attainment.vue` | **OK** | ContextBar, StageWorkbenchShell | — |
| 135 | `views/quality/improvement-workbench.vue` | **OK** | QualityPlanGateStrip, SignalBand, ContextBar, QualityPageContextBar, UiSectionTabs, UiEmpty +1 | — |
| 136 | `views/quality/indirect-evaluation.vue` | **OK** | QualityPlanGateStrip, SignalBand, ContextBar, QualityPageContextBar | — |
| 137 | `views/quality/process-evaluation.vue` | **OK** | QualityPlanGateStrip, SignalBand, ContextBar, QualityPageContextBar, UiDataTable, UiEmpty +1 | — |
| 138 | `views/quality/profession-algorithm-profile.vue` | **OK** | WorkbenchContextGateStrip, SignalBand, UiDataTable, StageWorkbenchShell | — |
| 139 | `views/quality/profession-algorithm-template.vue` | **OK** | WorkbenchContextGateStrip, SignalBand, UiDataTable, StageWorkbenchShell | — |
| 140 | `views/quality/program-evaluation-profile.vue` | **OK** | WorkbenchContextGateStrip, SignalBand, UiDataTable, StageWorkbenchShell | — |
| 141 | `views/quality/quality-course-matrix.vue` | **OK** | QualityPlanGateStrip, SignalBand, ContextBar, QualityPageContextBar, UiDataTable, UiEmpty +2 | — |
| 142 | `views/quality/quality-ingest-hub-layout.vue` | **OK** | QualityPlanGateStrip, ContextBar, QualityPageContextBar, UiSectionTabs | — |
| 143 | `views/quality/quality-workspace-layout.vue` | **OK** | QualityScopeChrome | — |
| 144 | `views/quality/rationality-audit.vue` | **OK** | QualityPlanGateStrip, ContextBar, QualityPageContextBar, UiDataTable, UiEmpty, StageWorkbenchShell | — |
| 145 | `views/quality/report.vue` | **OK** | QualityPlanGateStrip, SignalBand, ContextBar, QualityPageContextBar, UiDataTable, UiEmpty +1 | — |
| 146 | `views/quality/scale-conversion-rule.vue` | **OK** | WorkbenchContextGateStrip, SignalBand, ContextBar, UiDataTable, StageWorkbenchShell | — |
| 147 | `views/quality/score-batch.vue` | **OK** | QualityPlanGateStrip, SignalBand, ContextBar, QualityPageContextBar, UiDataTable, UiEmpty | — |
| 148 | `views/quality/score-record.vue` | **OK** | QualityPlanGateStrip, SignalBand, ContextBar, QualityPageContextBar, UiDataTable, UiEmpty +1 | — |
| 149 | `views/quality/training-plan-review-queue.vue` | **OK** | ContextBar, QualityPageContextBar, UiDataTable, UiEmpty, UiAlertStrip, StageWorkbenchShell | — |
| 150 | `views/quality/training-plan-workbench.vue` | **OK** | SignalBand, ContextBar, QualityPageContextBar, UiDataTable, UiEmpty, UiAlertStrip +1 | — |
| 151 | `views/scanner-kiosk/TaskKindHub.vue` | **OK** | SignalBand, UiEmpty, UiAlertStrip | — |
| 152 | `views/scanner-kiosk/components/KioskArchivePickPanel.vue` | **OK** | UiDataTable, WorkbenchSurfaceCard | — |
| 153 | `views/scanner-kiosk/components/KioskPortfolioGapPickPanel.vue` | **OK** | UiDataTable, WorkbenchSurfaceCard | — |
| 154 | `views/scanner-kiosk/stages/ReviewStage.vue` | **OK** | UiAlertStrip | — |
| 155 | `views/scanner-kiosk/stages/SetupStage.vue` | **OK** | UiAlertStrip | — |
| 156 | `views/student/appeal.vue` | **OK** | ContextBar, UiDataTable, UiEmpty, StageWorkbenchShell, WorkbenchSurfaceCard | — |
| 157 | `views/student/exam-history.vue` | **OK** | ContextBar, UiDataTable, StageWorkbenchShell, WorkbenchSurfaceCard | — |
| 158 | `views/student/score-detail.vue` | **OK** | ContextBar, UiDataTable, UiEmpty, UiAlertStrip, StageWorkbenchShell, WorkbenchSurfaceCard | — |
| 159 | `views/student/score.vue` | **OK** | SignalBand, ContextBar, UiDataTable, StageWorkbenchShell, WorkbenchSurfaceCard | — |
| 160 | `views/teacher/absence-confirm.vue` | **OK** | ExamSelectGateStrip, SignalBand, ContextBar, UiDataTable, UiAlertStrip, StageWorkbenchShell +1 | — |
| 161 | `views/teacher/ai-analysis-center.vue` | **OK** | SignalBand, ContextBar, UiSectionTabs, UiEmpty, StageWorkbenchShell, WorkbenchSurfaceCard | — |
| 162 | `views/teacher/ai-analysis/AiAnalysisClusterWorkbench.vue` | **OK** | SignalBand | — |
| 163 | `views/teacher/ai-analysis/cards/CourseAchievementCard.vue` | **OK** | SignalBand, UiStatPanel | — |
| 164 | `views/teacher/ai-analysis/cards/ExamQuestionCourseGoalMappingTable.vue` | **OK** | SignalBand, UiDataTable | — |
| 165 | `views/teacher/ai-analysis/cards/ExperienceEffectivenessCard.vue` | **OK** | SignalBand, UiDataTable | — |
| 166 | `views/teacher/ai-analysis/cards/PaperQualityCard.vue` | **OK** | SignalBand | — |
| 167 | `views/teacher/ai-analysis/cards/QuestionAnalysisCard.vue` | **OK** | UiDataTable, UiAlertStrip | — |
| 168 | `views/teacher/ai-analysis/cards/QuestionAnswerCorrectionDialog.vue` | **OK** | UiAlertStrip | — |
| 169 | `views/teacher/ai-analysis/cards/RejudgePlanCard.vue` | **OK** | UiDataTable, UiAlertStrip | — |
| 170 | `views/teacher/ai-analysis/cards/SchoolQualityCard.vue` | **OK** | SignalBand, UiStatPanel | — |
| 171 | `views/teacher/ai-analysis/cards/ScoreDistributionCard.vue` | **OK** | SignalBand, WorkbenchSurfaceCard | — |
| 172 | `views/teacher/appeal-handle.vue` | **OK** | ExamSelectGateStrip, SignalBand, ContextBar, UiSectionTabs, StageWorkbenchShell | — |
| 173 | `views/teacher/appeal-handle/BatchCorrectionPlansCard.vue` | **OK** | UiDataTable, UiAlertStrip, WorkbenchSurfaceCard | — |
| 174 | `views/teacher/appeal-handle/CorrectionsCard.vue` | **OK** | UiDataTable, UiAlertStrip, WorkbenchSurfaceCard | — |
| 175 | `views/teacher/appeal-handle/ReviewRequestsCard.vue` | **OK** | UiDataTable, UiAlertStrip, WorkbenchSurfaceCard | — |
| 176 | `views/teacher/appeal-handle/ReviewWindowPolicyCard.vue` | **OK** | WorkbenchSurfaceCard | — |
| 177 | `views/teacher/archive-platform-template-admin.vue` | **OK** | ContextBar, UiDataTable, UiEmpty, StageWorkbenchShell, WorkbenchSurfaceCard | — |
| 178 | `views/teacher/archive-volume-detail-layout.vue` | **OK** | WorkbenchContextGateStrip | — |
| 179 | `views/teacher/archive-volume-search.vue` | **OK** | SignalBand, ContextBar, UiDataTable, StageWorkbenchShell, WorkbenchSurfaceCard | — |
| 180 | `views/teacher/archive-volume/archive-task-create/archive-task-create.vue` | **OK** | UiAlertStrip | — |
| 181 | `views/teacher/archive-volume/archive-volume-access-pending.vue` | **OK** | ContextBar, UiEmpty, StageWorkbenchShell, WorkbenchSurfaceCard | — |
| 182 | `views/teacher/archive-volume/archive-volume-audit.vue` | **OK** | SignalBand, ContextBar, UiDataTable, UiEmpty, StageWorkbenchShell, WorkbenchSurfaceCard | — |
| 183 | `views/teacher/archive-volume/archive-volume-batch-register-modal.vue` | **OK** | UiDataTable, UiAlertStrip | — |
| 184 | `views/teacher/archive-volume/archive-volume-course-sync-modal.vue` | **OK** | UiDataTable, WorkbenchSurfaceCard | — |
| 185 | `views/teacher/archive-volume/archive-volume-detail.vue` | **OK** | ContextBar, UiEmpty, UiAlertStrip, WorkbenchSurfaceCard | — |
| 186 | `views/teacher/archive-volume/archive-volume-eval-campaign.vue` | **OK** | SignalBand, ContextBar, UiDataTable, UiSectionTabs, UiAlertStrip, StageWorkbenchShell +1 | — |
| 187 | `views/teacher/archive-volume/archive-volume-exam-progress.vue` | **OK** | ExamSelectGateStrip, SignalBand, ContextBar, UiDataTable, UiEmpty, UiAlertStrip +2 | — |
| 188 | `views/teacher/archive-volume/archive-volume-external-import-panel.vue` | **OK** | UiAlertStrip, WorkbenchSurfaceCard | — |
| 189 | `views/teacher/archive-volume/archive-volume-history-import-panel.vue` | **OK** | UiAlertStrip, WorkbenchSurfaceCard | — |
| 190 | `views/teacher/archive-volume/archive-volume-ledger.vue` | **OK** | SignalBand, ContextBar, UiDataTable, UiSectionTabs, UiEmpty, StageWorkbenchShell +1 | — |
| 191 | `views/teacher/archive-volume/archive-volume-list.vue` | **OK** | SignalBand, ContextBar, UiDataTable, UiSectionTabs, StageWorkbenchShell, WorkbenchSurfaceCard | — |
| 192 | `views/teacher/archive-volume/archive-volume-readiness-matrix.vue` | **OK** | SignalBand, ContextBar, UiDataTable, UiEmpty, UiAlertStrip, StageWorkbenchShell +1 | — |
| 193 | `views/teacher/archive-volume/archive-volume-remediation-detail.vue` | **OK** | SignalBand, ContextBar, UiDataTable, UiEmpty, StageWorkbenchShell, WorkbenchSurfaceCard | — |
| 194 | `views/teacher/archive-volume/archive-volume-remediation-panel.vue` | **OK** | UiEmpty, UiAlertStrip, WorkbenchSurfaceCard | — |
| 195 | `views/teacher/archive-volume/archive-volume-settings.vue` | **OK** | SignalBand, ContextBar, UiDataTable, UiSectionTabs, UiEmpty, StageWorkbenchShell +1 | — |
| 196 | `views/teacher/archive-volume/archive-volume-statistics.vue` | **OK** | SignalBand, ContextBar, UiDataTable, UiSectionTabs, UiEmpty, UiAlertStrip +2 | — |
| 197 | `views/teacher/archive-volume/archive-volume-supervision-panel.vue` | **OK** | SignalBand, UiDataTable, UiSectionTabs, UiEmpty, UiAlertStrip, WorkbenchSurfaceCard | — |
| 198 | `views/teacher/archive-volume/archive-volume-suspected-mixed-scan.vue` | **OK** | WorkbenchContextGateStrip, ContextBar, UiDataTable, StageWorkbenchShell, WorkbenchSurfaceCard | — |
| 199 | `views/teacher/archive-volume/components/ArchiveSetupGuideBanner.vue` | **OK** | UiAlertStrip | — |
| 200 | `views/teacher/archive-volume/components/ArchiveTemplateSetEditorDrawer.vue` | **OK** | UiSectionTabs | — |
| 201 | `views/teacher/archive-volume/components/ArchiveTemplateSetPreviewDrawer.vue` | **OK** | SignalBand, UiDataTable, UiSectionTabs, WorkbenchSurfaceCard | — |
| 202 | `views/teacher/archive-volume/components/ArchiveTemplateSortableTableShell.vue` | **OK** | UiDataTable | — |
| 203 | `views/teacher/archive-volume/components/ArchiveVolumeMineRemediationBanner.vue` | **OK** | UiAlertStrip | — |
| 204 | `views/teacher/archive-volume/components/ArchiveVolumeTemplateSetsPanel.vue` | **OK** | UiDataTable, UiSectionTabs, UiEmpty, UiAlertStrip, WorkbenchSurfaceCard | — |
| 205 | `views/teacher/archive-volume/components/DepartmentReviewListDrawer.vue` | **OK** | UiEmpty | — |
| 206 | `views/teacher/archive-volume/components/detail/ArchiveFlowContextBar.vue` | **OK** | ContextBar | — |
| 207 | `views/teacher/archive-volume/components/detail/ArchiveScanBatchReviewPanel.vue` | **OK** | UiDataTable, WorkbenchSurfaceCard | — |
| 208 | `views/teacher/archive-volume/components/detail/ArchiveScanBatchSnapshotPanel.vue` | **OK** | UiDataTable, WorkbenchSurfaceCard | — |
| 209 | `views/teacher/archive-volume/components/detail/ArchiveVolumeAccessPanel.vue` | **OK** | UiEmpty, WorkbenchSurfaceCard | — |
| 210 | `views/teacher/archive-volume/components/detail/ArchiveVolumeAppraisalPanel.vue` | **OK** | UiEmpty, UiAlertStrip, WorkbenchSurfaceCard | — |
| 211 | `views/teacher/archive-volume/components/detail/ArchiveVolumeCatalogEditor.vue` | **OK** | UiDataTable, UiEmpty, UiAlertStrip, WorkbenchSurfaceCard | — |
| 212 | `views/teacher/archive-volume/components/detail/ArchiveVolumeCatalogPreview.vue` | **OK** | UiEmpty | — |
| 213 | `views/teacher/archive-volume/components/detail/ArchiveVolumeEventsPanel.vue` | **OK** | WorkbenchSurfaceCard | — |
| 214 | `views/teacher/archive-volume/components/detail/ArchiveVolumeEventsTimeline.vue` | **OK** | UiEmpty | — |
| 215 | `views/teacher/archive-volume/components/detail/ArchiveVolumeIntegrityPanel.vue` | **OK** | UiDataTable, WorkbenchSurfaceCard | — |
| 216 | `views/teacher/archive-volume/components/detail/ArchiveVolumeMaterialOcrDetailContent.vue` | **OK** | UiSectionTabs, UiAlertStrip | — |
| 217 | `views/teacher/archive-volume/components/detail/ArchiveVolumeMaterialTablePanel.vue` | **OK** | UiDataTable, UiAlertStrip, WorkbenchSurfaceCard | — |
| 218 | `views/teacher/archive-volume/components/detail/ArchiveVolumeMaterialTreePanel.vue` | **OK** | UiEmpty, UiAlertStrip | — |
| 219 | `views/teacher/archive-volume/components/detail/ArchiveVolumeOcrSearchPanel.vue` | **OK** | UiDataTable, UiEmpty, UiAlertStrip, WorkbenchSurfaceCard | — |
| 220 | `views/teacher/archive-volume/components/detail/ArchiveVolumePhysicalLocationPanel.vue` | **OK** | WorkbenchSurfaceCard | — |
| 221 | `views/teacher/archive-volume/components/detail/ArchiveVolumeScoresPanel.vue` | **OK** | UiDataTable, WorkbenchSurfaceCard | — |
| 222 | `views/teacher/archive-volume/components/detail/ArchiveVolumeSelfCheckList.vue` | **OK** | WorkbenchContextGateStrip, UiAlertStrip, WorkbenchSurfaceCard | — |
| 223 | `views/teacher/archive-volume/components/detail/ArchiveVolumeSubmitChecklistModal.vue` | **OK** | UiEmpty, UiAlertStrip | — |
| 224 | `views/teacher/archive-volume/components/detail/ArchiveVolumeSubmitProgressBand.vue` | **OK** | WorkbenchSurfaceCard | — |
| 225 | `views/teacher/archive-volume/components/detail/ArchiveVolumeTransferPanel.vue` | **OK** | UiEmpty, UiAlertStrip, WorkbenchSurfaceCard | — |
| 226 | `views/teacher/archive-volume/components/detail/DepartmentReviewPanel.vue` | **OK** | UiEmpty, WorkbenchSurfaceCard | — |
| 227 | `views/teacher/archive-volume/components/detail/DigitalMaterialConfirmPanel.vue` | **OK** | WorkbenchSurfaceCard | — |
| 228 | `views/teacher/candidate-roster.vue` | **OK** | ExamSelectGateStrip, SignalBand, ContextBar, UiEmpty, UiAlertStrip, StageWorkbenchShell +1 | — |
| 229 | `views/teacher/exam-create/CandidateScopeStep.vue` | **OK** | UiDataTable, UiEmpty, UiAlertStrip | — |
| 230 | `views/teacher/exam-detail.vue` | **OK** | SignalBand, ContextBar, UiEmpty, StageWorkbenchShell | — |
| 231 | `views/teacher/exam-layout-designer.vue` | **OK** | ExamSelectGateStrip, SignalBand, ContextBar, UiEmpty, UiAlertStrip, StageWorkbenchShell +1 | — |
| 232 | `views/teacher/exam-list.vue` | **OK** | SignalBand, ContextBar, UiDataTable, UiSectionTabs, UiEmpty, UiAlertStrip +2 | — |
| 233 | `views/teacher/exam-prep-workbench.vue` | **OK** | ExamSelectGateStrip, SignalBand, ContextBar, UiEmpty, UiAlertStrip, StageWorkbenchShell | — |
| 234 | `views/teacher/exam-workspace-layout.vue` | **OK** | ExamSelectGateStrip, ContextBar, UiEmpty, UiAlertStrip | — |
| 235 | `views/teacher/exam-workspace/ExamWorkbenchOverviewDashboard.vue` | **OK** | WorkbenchSurfaceCard | — |
| 236 | `views/teacher/exam-workspace/exam-workspace-question-analysis.vue` | **OK** | ExamSelectGateStrip, ContextBar, UiSectionTabs, UiEmpty, StageWorkbenchShell, WorkbenchSurfaceCard | — |
| 237 | `views/teacher/exam-workspace/marking-experience-assist-policy.vue` | **OK** | ExamSelectGateStrip, UiDataTable, UiEmpty, UiAlertStrip, StageWorkbenchShell, WorkbenchSurfaceCard | — |
| 238 | `views/teacher/exam-workspace/marking-progress-dashboard.vue` | **OK** | ExamSelectGateStrip, WorkbenchContextGateStrip, SignalBand, ContextBar, UiDataTable, UiEmpty +2 | — |
| 239 | `views/teacher/grading-experience-hub.vue` | **OK** | ExamSelectGateStrip, SignalBand, UiDataTable, UiSectionTabs, UiEmpty, UiAlertStrip +2 | — |
| 240 | `views/teacher/image-ledger.vue` | **OK** | ExamSelectGateStrip, SignalBand, ContextBar, UiEmpty, StageWorkbenchShell, WorkbenchSurfaceCard | — |
| 241 | `views/teacher/image-ledger/DuplicateResolutionCard.vue` | **OK** | UiDataTable | — |
| 242 | `views/teacher/image-ledger/LedgerSummaryCard.vue` | **OK** | SignalBand, UiAlertStrip | — |
| 243 | `views/teacher/marking-overview.vue` | **OK** | SignalBand, ContextBar, UiSectionTabs, UiEmpty, StageWorkbenchShell, WorkbenchSurfaceCard | — |
| 244 | `views/teacher/marking-spot-check.vue` | **OK** | ExamSelectGateStrip, SignalBand, ContextBar, UiDataTable, UiEmpty, StageWorkbenchShell +1 | — |
| 245 | `views/teacher/marking-task-detail.vue` | **OK** | WorkbenchContextGateStrip, UiAlertStrip | — |
| 246 | `views/teacher/marking-task-pool.vue` | **OK** | ExamSelectGateStrip, SignalBand, ContextBar, UiDataTable, UiEmpty, UiAlertStrip +2 | — |
| 247 | `views/teacher/ocr-settings.vue` | **OK** | ExamSelectGateStrip, WorkbenchContextGateStrip, SignalBand, ContextBar, UiDataTable, UiEmpty +3 | — |
| 248 | `views/teacher/print-package.vue` | **OK** | ExamSelectGateStrip, SignalBand, ContextBar, UiDataTable, UiEmpty, StageWorkbenchShell +1 | — |
| 249 | `views/teacher/printer-management.vue` | **OK** | SignalBand, ContextBar, UiDataTable, StageWorkbenchShell, WorkbenchSurfaceCard | — |
| 250 | `views/teacher/review-arbitration.vue` | **OK** | ExamSelectGateStrip, SignalBand, ContextBar, UiDataTable, UiSectionTabs, StageWorkbenchShell +1 | — |
| 251 | `views/teacher/review-batch-confirm.vue` | **OK** | ExamSelectGateStrip, SignalBand, ContextBar, UiDataTable, UiEmpty, StageWorkbenchShell +1 | — |
| 252 | `views/teacher/review-progress.vue` | **OK** | ExamSelectGateStrip, SignalBand, ContextBar, UiDataTable, UiEmpty, UiStatPanel +2 | — |
| 253 | `views/teacher/review-task-detail.vue` | **OK** | WorkbenchContextGateStrip, UiEmpty | — |
| 254 | `views/teacher/review-task-hub.vue` | **OK** | ExamSelectGateStrip, SignalBand, ContextBar, UiDataTable, UiEmpty, StageWorkbenchShell +1 | — |
| 255 | `views/teacher/review-workspace.vue` | **OK** | ExamSelectGateStrip, UiEmpty, UiAlertStrip | — |
| 256 | `views/teacher/scan-batch-detail-workbench.vue` | **OK** | ExamSelectGateStrip, SignalBand, ContextBar, UiDataTable, UiSectionTabs, UiEmpty +3 | — |
| 257 | `views/teacher/scan-batch-workbench.vue` | **OK** | ExamSelectGateStrip, SignalBand, ContextBar, UiDataTable, UiSectionTabs, UiEmpty +3 | — |
| 258 | `views/teacher/scan-live-monitor.vue` | **OK** | ExamSelectGateStrip, SignalBand, ContextBar, UiDataTable, UiSectionTabs, UiEmpty +3 | — |
| 259 | `views/teacher/scan-manual-entry.vue` | **OK** | ExamSelectGateStrip, SignalBand, ContextBar, UiDataTable, UiSectionTabs, UiEmpty +3 | — |
| 260 | `views/teacher/scanner-agent-releases.vue` | **OK** | SignalBand, ContextBar, UiDataTable, UiEmpty, StageWorkbenchShell, WorkbenchSurfaceCard | — |
| 261 | `views/teacher/score-finalize.vue` | **OK** | ExamSelectGateStrip, ScoreAnalyticsStatusFlow, ScoreReleaseStepPipeline, SignalBand, ContextBar, UiDataTable +5 | — |
| 262 | `views/teacher/score-publish.vue` | **OK** | ExamSelectGateStrip, ScoreAnalyticsStatusFlow, ScoreReleaseStepPipeline, SignalBand, ContextBar, UiDataTable +5 | — |
| 263 | `views/teacher/statistics.vue` | **OK** | ExamSelectGateStrip, SignalBand, UiSectionTabs, UiAlertStrip, StageWorkbenchShell, WorkbenchSurfaceCard | — |
| 264 | `views/user/message/index.vue` | **OK** | ContextBar, UiSectionTabs, UiEmpty, StageWorkbenchShell | — |
| 265 | `views/user/profile/index.vue` | **OK** | ContextBar, StageWorkbenchShell | — |
