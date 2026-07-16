# 存活组件三 Skill 全量审查 · BATCH_27

> **范围**：`src/components` 磁盘存活 **252** 件（2026-07-16）  
> **方法**：Impeccable（product 工作台）· Finesse（DENSITY 8 / SPECTACLE 2）· Taste（audit-only 3/2/8）  
> **门禁**：frontend-design-mark — `#1677ff`、永久浅色、`--dp-*`、Ui*、三域侧栏不拆  
> **禁止**：脚本模板结论；营销/暗色/Geist；冷启动全量 d.ts regen  
> **真源**：本文件 + 既有 BATCH_01–26 深审；冲突以本文件手核为准  

## Design Read

Reading this as: **regulated Chinese HE teaching-portfolio + OBE quality + exam marking workbench** for faculty/dept admins in daylight office sessions, **trust-first / evidence-chain / high-density**, Finesse product substrate under mark shells — **not** brand landing or student ePortfolio marketing.

## 分布

| 判定 | 数量 |
|------|-----:|
| **OK** | 202 |
| **TUNE** | 38 |
| **REWORK** | 5 |
| **SHELL** | 7 |
| **合计** | 252 |

## 全表（每组件三 Skill）

| # | 判定 | path | Impeccable | Finesse | Taste (audit-only) | 来源 |
|--:|------|------|------------|---------|-------------------|------|
| 1 | **OK** | `components/AiEditor/index.vue` | 可编辑/只读 v-model；上传走 stageBusinessFile；失败不静默 | 编辑器容器可聚焦；配置 createOptimizedAiEditorConfig | 非营销编辑器皮肤；禁暗色写作台 | BATCH_18+TRI27 |
| 2 | **OK** | `components/AjCaptcha/index.vue` | 安全验证 loading/失败/刷新齐全；mask 不点穿 | 滑块/拼图可完成；宽度 340 紧凑 | 登录门禁控件非品牌 show | BATCH_18+TRI27 |
| 3 | **TUNE** | `components/AuthLayout/index.vue` | 登录壳品牌+表单槽完整 | wide 模式可承载 CAS | 能力云文案偏营销 landing；登录域可保留克制品牌，禁再加渐变/Awwwards | BATCH_18+TRI27 |
| 4 | **OK** | `components/Breadcrumb/index.vue` | 路由面包屑；末级不可点 | 可点击上级跳转 | 系统导航非装饰 | BATCH_18+TRI27 |
| 5 | **OK** | `components/FilePreviewDialog.vue` | 预览开/关/失败态；hide-footer 对话框 | 多格式预览可完成 | UiDialog 壳；禁暗色阅读器 | BATCH_17+TRI27 |
| 6 | **TUNE** | `components/GiCell/GiCellAvatar.vue` | 图/字头像失败回落；link 点击 | 表格单元格体积偏大可再压 | 禁装饰光晕；色走 token | BATCH_19+TRI27 |
| 7 | **OK** | `components/SchoolAutocomplete.vue` | 学校检索选值合同 | 登录/CAS 可选校 | 表单控件非营销 | BATCH_22+TRI27 |
| 8 | **OK** | `components/UiErrorBoundary.vue` | onErrorCaptured→内嵌错误+message；路由切换复位；禁整页 404 跳 | 失败可刷新恢复 | 无装饰错误插画 | BATCH_22+TRI27 |
| 9 | **OK** | `components/archive-volume/ArchiveDimPill.vue` | ArchiveDimPill：归档态/门禁/进度信息可解释 | 在卷工作台内可完成扫读 | 浅色工作台；禁监控暗色 | BATCH_17 |
| 10 | **OK** | `components/archive-volume/ArchiveEvalCampaignScopeSummary.vue` | ArchiveEvalCampaignScopeSummary：归档态/门禁/进度信息可解释 | 在卷工作台内可完成扫读 | 浅色工作台；禁监控暗色 | BATCH_20 |
| 11 | **OK** | `components/archive-volume/ArchiveExamAutoCreateStatus.vue` | ArchiveExamAutoCreateStatus：归档态/门禁/进度信息可解释 | 在卷工作台内可完成扫读 | 浅色工作台；禁监控暗色 | BATCH_20 |
| 12 | **OK** | `components/archive-volume/ArchiveExamExportTasksCard.vue` | ArchiveExamExportTasksCard：归档态/门禁/进度信息可解释 | 在卷工作台内可完成扫读 | 浅色工作台；禁监控暗色 | BATCH_20 |
| 13 | **OK** | `components/archive-volume/ArchiveExamScoreGatePanel.vue` | ArchiveExamScoreGatePanel：归档态/门禁/进度信息可解释 | 在卷工作台内可完成扫读 | 浅色工作台；禁监控暗色 | BATCH_20 |
| 14 | **OK** | `components/archive-volume/ArchiveLifecyclePipe.vue` | ArchiveLifecyclePipe：归档态/门禁/进度信息可解释 | 在卷工作台内可完成扫读 | 浅色工作台；禁监控暗色 | BATCH_17 |
| 15 | **OK** | `components/archive-volume/ArchiveLifecyclePipeTrack.vue` | ArchiveLifecyclePipeTrack：归档态/门禁/进度信息可解释 | 在卷工作台内可完成扫读 | 浅色工作台；禁监控暗色 | BATCH_20 |
| 16 | **OK** | `components/archive-volume/ArchivePackageTimeline.vue` | ArchivePackageTimeline：归档态/门禁/进度信息可解释 | 在卷工作台内可完成扫读 | 浅色工作台；禁监控暗色 | BATCH_20 |
| 17 | **OK** | `components/archive-volume/ArchiveReadinessRateBar.vue` | ArchiveReadinessRateBar：归档态/门禁/进度信息可解释 | 在卷工作台内可完成扫读 | 浅色工作台；禁监控暗色 | BATCH_17 |
| 18 | **OK** | `components/archive-volume/ExamArchiveGateBanner.vue` | ExamArchiveGateBanner：归档态/门禁/进度信息可解释 | 在卷工作台内可完成扫读 | 浅色工作台；禁监控暗色 | BATCH_20 |
| 19 | **OK** | `components/chart/MarkBarSection.vue` | MarkBarSection：空/加载/有数；主题色默认品牌 | 图区可读；与父卡摘要不重复职责 | 系列色走语义非装饰渐变；禁 Awwwards 图卡 | BATCH_17 |
| 20 | **OK** | `components/chart/MarkChart.vue` | MarkChart：空/加载/有数；主题色默认品牌 | 图区可读；与父卡摘要不重复职责 | 系列色走语义非装饰渐变；禁 Awwwards 图卡 | BATCH_03 |
| 21 | **TUNE** | `components/chart/MarkChartCard.vue` | MarkChartCard：空/加载/有数；主题色默认品牌 | 图区可读；与父卡摘要不重复职责 | 系列色走语义非装饰渐变；禁 Awwwards 图卡 | BATCH_17 |
| 22 | **OK** | `components/chart/MarkDistributionSection.vue` | MarkDistributionSection：空/加载/有数；主题色默认品牌 | 图区可读；与父卡摘要不重复职责 | 系列色走语义非装饰渐变；禁 Awwwards 图卡 | BATCH_17 |
| 23 | **OK** | `components/chart/MarkGaugeBlock.vue` | MarkGaugeBlock：空/加载/有数；主题色默认品牌 | 图区可读；与父卡摘要不重复职责 | 系列色走语义非装饰渐变；禁 Awwwards 图卡 | BATCH_17 |
| 24 | **OK** | `components/chart/MarkHeatmapSection.vue` | MarkHeatmapSection：空/加载/有数；主题色默认品牌 | 图区可读；与父卡摘要不重复职责 | 系列色走语义非装饰渐变；禁 Awwwards 图卡 | BATCH_17 |
| 25 | **OK** | `components/chart/MarkScatterSection.vue` | MarkScatterSection：空/加载/有数；主题色默认品牌 | 图区可读；与父卡摘要不重复职责 | 系列色走语义非装饰渐变；禁 Awwwards 图卡 | BATCH_17 |
| 26 | **OK** | `components/chart/MarkTrendSection.vue` | MarkTrendSection：空/加载/有数；主题色默认品牌 | 图区可读；与父卡摘要不重复职责 | 系列色走语义非装饰渐变；禁 Awwwards 图卡 | BATCH_17 |
| 27 | **OK** | `components/create-form/CreateFormPageShell.vue` | CreateFormPageShell（共享组件）：业务输入输出与状态完整 | 在所属工作台可完成主路径 | 服从 mark-vue 浅色与 Ui* 门禁 | FORCE |
| 28 | **OK** | `components/edu/ClassStudentTreeSelectorDrawer.vue` | ClassStudentTreeSelectorDrawer（共享组件）：业务输入输出与状态完整 | 在所属工作台可完成主路径 | 服从 mark-vue 浅色与 Ui* 门禁 | BATCH_19 |
| 29 | **OK** | `components/evaluation/EvaluationWorkgroupPage.vue` | EvaluationWorkgroupPage（共享组件）：业务输入输出与状态完整 | 在所属工作台可完成主路径 | 服从 mark-vue 浅色与 Ui* 门禁 | BATCH_19 |
| 30 | **OK** | `components/exam-workbench/ExamCandidatePaperImagesDrawer.vue` | ExamCandidatePaperImagesDrawer（共享组件）：业务输入输出与状态完整 | 在所属工作台可完成主路径 | 服从 mark-vue 浅色与 Ui* 门禁 | BATCH_16 |
| 31 | **OK** | `components/exam-workbench/ExamCandidateWorkbenchTable.vue` | ExamCandidateWorkbenchTable（共享组件）：业务输入输出与状态完整 | 在所属工作台可完成主路径 | 服从 mark-vue 浅色与 Ui* 门禁 | BATCH_16 |
| 32 | **OK** | `components/export/ExportTaskCenter.vue` | ExportTaskCenter（共享组件）：业务输入输出与状态完整 | 在所属工作台可完成主路径 | 服从 mark-vue 浅色与 Ui* 门禁 | BATCH_20 |
| 33 | **OK** | `components/mark/AnalysisExamMultiSelect.vue` | AnalysisExamMultiSelect：阅卷业务态完整（权限/空/错） | 批改/扫描路径可完成 | 浅色；禁 AI 自动写分装饰 | BATCH_19 |
| 34 | **TUNE** | `components/mark/AnalysisExamSelect.vue` | AnalysisExamSelect：阅卷业务态完整（权限/空/错） | 批改/扫描路径可完成 | 浅色；禁 AI 自动写分装饰 | BATCH_20 |
| 35 | **OK** | `components/mark/ApplyScoreToRemainingModal.vue` | ApplyScoreToRemainingModal：阅卷业务态完整（权限/空/错） | 批改/扫描路径可完成 | 浅色；禁 AI 自动写分装饰 | BATCH_20 |
| 36 | **OK** | `components/mark/ArchiveDutyUserSelect.vue` | ArchiveDutyUserSelect：阅卷业务态完整（权限/空/错） | 批改/扫描路径可完成 | 浅色；禁 AI 自动写分装饰 | BATCH_19 |
| 37 | **TUNE** | `components/mark/ConfidentialStatusBar.vue` | ConfidentialStatusBar：阅卷业务态完整（权限/空/错） | 批改/扫描路径可完成 | 浅色；禁 AI 自动写分装饰 | BATCH_17 |
| 38 | **OK** | `components/mark/ConfidentialWatermarkLayer.vue` | ConfidentialWatermarkLayer：阅卷业务态完整（权限/空/错） | 批改/扫描路径可完成 | 浅色；禁 AI 自动写分装饰 | BATCH_19 |
| 39 | **OK** | `components/mark/ExamExperienceAssistPolicyEnableModal.vue` | ExamExperienceAssistPolicyEnableModal：阅卷业务态完整（权限/空/错） | 批改/扫描路径可完成 | 浅色；禁 AI 自动写分装饰 | BATCH_20 |
| 40 | **OK** | `components/mark/ExperienceAssistBadge.vue` | ExperienceAssistBadge：阅卷业务态完整（权限/空/错） | 批改/扫描路径可完成 | 浅色；禁 AI 自动写分装饰 | BATCH_19 |
| 41 | **OK** | `components/mark/GradingImmersionChrome.vue` | GradingImmersionChrome：阅卷业务态完整（权限/空/错） | 批改/扫描路径可完成 | 浅色；禁 AI 自动写分装饰 | BATCH_04 |
| 42 | **OK** | `components/mark/GradingImmersionSection.vue` | GradingImmersionSection：阅卷业务态完整（权限/空/错） | 批改/扫描路径可完成 | 浅色；禁 AI 自动写分装饰 | BATCH_19 |
| 43 | **OK** | `components/mark/GradingWorkspaceLayout.vue` | GradingWorkspaceLayout：阅卷业务态完整（权限/空/错） | 批改/扫描路径可完成 | 浅色；禁 AI 自动写分装饰 | BATCH_04 |
| 44 | **TUNE** | `components/mark/MarkExamSelect.vue` | MarkExamSelect：阅卷业务态完整（权限/空/错） | 批改/扫描路径可完成 | 浅色；禁 AI 自动写分装饰 | BATCH_19 |
| 45 | **OK** | `components/mark/MarkScoreTriple.vue` | MarkScoreTriple：阅卷业务态完整（权限/空/错） | 批改/扫描路径可完成 | 浅色；禁 AI 自动写分装饰 | BATCH_17 |
| 46 | **OK** | `components/mark/MarkingAiAssistDrawer.vue` | MarkingAiAssistDrawer：阅卷业务态完整（权限/空/错） | 批改/扫描路径可完成 | 浅色；禁 AI 自动写分装饰 | BATCH_17 |
| 47 | **OK** | `components/mark/MarkingBatchScoreDrawer.vue` | MarkingBatchScoreDrawer：阅卷业务态完整（权限/空/错） | 批改/扫描路径可完成 | 浅色；禁 AI 自动写分装饰 | BATCH_18 |
| 48 | **OK** | `components/mark/MarkingQuestionViewCard.vue` | MarkingQuestionViewCard：阅卷业务态完整（权限/空/错） | 批改/扫描路径可完成 | 浅色；禁 AI 自动写分装饰 | BATCH_21 |
| 49 | **OK** | `components/mark/MarkingScanMaterialPanel.vue` | MarkingScanMaterialPanel：阅卷业务态完整（权限/空/错） | 批改/扫描路径可完成 | 浅色；禁 AI 自动写分装饰 | BATCH_19 |
| 50 | **TUNE** | `components/mark/MarkingScorePanel.vue` | MarkingScorePanel：阅卷业务态完整（权限/空/错） | 批改/扫描路径可完成 | 浅色；禁 AI 自动写分装饰 | FORCE |
| 51 | **OK** | `components/mark/MarkingTaskInfoCard.vue` | MarkingTaskInfoCard：阅卷业务态完整（权限/空/错） | 批改/扫描路径可完成 | 浅色；禁 AI 自动写分装饰 | BATCH_21 |
| 52 | **OK** | `components/mark/MarkingTaskToolbar.vue` | MarkingTaskToolbar：阅卷业务态完整（权限/空/错） | 批改/扫描路径可完成 | 浅色；禁 AI 自动写分装饰 | BATCH_21 |
| 53 | **OK** | `components/mark/QuestionExperienceAssistBindingModal.vue` | QuestionExperienceAssistBindingModal：阅卷业务态完整（权限/空/错） | 批改/扫描路径可完成 | 浅色；禁 AI 自动写分装饰 | BATCH_21 |
| 54 | **OK** | `components/mark/RevealAnonymousModal.vue` | RevealAnonymousModal：阅卷业务态完整（权限/空/错） | 批改/扫描路径可完成 | 浅色；禁 AI 自动写分装饰 | BATCH_21 |
| 55 | **OK** | `components/mark/ScanBatchDiscardDialog.vue` | ScanBatchDiscardDialog：阅卷业务态完整（权限/空/错） | 批改/扫描路径可完成 | 浅色；禁 AI 自动写分装饰 | BATCH_21 |
| 56 | **OK** | `components/mark/ScanBatchPageInspectorPanel.vue` | ScanBatchPageInspectorPanel：阅卷业务态完整（权限/空/错） | 批改/扫描路径可完成 | 浅色；禁 AI 自动写分装饰 | BATCH_21 |
| 57 | **OK** | `components/mark/ScanBatchPageRail.vue` | ScanBatchPageRail：阅卷业务态完整（权限/空/错） | 批改/扫描路径可完成 | 浅色；禁 AI 自动写分装饰 | BATCH_21 |
| 58 | **OK** | `components/mark/ScanBatchSupplementModal.vue` | ScanBatchSupplementModal：阅卷业务态完整（权限/空/错） | 批改/扫描路径可完成 | 浅色；禁 AI 自动写分装饰 | BATCH_21 |
| 59 | **TUNE** | `components/mark/ScanDeviceCardGrid.vue` | ScanDeviceCardGrid：阅卷业务态完整（权限/空/错） | 批改/扫描路径可完成 | 浅色；禁 AI 自动写分装饰 | BATCH_18 |
| 60 | **OK** | `components/mark/ScanImageStage.vue` | ScanImageStage：阅卷业务态完整（权限/空/错） | 批改/扫描路径可完成 | 浅色；禁 AI 自动写分装饰 | BATCH_05 |
| 61 | **OK** | `components/mark/ScanOrphanRecoveryAlert.vue` | ScanOrphanRecoveryAlert：阅卷业务态完整（权限/空/错） | 批改/扫描路径可完成 | 浅色；禁 AI 自动写分装饰 | BATCH_21 |
| 62 | **TUNE** | `components/mark/WholePaperGallery.vue` | WholePaperGallery：阅卷业务态完整（权限/空/错） | 批改/扫描路径可完成 | 浅色；禁 AI 自动写分装饰 | BATCH_21 |
| 63 | **OK** | `components/mark/analysis/AiAnalysisCardBody.vue` | AiAnalysisCardBody：分析范围/结果态可辨；AI 草稿边界 | 分析簇可操作不空转 | 无英文 eyebrow 营销分析卡 | BATCH_19 |
| 64 | **OK** | `components/mark/analysis/AiAnalysisCardShell.vue` | AiAnalysisCardShell：分析范围/结果态可辨；AI 草稿边界 | 分析簇可操作不空转 | 无英文 eyebrow 营销分析卡 | BATCH_19 |
| 65 | **SHELL** | `components/mark/analysis/AiAnalysisExamScopePanel.vue` | AiAnalysisExamScopePanel：分析范围/结果态可辨；AI 草稿边界 | 分析簇可操作不空转 | 无英文 eyebrow 营销分析卡 | BATCH_19 |
| 66 | **OK** | `components/mark/analysis/AiAnalysisHistorySelect.vue` | AiAnalysisHistorySelect：分析范围/结果态可辨；AI 草稿边界 | 分析簇可操作不空转 | 无英文 eyebrow 营销分析卡 | BATCH_19 |
| 67 | **OK** | `components/mark/analysis/AiAnalysisMetaCollapse.vue` | AiAnalysisMetaCollapse：分析范围/结果态可辨；AI 草稿边界 | 分析簇可操作不空转 | 无英文 eyebrow 营销分析卡 | BATCH_18 |
| 68 | **SHELL** | `components/mark/analysis/AiAnalysisOrgTermScopePanel.vue` | AiAnalysisOrgTermScopePanel：分析范围/结果态可辨；AI 草稿边界 | 分析簇可操作不空转 | 无英文 eyebrow 营销分析卡 | BATCH_19 |
| 69 | **OK** | `components/mark/analysis/AiAnalysisScopeFilterBar.vue` | AiAnalysisScopeFilterBar：分析范围/结果态可辨；AI 草稿边界 | 分析簇可操作不空转 | 无英文 eyebrow 营销分析卡 | BATCH_19 |
| 70 | **OK** | `components/mark/analysis/AiAnalysisSection.vue` | AiAnalysisSection：分析范围/结果态可辨；AI 草稿边界 | 分析簇可操作不空转 | 无英文 eyebrow 营销分析卡 | BATCH_19 |
| 71 | **OK** | `components/mark/analysis/AiClusterTile.vue` | AiClusterTile：分析范围/结果态可辨；AI 草稿边界 | 分析簇可操作不空转 | 无英文 eyebrow 营销分析卡 | BATCH_20 |
| 72 | **OK** | `components/mark/analysis/AiObjectiveProgressRow.vue` | AiObjectiveProgressRow：分析范围/结果态可辨；AI 草稿边界 | 分析簇可操作不空转 | 无英文 eyebrow 营销分析卡 | BATCH_20 |
| 73 | **OK** | `components/mark/analysis/AiRecommendationBlock.vue` | AiRecommendationBlock：分析范围/结果态可辨；AI 草稿边界 | 分析簇可操作不空转 | 无英文 eyebrow 营销分析卡 | BATCH_20 |
| 74 | **OK** | `components/mark/analysis/AiWeaknessRow.vue` | AiWeaknessRow：分析范围/结果态可辨；AI 草稿边界 | 分析簇可操作不空转 | 无英文 eyebrow 营销分析卡 | BATCH_20 |
| 75 | **OK** | `components/mark/analysis/ExamQuestionIdentityCells.vue` | ExamQuestionIdentityCells：分析范围/结果态可辨；AI 草稿边界 | 分析簇可操作不空转 | 无英文 eyebrow 营销分析卡 | BATCH_19 |
| 76 | **OK** | `components/mark/dashboard/MarkingOverviewAnalytics.vue` | MarkingOverviewAnalytics：阅卷业务态完整（权限/空/错） | 批改/扫描路径可完成 | 浅色；禁 AI 自动写分装饰 | BATCH_20 |
| 77 | **TUNE** | `components/mark/dashboard/OngoingExamCardGrid.vue` | OngoingExamCardGrid：阅卷业务态完整（权限/空/错） | 批改/扫描路径可完成 | 浅色；禁 AI 自动写分装饰 | BATCH_20 |
| 78 | **OK** | `components/mark/dashboard/PendingTodoFeed.vue` | PendingTodoFeed：阅卷业务态完整（权限/空/错） | 批改/扫描路径可完成 | 浅色；禁 AI 自动写分装饰 | BATCH_19 |
| 79 | **OK** | `components/mark/dashboard/PublishedExamInsightChart.vue` | PublishedExamInsightChart：阅卷业务态完整（权限/空/错） | 批改/扫描路径可完成 | 浅色；禁 AI 自动写分装饰 | BATCH_20 |
| 80 | **OK** | `components/mark/dashboard/PublishedExamInsightTable.vue` | PublishedExamInsightTable：阅卷业务态完整（权限/空/错） | 批改/扫描路径可完成 | 浅色；禁 AI 自动写分装饰 | BATCH_20 |
| 81 | **OK** | `components/mark/layout-designer/LayoutBlockLayerPanel.vue` | LayoutBlockLayerPanel：版式设计阶段态 | 画布/阶段可推进 | 工具态非品牌 landing | BATCH_20 |
| 82 | **OK** | `components/mark/layout-designer/LayoutCanvas.vue` | LayoutCanvas：版式设计阶段态 | 画布/阶段可推进 | 工具态非品牌 landing | BATCH_19 |
| 83 | **SHELL** | `components/mark/layout-designer/LayoutCanvasLite.vue` | LayoutCanvasLite：版式设计阶段态 | 画布/阶段可推进 | 工具态非品牌 landing | BATCH_20 |
| 84 | **OK** | `components/mark/layout-designer/LayoutCanvasToolbar.vue` | LayoutCanvasToolbar：版式设计阶段态 | 画布/阶段可推进 | 工具态非品牌 landing | BATCH_20 |
| 85 | **OK** | `components/mark/layout-designer/LayoutEntryGateway.vue` | LayoutEntryGateway：版式设计阶段态 | 画布/阶段可推进 | 工具态非品牌 landing | BATCH_18 |
| 86 | **OK** | `components/mark/layout-designer/LayoutPreviewDrawer.vue` | LayoutPreviewDrawer：版式设计阶段态 | 画布/阶段可推进 | 工具态非品牌 landing | BATCH_20 |
| 87 | **OK** | `components/mark/layout-designer/LayoutPropertyDrawer.vue` | LayoutPropertyDrawer：版式设计阶段态 | 画布/阶段可推进 | 工具态非品牌 landing | BATCH_20 |
| 88 | **OK** | `components/mark/layout-designer/LayoutQuestionCropStrip.vue` | LayoutQuestionCropStrip：版式设计阶段态 | 画布/阶段可推进 | 工具态非品牌 landing | BATCH_21 |
| 89 | **OK** | `components/mark/layout-designer/LayoutQuestionOutlinePanel.vue` | LayoutQuestionOutlinePanel：版式设计阶段态 | 画布/阶段可推进 | 工具态非品牌 landing | BATCH_21 |
| 90 | **OK** | `components/mark/layout-designer/LayoutQuestionPropertyPanel.vue` | LayoutQuestionPropertyPanel：版式设计阶段态 | 画布/阶段可推进 | 工具态非品牌 landing | BATCH_19 |
| 91 | **OK** | `components/mark/layout-designer/LayoutReviewDrawer.vue` | LayoutReviewDrawer：版式设计阶段态 | 画布/阶段可推进 | 工具态非品牌 landing | BATCH_21 |
| 92 | **OK** | `components/mark/layout-designer/workbench/LayoutDesignLayoutPhase.vue` | LayoutDesignLayoutPhase：版式设计阶段态 | 画布/阶段可推进 | 工具态非品牌 landing | BATCH_21 |
| 93 | **SHELL** | `components/mark/layout-designer/workbench/LayoutDesignQuestionPhase.vue` | LayoutDesignQuestionPhase：版式设计阶段态 | 画布/阶段可推进 | 工具态非品牌 landing | BATCH_21 |
| 94 | **OK** | `components/mark/layout-designer/workbench/LayoutDesignReviewPhase.vue` | LayoutDesignReviewPhase：版式设计阶段态 | 画布/阶段可推进 | 工具态非品牌 landing | BATCH_21 |
| 95 | **SHELL** | `components/mark/layout-designer/workbench/LayoutDesignSourcePhase.vue` | LayoutDesignSourcePhase：版式设计阶段态 | 画布/阶段可推进 | 工具态非品牌 landing | BATCH_21 |
| 96 | **OK** | `components/mark/layout-designer/workbench/LayoutDesignWorkflowRail.vue` | LayoutDesignWorkflowRail：版式设计阶段态 | 画布/阶段可推进 | 工具态非品牌 landing | BATCH_18 |
| 97 | **OK** | `components/mark/layout-designer/workbench/LayoutQuestionLedgerPanel.vue` | LayoutQuestionLedgerPanel：版式设计阶段态 | 画布/阶段可推进 | 工具态非品牌 landing | BATCH_21 |
| 98 | **OK** | `components/mark/manual-supplement/ManualSupplementCandidateTable.vue` | ManualSupplementCandidateTable：阅卷业务态完整（权限/空/错） | 批改/扫描路径可完成 | 浅色；禁 AI 自动写分装饰 | BATCH_21 |
| 99 | **OK** | `components/mark/manual-supplement/ManualSupplementFormCore.vue` | ManualSupplementFormCore：阅卷业务态完整（权限/空/错） | 批改/扫描路径可完成 | 浅色；禁 AI 自动写分装饰 | BATCH_19 |
| 100 | **OK** | `components/mark/manual-supplement/ManualSupplementWizardDrawer.vue` | ManualSupplementWizardDrawer：阅卷业务态完整（权限/空/错） | 批改/扫描路径可完成 | 浅色；禁 AI 自动写分装饰 | BATCH_21 |
| 101 | **OK** | `components/platform/UiPlatformExcelImportModal.vue` | UiPlatformExcelImportModal（共享组件）：业务输入输出与状态完整 | 在所属工作台可完成主路径 | 服从 mark-vue 浅色与 Ui* 门禁 | BATCH_18 |
| 102 | **OK** | `components/platform/UiPlatformFileField.vue` | UiPlatformFileField（共享组件）：业务输入输出与状态完整 | 在所属工作台可完成主路径 | 服从 mark-vue 浅色与 Ui* 门禁 | BATCH_18 |
| 103 | **OK** | `components/portfolio/PortfolioAiCandidateConfirmPanel.vue` | PortfolioAiCandidateConfirmPanel：教师范围内证据/办理态；AI 仅草稿 | 档案袋办理可完成 | 信任优先；禁 ePortfolio 营销旅程 | BATCH_21 |
| 104 | **TUNE** | `components/portfolio/PortfolioArchiveVersionComparePanel.vue` | PortfolioArchiveVersionComparePanel：教师范围内证据/办理态；AI 仅草稿 | 档案袋办理可完成 | 信任优先；禁 ePortfolio 营销旅程 | BATCH_18 |
| 105 | **OK** | `components/portfolio/PortfolioCategoryTreePicker.vue` | PortfolioCategoryTreePicker：教师范围内证据/办理态；AI 仅草稿 | 档案袋办理可完成 | 信任优先；禁 ePortfolio 营销旅程 | BATCH_17 |
| 106 | **OK** | `components/portfolio/PortfolioEligibilityTreeEditor.vue` | PortfolioEligibilityTreeEditor：教师范围内证据/办理态；AI 仅草稿 | 档案袋办理可完成 | 信任优先；禁 ePortfolio 营销旅程 | BATCH_21 |
| 107 | **OK** | `components/portfolio/PortfolioIndicatorExplainDrawer.vue` | PortfolioIndicatorExplainDrawer：教师范围内证据/办理态；AI 仅草稿 | 档案袋办理可完成 | 信任优先；禁 ePortfolio 营销旅程 | BATCH_17 |
| 108 | **OK** | `components/portfolio/PortfolioIndicatorTemplateParamsForm.vue` | PortfolioIndicatorTemplateParamsForm：教师范围内证据/办理态；AI 仅草稿 | 档案袋办理可完成 | 信任优先；禁 ePortfolio 营销旅程 | BATCH_17 |
| 109 | **OK** | `components/portfolio/PortfolioLayoutContext.vue` | PortfolioLayoutContext：教师范围内证据/办理态；AI 仅草稿 | 档案袋办理可完成 | 信任优先；禁 ePortfolio 营销旅程 | FORCE |
| 110 | **TUNE** | `components/portfolio/PortfolioMaterialIntakePanel.vue` | 采集+AI 候选确认边界在；AI≠终裁 | 长面板但仍单职责；读写分支可操作 | 无营销 hero；代办写须二次确认 | FORCE+TRI27 |
| 111 | **OK** | `components/portfolio/PortfolioPortraitLayoutEditor.vue` | PortfolioPortraitLayoutEditor：教师范围内证据/办理态；AI 仅草稿 | 档案袋办理可完成 | 信任优先；禁 ePortfolio 营销旅程 | BATCH_21 |
| 112 | **OK** | `components/portfolio/PortfolioProgressCockpitBand.vue` | PortfolioProgressCockpitBand：教师范围内证据/办理态；AI 仅草稿 | 档案袋办理可完成 | 信任优先；禁 ePortfolio 营销旅程 | BATCH_03 |
| 113 | **TUNE** | `components/portfolio/PortfolioProgressCompareDrawer.vue` | PortfolioProgressCompareDrawer：教师范围内证据/办理态；AI 仅草稿 | 档案袋办理可完成 | 信任优先；禁 ePortfolio 营销旅程 | BATCH_21 |
| 114 | **REWORK** | `components/portfolio/PortfolioScopeHeader.vue` | 范围真源正确（本人/选人/工作壳）；缺代办可见态、回本人、未选写门禁显性；空态与页内 URL 文案不同步 | select+壳切换可操作；代办态信息密度不足导致误写风险 | 无营销壳；保持浅色工作条，禁第二身份横幅 | FORCE+TRI27 |
| 115 | **OK** | `components/portfolio/PortfolioTeacherJourneyRail.vue` | PortfolioTeacherJourneyRail：教师范围内证据/办理态；AI 仅草稿 | 档案袋办理可完成 | 信任优先；禁 ePortfolio 营销旅程 | BATCH_06 |
| 116 | **OK** | `components/portfolio/PortfolioTeacherOnboardingWizard.vue` | PortfolioTeacherOnboardingWizard：教师范围内证据/办理态；AI 仅草稿 | 档案袋办理可完成 | 信任优先；禁 ePortfolio 营销旅程 | BATCH_21 |
| 117 | **OK** | `components/portfolio/PortfolioTeacherReviewStatusTable.vue` | PortfolioTeacherReviewStatusTable：教师范围内证据/办理态；AI 仅草稿 | 档案袋办理可完成 | 信任优先；禁 ePortfolio 营销旅程 | BATCH_21 |
| 118 | **OK** | `components/quality/GlobalPromptInputDialog.vue` | GlobalPromptInputDialog：OBE/改进/认证态可解释 | 评价闭环可操作 | 信任优先；禁装饰 KPI | BATCH_21 |
| 119 | **OK** | `components/quality/MarkQualitySyncChip.vue` | MarkQualitySyncChip：OBE/改进/认证态可解释 | 评价闭环可操作 | 信任优先；禁装饰 KPI | BATCH_21 |
| 120 | **TUNE** | `components/quality/QualityIngestPageShell.vue` | QualityIngestPageShell：OBE/改进/认证态可解释 | 评价闭环可操作 | 信任优先；禁装饰 KPI | BATCH_17 |
| 121 | **TUNE** | `components/quality/QualityObeJourneyStrip.vue` | 32px 旅程；无 KPI 正确 | 条带不抢 Scope | ant-color 混用→--dp-surface/border | FORCE+TRI27 |
| 122 | **OK** | `components/quality/QualityPageContextBar.vue` | QualityPageContextBar：OBE/改进/认证态可解释 | 评价闭环可操作 | 信任优先；禁装饰 KPI | BATCH_04 |
| 123 | **OK** | `components/quality/QualityScopeChrome.vue` | 专业→方案→学期→课程唯一范围；方案未确认门禁紧凑 | 操作链可完成；无教师代办混入 | 拒全宽黄 Alert；Tag+CTA 形态正确 | FORCE+TRI27 |
| 124 | **OK** | `components/quality/QualityWorkbenchCharts.vue` | QualityWorkbenchCharts：OBE/改进/认证态可解释 | 评价闭环可操作 | 信任优先；禁装饰 KPI | BATCH_04 |
| 125 | **OK** | `components/quality/accreditation/AccreditationAnnualPanel.vue` | AccreditationAnnualPanel：OBE/改进/认证态可解释 | 评价闭环可操作 | 信任优先；禁装饰 KPI | BATCH_21 |
| 126 | **OK** | `components/quality/accreditation/AccreditationAnnualReportMaterialPanel.vue` | AccreditationAnnualReportMaterialPanel：OBE/改进/认证态可解释 | 评价闭环可操作 | 信任优先；禁装饰 KPI | BATCH_21 |
| 127 | **OK** | `components/quality/accreditation/AccreditationCyclePanel.vue` | AccreditationCyclePanel：OBE/改进/认证态可解释 | 评价闭环可操作 | 信任优先；禁装饰 KPI | BATCH_21 |
| 128 | **OK** | `components/quality/accreditation/AccreditationEvidencePanel.vue` | AccreditationEvidencePanel：OBE/改进/认证态可解释 | 评价闭环可操作 | 信任优先；禁装饰 KPI | BATCH_21 |
| 129 | **OK** | `components/quality/accreditation/AccreditationOnsitePanel.vue` | AccreditationOnsitePanel：OBE/改进/认证态可解释 | 评价闭环可操作 | 信任优先；禁装饰 KPI | BATCH_21 |
| 130 | **OK** | `components/quality/accreditation/AccreditationSupportPanel.vue` | AccreditationSupportPanel：OBE/改进/认证态可解释 | 评价闭环可操作 | 信任优先；禁装饰 KPI | BATCH_21 |
| 131 | **OK** | `components/quality/accreditation/SelfAssessmentReportPanel.vue` | SelfAssessmentReportPanel：OBE/改进/认证态可解释 | 评价闭环可操作 | 信任优先；禁装饰 KPI | BATCH_21 |
| 132 | **OK** | `components/quality/improvement/AuditIssueTab.vue` | AuditIssueTab：OBE/改进/认证态可解释 | 评价闭环可操作 | 信任优先；禁装饰 KPI | BATCH_21 |
| 133 | **OK** | `components/quality/improvement/AuditRectificationTab.vue` | AuditRectificationTab：OBE/改进/认证态可解释 | 评价闭环可操作 | 信任优先；禁装饰 KPI | BATCH_21 |
| 134 | **OK** | `components/quality/improvement/AuditSupervisionTab.vue` | AuditSupervisionTab：OBE/改进/认证态可解释 | 评价闭环可操作 | 信任优先；禁装饰 KPI | BATCH_21 |
| 135 | **TUNE** | `components/quality/improvement/ImprovementTaskTab.vue` | ImprovementTaskTab：OBE/改进/认证态可解释 | 评价闭环可操作 | 信任优先；禁装饰 KPI | BATCH_21 |
| 136 | **OK** | `components/quality/improvement/ImprovementWorkbenchPanel.vue` | ImprovementWorkbenchPanel：OBE/改进/认证态可解释 | 评价闭环可操作 | 信任优先；禁装饰 KPI | BATCH_17 |
| 137 | **OK** | `components/quality/selectors/AchievementResultSelector.vue` | AchievementResultSelector：选择器加载/搜索/分页合同；失败可见 | 下拉可完成选值；与 QualityScope 字段对齐 | 无营销卡；禁教师档案袋代办混入质量 selector | BATCH_17 |
| 138 | **OK** | `components/quality/selectors/ArchiveSelector.vue` | ArchiveSelector：选择器加载/搜索/分页合同；失败可见 | 下拉可完成选值；与 QualityScope 字段对齐 | 无营销卡；禁教师档案袋代办混入质量 selector | BATCH_17 |
| 139 | **OK** | `components/quality/selectors/AssessmentItemSelector.vue` | AssessmentItemSelector：选择器加载/搜索/分页合同；失败可见 | 下拉可完成选值；与 QualityScope 字段对齐 | 无营销卡；禁教师档案袋代办混入质量 selector | BATCH_17 |
| 140 | **OK** | `components/quality/selectors/AuditIssueSelector.vue` | AuditIssueSelector：选择器加载/搜索/分页合同；失败可见 | 下拉可完成选值；与 QualityScope 字段对齐 | 无营销卡；禁教师档案袋代办混入质量 selector | BATCH_17 |
| 141 | **OK** | `components/quality/selectors/AuditRectificationSelector.vue` | AuditRectificationSelector：选择器加载/搜索/分页合同；失败可见 | 下拉可完成选值；与 QualityScope 字段对齐 | 无营销卡；禁教师档案袋代办混入质量 selector | BATCH_17 |
| 142 | **OK** | `components/quality/selectors/CatalogCourseSelector.vue` | CatalogCourseSelector：选择器加载/搜索/分页合同；失败可见 | 下拉可完成选值；与 QualityScope 字段对齐 | 无营销卡；禁教师档案袋代办混入质量 selector | BATCH_17 |
| 143 | **OK** | `components/quality/selectors/ClassSelector.vue` | ClassSelector：选择器加载/搜索/分页合同；失败可见 | 下拉可完成选值；与 QualityScope 字段对齐 | 无营销卡；禁教师档案袋代办混入质量 selector | BATCH_17 |
| 144 | **OK** | `components/quality/selectors/CourseGoalSelector.vue` | CourseGoalSelector：选择器加载/搜索/分页合同；失败可见 | 下拉可完成选值；与 QualityScope 字段对齐 | 无营销卡；禁教师档案袋代办混入质量 selector | BATCH_17 |
| 145 | **OK** | `components/quality/selectors/CourseSelector.vue` | CourseSelector：选择器加载/搜索/分页合同；失败可见 | 下拉可完成选值；与 QualityScope 字段对齐 | 无营销卡；禁教师档案袋代办混入质量 selector | BATCH_17 |
| 146 | **OK** | `components/quality/selectors/DepartmentSelector.vue` | DepartmentSelector：选择器加载/搜索/分页合同；失败可见 | 下拉可完成选值；与 QualityScope 字段对齐 | 无营销卡；禁教师档案袋代办混入质量 selector | BATCH_17 |
| 147 | **OK** | `components/quality/selectors/GraduationRequirementSelector.vue` | GraduationRequirementSelector：选择器加载/搜索/分页合同；失败可见 | 下拉可完成选值；与 QualityScope 字段对齐 | 无营销卡；禁教师档案袋代办混入质量 selector | BATCH_17 |
| 148 | **OK** | `components/quality/selectors/IndirectFormSelector.vue` | IndirectFormSelector：选择器加载/搜索/分页合同；失败可见 | 下拉可完成选值；与 QualityScope 字段对齐 | 无营销卡；禁教师档案袋代办混入质量 selector | BATCH_17 |
| 149 | **OK** | `components/quality/selectors/ProfessionAlgorithmProfileSelector.vue` | ProfessionAlgorithmProfileSelector：选择器加载/搜索/分页合同；失败可见 | 下拉可完成选值；与 QualityScope 字段对齐 | 无营销卡；禁教师档案袋代办混入质量 selector | BATCH_17 |
| 150 | **OK** | `components/quality/selectors/ProgramEvaluationProfileSelector.vue` | ProgramEvaluationProfileSelector：选择器加载/搜索/分页合同；失败可见 | 下拉可完成选值；与 QualityScope 字段对齐 | 无营销卡；禁教师档案袋代办混入质量 selector | BATCH_22 |
| 151 | **OK** | `components/quality/selectors/ProgramSelector.vue` | ProgramSelector：选择器加载/搜索/分页合同；失败可见 | 下拉可完成选值；与 QualityScope 字段对齐 | 无营销卡；禁教师档案袋代办混入质量 selector | BATCH_17 |
| 152 | **OK** | `components/quality/selectors/ReportSelector.vue` | ReportSelector：选择器加载/搜索/分页合同；失败可见 | 下拉可完成选值；与 QualityScope 字段对齐 | 无营销卡；禁教师档案袋代办混入质量 selector | BATCH_17 |
| 153 | **OK** | `components/quality/selectors/RequirementIndicatorSelector.vue` | RequirementIndicatorSelector：选择器加载/搜索/分页合同；失败可见 | 下拉可完成选值；与 QualityScope 字段对齐 | 无营销卡；禁教师档案袋代办混入质量 selector | BATCH_17 |
| 154 | **OK** | `components/quality/selectors/StudentSelector.vue` | StudentSelector：选择器加载/搜索/分页合同；失败可见 | 下拉可完成选值；与 QualityScope 字段对齐 | 无营销卡；禁教师档案袋代办混入质量 selector | BATCH_17 |
| 155 | **OK** | `components/quality/selectors/TeacherSelector.vue` | TeacherSelector：选择器加载/搜索/分页合同；失败可见 | 下拉可完成选值；与 QualityScope 字段对齐 | 无营销卡；禁教师档案袋代办混入质量 selector | BATCH_17 |
| 156 | **OK** | `components/quality/selectors/TrainingObjectiveSelector.vue` | TrainingObjectiveSelector：选择器加载/搜索/分页合同；失败可见 | 下拉可完成选值；与 QualityScope 字段对齐 | 无营销卡；禁教师档案袋代办混入质量 selector | BATCH_17 |
| 157 | **OK** | `components/quality/selectors/TrainingPlanSelector.vue` | TrainingPlanSelector：选择器加载/搜索/分页合同；失败可见 | 下拉可完成选值；与 QualityScope 字段对齐 | 无营销卡；禁教师档案袋代办混入质量 selector | BATCH_17 |
| 158 | **OK** | `components/scanner-ops/ScanDispatchPanel.vue` | ScanDispatchPanel：调度/异常/日志失败可见 | 运营台可操作；指标可下钻 | 拒深色 ops theater | BATCH_16 |
| 159 | **OK** | `components/scanner-ops/ScanExceptionPanel.vue` | ScanExceptionPanel：调度/异常/日志失败可见 | 运营台可操作；指标可下钻 | 拒深色 ops theater | BATCH_06 |
| 160 | **OK** | `components/scanner-ops/ScanOperationLogPanel.vue` | ScanOperationLogPanel：调度/异常/日志失败可见 | 运营台可操作；指标可下钻 | 拒深色 ops theater | BATCH_16 |
| 161 | **OK** | `components/scanner-ops/ScanOpsPanel.vue` | ScanOpsPanel：调度/异常/日志失败可见 | 运营台可操作；指标可下钻 | 拒深色 ops theater | BATCH_06 |
| 162 | **OK** | `components/scanner-ops/ScanOpsWorkbench.vue` | ScanOpsWorkbench：调度/异常/日志失败可见 | 运营台可操作；指标可下钻 | 拒深色 ops theater | BATCH_06 |
| 163 | **OK** | `components/ui-guide/ui/Alert.vue` | Alert：原语 props/状态合同稳定 | 可复用；无业务页私加皮肤 | --dp-*/#1677ff；拒第二蓝/eyebrow | BATCH_15 |
| 164 | **OK** | `components/ui-guide/ui/Badge.vue` | tone 语义完整；唯一真源（UiBadge.vue GONE） | 尺寸/variant 够用 | token 化 tone；#fff 仅 solid 字色可接受 | BATCH_07+TRI27 |
| 165 | **REWORK** | `components/ui-guide/ui/Button.vue` | 主按钮语义全；与 UiButton 双真源导致同义不同皮 | 操作可达；双轨增加选型成本 | solid danger 有 #fca5a5 等硬编码；应收 --dp-* | FORCE+TRI27 |
| 166 | **OK** | `components/ui-guide/ui/Card.vue` | Card：原语 props/状态合同稳定 | 可复用；无业务页私加皮肤 | --dp-*/#1677ff；拒第二蓝/eyebrow | BATCH_14 |
| 167 | **SHELL** | `components/ui-guide/ui/ConfirmModal.vue` | 纯转发 UiConfirmDialog | 别名无操作增量 | 无独立皮肤；保留仅为兼容导入则标 SHELL | FORCE+TRI27 |
| 168 | **OK** | `components/ui-guide/ui/DatePicker.vue` | DatePicker：原语 props/状态合同稳定 | 可复用；无业务页私加皮肤 | --dp-*/#1677ff；拒第二蓝/eyebrow | BATCH_15 |
| 169 | **TUNE** | `components/ui-guide/ui/Empty.vue` | 空态+可选 CTA | 可完成引导 | 与 UiEmpty 双轨，收敛导入 | FORCE+TRI27 |
| 170 | **OK** | `components/ui-guide/ui/FilterBar.vue` | FilterBar：原语 props/状态合同稳定 | 可复用；无业务页私加皮肤 | --dp-*/#1677ff；拒第二蓝/eyebrow | FORCE |
| 171 | **OK** | `components/ui-guide/ui/InfoGrid.vue` | InfoGrid：原语 props/状态合同稳定 | 可复用；无业务页私加皮肤 | --dp-*/#1677ff；拒第二蓝/eyebrow | BATCH_15 |
| 172 | **OK** | `components/ui-guide/ui/InfoGridItem.vue` | InfoGridItem：原语 props/状态合同稳定 | 可复用；无业务页私加皮肤 | --dp-*/#1677ff；拒第二蓝/eyebrow | BATCH_15 |
| 173 | **OK** | `components/ui-guide/ui/Input.vue` | Input：原语 props/状态合同稳定 | 可复用；无业务页私加皮肤 | --dp-*/#1677ff；拒第二蓝/eyebrow | BATCH_14 |
| 174 | **OK** | `components/ui-guide/ui/Pagination.vue` | current/pageSize 合同清晰；孪生 UiPagination.vue 已删 | 分页可完成；跟后端页码 | 无营销；保持 Ui* 名 defineOptions | FORCE+TRI27 |
| 175 | **OK** | `components/ui-guide/ui/PasswordInput.vue` | PasswordInput：原语 props/状态合同稳定 | 可复用；无业务页私加皮肤 | --dp-*/#1677ff；拒第二蓝/eyebrow | BATCH_15 |
| 176 | **OK** | `components/ui-guide/ui/SearchBox.vue` | SearchBox：原语 props/状态合同稳定 | 可复用；无业务页私加皮肤 | --dp-*/#1677ff；拒第二蓝/eyebrow | BATCH_15 |
| 177 | **TUNE** | `components/ui-guide/ui/Switch.vue` | boolean 模型清晰；被 auto-import Switch 使用 | 控件可点 | track #cbd5e1/slate 阴影，改 --dp-* | BATCH_15+TRI27 |
| 178 | **OK** | `components/ui-guide/ui/Tag.vue` | Tag：原语 props/状态合同稳定 | 可复用；无业务页私加皮肤 | --dp-*/#1677ff；拒第二蓝/eyebrow | FORCE |
| 179 | **OK** | `components/ui-guide/ui/Textarea.vue` | Textarea：原语 props/状态合同稳定 | 可复用；无业务页私加皮肤 | --dp-*/#1677ff；拒第二蓝/eyebrow | BATCH_15 |
| 180 | **OK** | `components/ui-guide/ui/UiActionLink.vue` | UiActionLink：原语 props/状态合同稳定 | 可复用；无业务页私加皮肤 | --dp-*/#1677ff；拒第二蓝/eyebrow | BATCH_07 |
| 181 | **TUNE** | `components/ui-guide/ui/UiActivityTimeline.vue` | UiActivityTimeline：原语 props/状态合同稳定 | 可复用；无业务页私加皮肤 | --dp-*/#1677ff；拒第二蓝/eyebrow | BATCH_07 |
| 182 | **OK** | `components/ui-guide/ui/UiAlertStrip.vue` | UiAlertStrip：原语 props/状态合同稳定 | 可复用；无业务页私加皮肤 | --dp-*/#1677ff；拒第二蓝/eyebrow | FORCE |
| 183 | **REWORK** | `components/ui-guide/ui/UiArrowTimeline.vue` | 阶段状态完整；metrics 槽易变 KPI 墙 | arrow/panel 可扫读；色阶过多 | 大量 #3b82f6/#f8fafc slate 系，偏离 #1677ff/--dp-* | FORCE+TRI27 |
| 184 | **TUNE** | `components/ui-guide/ui/UiBatchActionBar.vue` | 依赖 selectedCount；无选中应隐藏（调用方） | 批量操作条正确 | background:#fff 硬编码→--dp-surface | FORCE+TRI27 |
| 185 | **REWORK** | `components/ui-guide/ui/UiButton.vue` | 与 Button.vue 合同重叠；导入分叉 | 双入口降密度一致性 | 禁并行皮肤演化；收敛单真源 | FORCE+TRI27 |
| 186 | **OK** | `components/ui-guide/ui/UiCheckbox.vue` | UiCheckbox：原语 props/状态合同稳定 | 可复用；无业务页私加皮肤 | --dp-*/#1677ff；拒第二蓝/eyebrow | BATCH_15 |
| 187 | **OK** | `components/ui-guide/ui/UiCheckboxGroup.vue` | UiCheckboxGroup：原语 props/状态合同稳定 | 可复用；无业务页私加皮肤 | --dp-*/#1677ff；拒第二蓝/eyebrow | BATCH_15 |
| 188 | **OK** | `components/ui-guide/ui/UiConfirmDialog.vue` | UiConfirmDialog：原语 props/状态合同稳定 | 可复用；无业务页私加皮肤 | --dp-*/#1677ff；拒第二蓝/eyebrow | FORCE |
| 189 | **OK** | `components/ui-guide/ui/UiDataTable.vue` | UiDataTable：原语 props/状态合同稳定 | 可复用；无业务页私加皮肤 | --dp-*/#1677ff；拒第二蓝/eyebrow | FORCE |
| 190 | **TUNE** | `components/ui-guide/ui/UiDescriptionGrid.vue` | UiDescriptionGrid：原语 props/状态合同稳定 | 可复用；无业务页私加皮肤 | --dp-*/#1677ff；拒第二蓝/eyebrow | BATCH_07 |
| 191 | **OK** | `components/ui-guide/ui/UiDialog.vue` | UiDialog：原语 props/状态合同稳定 | 可复用；无业务页私加皮肤 | --dp-*/#1677ff；拒第二蓝/eyebrow | BATCH_08 |
| 192 | **OK** | `components/ui-guide/ui/UiDrawer.vue` | UiDrawer：原语 props/状态合同稳定 | 可复用；无业务页私加皮肤 | --dp-*/#1677ff；拒第二蓝/eyebrow | FORCE |
| 193 | **OK** | `components/ui-guide/ui/UiDropdownAction.vue` | UiDropdownAction：原语 props/状态合同稳定 | 可复用；无业务页私加皮肤 | --dp-*/#1677ff；拒第二蓝/eyebrow | BATCH_15 |
| 194 | **TUNE** | `components/ui-guide/ui/UiEllipsisText.vue` | UiEllipsisText：原语 props/状态合同稳定 | 可复用；无业务页私加皮肤 | --dp-*/#1677ff；拒第二蓝/eyebrow | BATCH_08 |
| 195 | **TUNE** | `components/ui-guide/ui/UiEmpty.vue` | 空态合同 | 可操作 | 与 Empty.vue 双轨 | FORCE+TRI27 |
| 196 | **OK** | `components/ui-guide/ui/UiForm.vue` | UiForm：原语 props/状态合同稳定 | 可复用；无业务页私加皮肤 | --dp-*/#1677ff；拒第二蓝/eyebrow | BATCH_15 |
| 197 | **OK** | `components/ui-guide/ui/UiFormField.vue` | UiFormField：原语 props/状态合同稳定 | 可复用；无业务页私加皮肤 | --dp-*/#1677ff；拒第二蓝/eyebrow | BATCH_15 |
| 198 | **OK** | `components/ui-guide/ui/UiFormSection.vue` | UiFormSection：原语 props/状态合同稳定 | 可复用；无业务页私加皮肤 | --dp-*/#1677ff；拒第二蓝/eyebrow | BATCH_01 |
| 199 | **TUNE** | `components/ui-guide/ui/UiMetricCard.vue` | 指标卡有空态文案路径 | 单卡密度 OK | --metric-text:#2563eb 第二蓝，改 --dp-blue-500 | BATCH_07+TRI27 |
| 200 | **SHELL** | `components/ui-guide/ui/UiMultiSelect.vue` | 仅 mode=multiple 转发 UiSelect，无新增业务不变量 | 薄壳增一层 import | 无独立视觉；应内联或冻结 | FORCE+TRI27 |
| 201 | **TUNE** | `components/ui-guide/ui/UiPageHeader.vue` | UiPageHeader：原语 props/状态合同稳定 | 可复用；无业务页私加皮肤 | --dp-*/#1677ff；拒第二蓝/eyebrow | BATCH_01 |
| 202 | **OK** | `components/ui-guide/ui/UiPanelHeader.vue` | UiPanelHeader：原语 props/状态合同稳定 | 可复用；无业务页私加皮肤 | --dp-*/#1677ff；拒第二蓝/eyebrow | BATCH_14 |
| 203 | **OK** | `components/ui-guide/ui/UiPopoverPanel.vue` | UiPopoverPanel：原语 props/状态合同稳定 | 可复用；无业务页私加皮肤 | --dp-*/#1677ff；拒第二蓝/eyebrow | BATCH_15 |
| 204 | **TUNE** | `components/ui-guide/ui/UiProgressBar.vue` | 进度可见；默认 color #3b82f6 | 条形可读 | 默认色与 gradient 变体偏营销；默认改品牌蓝 token | BATCH_15+TRI27 |
| 205 | **OK** | `components/ui-guide/ui/UiRadio.vue` | UiRadio：原语 props/状态合同稳定 | 可复用；无业务页私加皮肤 | --dp-*/#1677ff；拒第二蓝/eyebrow | BATCH_15 |
| 206 | **OK** | `components/ui-guide/ui/UiRadioGroup.vue` | UiRadioGroup：原语 props/状态合同稳定 | 可复用；无业务页私加皮肤 | --dp-*/#1677ff；拒第二蓝/eyebrow | BATCH_15 |
| 207 | **OK** | `components/ui-guide/ui/UiSectionTabs.vue` | UiSectionTabs：原语 props/状态合同稳定 | 可复用；无业务页私加皮肤 | --dp-*/#1677ff；拒第二蓝/eyebrow | BATCH_09 |
| 208 | **TUNE** | `components/ui-guide/ui/UiSelect.vue` | UiSelect：原语 props/状态合同稳定 | 可复用；无业务页私加皮肤 | --dp-*/#1677ff；拒第二蓝/eyebrow | BATCH_07 |
| 209 | **OK** | `components/ui-guide/ui/UiSidebarNav.vue` | UiSidebarNav：原语 props/状态合同稳定 | 可复用；无业务页私加皮肤 | --dp-*/#1677ff；拒第二蓝/eyebrow | BATCH_01 |
| 210 | **TUNE** | `components/ui-guide/ui/UiSkeletonState.vue` | UiSkeletonState：原语 props/状态合同稳定 | 可复用；无业务页私加皮肤 | --dp-*/#1677ff；拒第二蓝/eyebrow | BATCH_07 |
| 211 | **TUNE** | `components/ui-guide/ui/UiStatPanel.vue` | UiStatPanel：原语 props/状态合同稳定 | 可复用；无业务页私加皮肤 | --dp-*/#1677ff；拒第二蓝/eyebrow | BATCH_15 |
| 212 | **TUNE** | `components/ui-guide/ui/UiStateBlock.vue` | compact 默认；empty/loading/error 齐全 | 工作台友好 | icon 色 #2563eb 应收 token | FORCE+TRI27 |
| 213 | **REWORK** | `components/ui-guide/ui/UiStatisticChartCard.vue` | 图卡状态/摘要槽位在；系列色硬编码 | 头+图密度可；色语义应走 token | #2563eb/#16a34a 等第二色板，驳回 | FORCE+TRI27 |
| 214 | **OK** | `components/ui-guide/ui/UiTableActions.vue` | UiTableActions：原语 props/状态合同稳定 | 可复用；无业务页私加皮肤 | --dp-*/#1677ff；拒第二蓝/eyebrow | BATCH_14 |
| 215 | **OK** | `components/ui-guide/ui/UiTag.vue` | UiTag：原语 props/状态合同稳定 | 可复用；无业务页私加皮肤 | --dp-*/#1677ff；拒第二蓝/eyebrow | FORCE |
| 216 | **OK** | `components/ui-guide/ui/UiTextAction.vue` | UiTextAction：原语 props/状态合同稳定 | 可复用；无业务页私加皮肤 | --dp-*/#1677ff；拒第二蓝/eyebrow | BATCH_14 |
| 217 | **TUNE** | `components/ui-guide/ui/UiTooltip.vue` | UiTooltip：原语 props/状态合同稳定 | 可复用；无业务页私加皮肤 | --dp-*/#1677ff；拒第二蓝/eyebrow | BATCH_15 |
| 218 | **OK** | `components/ui-guide/ui/YearPicker.vue` | YearPicker：原语 props/状态合同稳定 | 可复用；无业务页私加皮肤 | --dp-*/#1677ff；拒第二蓝/eyebrow | FORCE |
| 219 | **OK** | `components/workbench/ArchiveVolumeSubSidebar.vue` | ArchiveVolumeSubSidebar：工作台结构/旅程/反馈职责清晰 | 壳层不抢主操作；密度受控 | 永久浅色；禁第二套壳皮肤 | BATCH_05 |
| 220 | **TUNE** | `components/workbench/AuditTimelineDrawer.vue` | AuditTimelineDrawer：工作台结构/旅程/反馈职责清晰 | 壳层不抢主操作；密度受控 | 永久浅色；禁第二套壳皮肤 | BATCH_16 |
| 221 | **TUNE** | `components/workbench/ContextBar.vue` | ContextBar：工作台结构/旅程/反馈职责清晰 | 壳层不抢主操作；密度受控 | 永久浅色；禁第二套壳皮肤 | FORCE |
| 222 | **OK** | `components/workbench/ExamJourneyMiniStrip.vue` | ExamJourneyMiniStrip：工作台结构/旅程/反馈职责清晰 | 壳层不抢主操作；密度受控 | 永久浅色；禁第二套壳皮肤 | BATCH_16 |
| 223 | **OK** | `components/workbench/ExamJourneyRail.vue` | ExamJourneyRail：工作台结构/旅程/反馈职责清晰 | 壳层不抢主操作；密度受控 | 永久浅色；禁第二套壳皮肤 | BATCH_06 |
| 224 | **OK** | `components/workbench/ExamJourneySidebarNav.vue` | ExamJourneySidebarNav：工作台结构/旅程/反馈职责清晰 | 壳层不抢主操作；密度受控 | 永久浅色；禁第二套壳皮肤 | BATCH_16 |
| 225 | **OK** | `components/workbench/ExamPrepInfoPanels.vue` | ExamPrepInfoPanels：工作台结构/旅程/反馈职责清晰 | 壳层不抢主操作；密度受控 | 永久浅色；禁第二套壳皮肤 | BATCH_16 |
| 226 | **OK** | `components/workbench/ExamPrepScenarioPanel.vue` | ExamPrepScenarioPanel：工作台结构/旅程/反馈职责清晰 | 壳层不抢主操作；密度受控 | 永久浅色；禁第二套壳皮肤 | BATCH_16 |
| 227 | **OK** | `components/workbench/ExamSidebarExamSwitch.vue` | ExamSidebarExamSwitch：工作台结构/旅程/反馈职责清晰 | 壳层不抢主操作；密度受控 | 永久浅色；禁第二套壳皮肤 | BATCH_22 |
| 228 | **OK** | `components/workbench/ExamSubSidebar.vue` | ExamSubSidebar：工作台结构/旅程/反馈职责清晰 | 壳层不抢主操作；密度受控 | 永久浅色；禁第二套壳皮肤 | BATCH_04 |
| 229 | **OK** | `components/workbench/ExamSubSidebarMenuIcon.vue` | ExamSubSidebarMenuIcon：工作台结构/旅程/反馈职责清晰 | 壳层不抢主操作；密度受控 | 永久浅色；禁第二套壳皮肤 | BATCH_16 |
| 230 | **OK** | `components/workbench/ExamSubSidebarNav.vue` | ExamSubSidebarNav：工作台结构/旅程/反馈职责清晰 | 壳层不抢主操作；密度受控 | 永久浅色；禁第二套壳皮肤 | BATCH_04 |
| 231 | **OK** | `components/workbench/ExamSwitcher.vue` | ExamSwitcher：工作台结构/旅程/反馈职责清晰 | 壳层不抢主操作；密度受控 | 永久浅色；禁第二套壳皮肤 | BATCH_16 |
| 232 | **OK** | `components/workbench/ExamWorkflowTaskDock.vue` | ExamWorkflowTaskDock：工作台结构/旅程/反馈职责清晰 | 壳层不抢主操作；密度受控 | 永久浅色；禁第二套壳皮肤 | BATCH_16 |
| 233 | **OK** | `components/workbench/ExamWorkspaceChildFrame.vue` | ExamWorkspaceChildFrame：工作台结构/旅程/反馈职责清晰 | 壳层不抢主操作；密度受控 | 永久浅色；禁第二套壳皮肤 | BATCH_16 |
| 234 | **OK** | `components/workbench/ExamWorkspaceChrome.vue` | ExamWorkspaceChrome：工作台结构/旅程/反馈职责清晰 | 壳层不抢主操作；密度受控 | 永久浅色；禁第二套壳皮肤 | BATCH_16 |
| 235 | **OK** | `components/workbench/ExamWorkspaceJourneySubNav.vue` | ExamWorkspaceJourneySubNav：工作台结构/旅程/反馈职责清晰 | 壳层不抢主操作；密度受控 | 永久浅色；禁第二套壳皮肤 | BATCH_16 |
| 236 | **OK** | `components/workbench/ExamWorkspacePageShell.vue` | ExamWorkspacePageShell：工作台结构/旅程/反馈职责清晰 | 壳层不抢主操作；密度受控 | 永久浅色；禁第二套壳皮肤 | BATCH_16 |
| 237 | **OK** | `components/workbench/GlobalConfirmDialog.vue` | GlobalConfirmDialog：工作台结构/旅程/反馈职责清晰 | 壳层不抢主操作；密度受控 | 永久浅色；禁第二套壳皮肤 | BATCH_22 |
| 238 | **OK** | `components/workbench/MarkQualityScopeBar.vue` | MarkQualityScopeBar：工作台结构/旅程/反馈职责清晰 | 壳层不抢主操作；密度受控 | 永久浅色；禁第二套壳皮肤 | BATCH_16 |
| 239 | **TUNE** | `components/workbench/MaterialLayoutConfigModal.vue` | MaterialLayoutConfigModal：工作台结构/旅程/反馈职责清晰 | 壳层不抢主操作；密度受控 | 永久浅色；禁第二套壳皮肤 | BATCH_16 |
| 240 | **OK** | `components/workbench/MatrixWorkbench.vue` | MatrixWorkbench：工作台结构/旅程/反馈职责清晰 | 壳层不抢主操作；密度受控 | 永久浅色；禁第二套壳皮肤 | BATCH_05 |
| 241 | **TUNE** | `components/workbench/PrepStepPipelineRow.vue` | PrepStepPipelineRow：工作台结构/旅程/反馈职责清晰 | 壳层不抢主操作；密度受控 | 永久浅色；禁第二套壳皮肤 | BATCH_16 |
| 242 | **OK** | `components/workbench/ScoreAnalyticsStatusFlow.vue` | 已挂 score-finalize/publish；步骤人数+emphasis 可辨；空 steps 时不误导成功 | 标签流密度合适；与 Pipeline/SignalBand 分责清晰，可完成状态扫读 | 无营销 KPI 墙；强调环用品牌 primary-border，非第二蓝皮肤 | BATCH_16+TRI27 |
| 243 | **TUNE** | `components/workbench/ScorePublishRelatedLinksCard.vue` | ScorePublishRelatedLinksCard：工作台结构/旅程/反馈职责清晰 | 壳层不抢主操作；密度受控 | 永久浅色；禁第二套壳皮肤 | BATCH_19 |
| 244 | **OK** | `components/workbench/ScoreReleaseStepPipeline.vue` | 确认→发布旅程导航；不承载人数统计 | 步骤可点边界清晰；与状态流同页不抢主 CTA | 工作台旅程形态，非 landing stepper 装饰 | BATCH_16+TRI27 |
| 245 | **TUNE** | `components/workbench/SignalBand.vue` | KPI 可下钻语义在；不作状态流转替代 | 顶栏密度高但可扫 | 禁 tiles 装饰墙；保持浅色 band | FORCE+TRI27 |
| 246 | **OK** | `components/workbench/StageRail.vue` | StageRail：工作台结构/旅程/反馈职责清晰 | 壳层不抢主操作；密度受控 | 永久浅色；禁第二套壳皮肤 | BATCH_06 |
| 247 | **OK** | `components/workbench/StageWorkbenchShell.vue` | StageWorkbenchShell：工作台结构/旅程/反馈职责清晰 | 壳层不抢主操作；密度受控 | 永久浅色；禁第二套壳皮肤 | FORCE |
| 248 | **OK** | `components/workbench/TaskResultPanel.vue` | TaskResultPanel：工作台结构/旅程/反馈职责清晰 | 壳层不抢主操作；密度受控 | 永久浅色；禁第二套壳皮肤 | BATCH_16 |
| 249 | **TUNE** | `components/workbench/WorkbenchNoticeBanner.vue` | WorkbenchNoticeBanner：工作台结构/旅程/反馈职责清晰 | 壳层不抢主操作；密度受控 | 永久浅色；禁第二套壳皮肤 | BATCH_16 |
| 250 | **OK** | `components/workbench/WorkbenchSurfaceCard.vue` | WorkbenchSurfaceCard：工作台结构/旅程/反馈职责清晰 | 壳层不抢主操作；密度受控 | 永久浅色；禁第二套壳皮肤 | BATCH_05 |
| 251 | **OK** | `components/workbench/workflow-readiness/WorkflowPrerequisiteEmpty.vue` | WorkflowPrerequisiteEmpty：工作台结构/旅程/反馈职责清晰 | 壳层不抢主操作；密度受控 | 永久浅色；禁第二套壳皮肤 | BATCH_19 |
| 252 | **OK** | `components/workbench/workflow-readiness/WorkflowReadinessPanel.vue` | WorkflowReadinessPanel：工作台结构/旅程/反馈职责清晰 | 壳层不抢主操作；密度受控 | 永久浅色；禁第二套壳皮肤 | BATCH_06 |

## P0 · REWORK 汇总（本轮）

- `components/portfolio/PortfolioScopeHeader.vue` — I: 范围真源正确（本人/选人/工作壳）；缺代办可见态、回本人、未选写门禁显性；空态与页内 URL 文案不同步
- `components/ui-guide/ui/Button.vue` — I: 主按钮语义全；与 UiButton 双真源导致同义不同皮
- `components/ui-guide/ui/UiArrowTimeline.vue` — I: 阶段状态完整；metrics 槽易变 KPI 墙
- `components/ui-guide/ui/UiButton.vue` — I: 与 Button.vue 合同重叠；导入分叉
- `components/ui-guide/ui/UiStatisticChartCard.vue` — I: 图卡状态/摘要槽位在；系列色硬编码

## SHELL 汇总

- `components/mark/analysis/AiAnalysisExamScopePanel.vue` — AiAnalysisExamScopePanel：分析范围/结果态可辨；AI 草稿边界
- `components/mark/analysis/AiAnalysisOrgTermScopePanel.vue` — AiAnalysisOrgTermScopePanel：分析范围/结果态可辨；AI 草稿边界
- `components/mark/layout-designer/LayoutCanvasLite.vue` — LayoutCanvasLite：版式设计阶段态
- `components/mark/layout-designer/workbench/LayoutDesignQuestionPhase.vue` — LayoutDesignQuestionPhase：版式设计阶段态
- `components/mark/layout-designer/workbench/LayoutDesignSourcePhase.vue` — LayoutDesignSourcePhase：版式设计阶段态
- `components/ui-guide/ui/ConfirmModal.vue` — 纯转发 UiConfirmDialog
- `components/ui-guide/ui/UiMultiSelect.vue` — 仅 mode=multiple 转发 UiSelect，无新增业务不变量

## 成绩分析壳（业务保留）

| 组件 | 判定 | 分责 |
|------|------|------|
| ScoreAnalyticsStatusFlow | **OK** | 分数状态人数 + emphasis |
| ScoreReleaseStepPipeline | **OK** | 确认→发布导航 |
| SignalBand | **TUNE** | 顶栏 KPI，不替代状态流 |

## 已删 GONE（不在 252 内，累计 105）

见 `COMPONENT_ZERO_REF_DELETED.json` / `COMPONENT_DEAD_BATCH_2026-07-16.md`。含孪生 UiBadge/UiPagination、GiFooter、UiEntityCard 等。**禁止复活。**

## 审查用法

1. 打开本表按 path 勾选  
2. craft-board `#review-confirm` 对 A/B/C 定稿  
3. 仅对 REWORK/P0 动代码；OK 保持  

