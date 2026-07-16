# 组件手审账 · Batch 23

> 方法：逐文件 Read 源码 + 路径限定引用核对（排除 `components.d.ts`）。  
> Skills：**Impeccable product** · **Finesse product** · **Taste audit-only**  
> Gate：**frontend-design-mark**（`#1677ff` · 浅色 · `--dp-*` · dense `UiAlertStrip`）  
> 禁令：结论禁止由扫描脚本生成。  
> Date: 2026-07-16（深审重写 · 去掉机械套话）

## Design Read（本批）

Reading this as: **AI 学情分析 Tab/卡片编排 · 申诉处理四卡 · 归档卷创建向导 + 列表/详情子面板**，考试阅卷工作台密态 — 禁大粉黄 Alert 墙，归档与 portfolio/quality 分 Scope。

| Dial | Value |
|------|------:|
| Taste VARIANCE / MOTION / DENSITY | 3 / 2 / 8 |
| Finesse SPECTACLE / DENSITY | 2 / 8 |
| Impeccable register | product |

---

## 451. `AiAnalysisTeachingTab.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/ai-analysis/AiAnalysisTeachingTab.vue` |
| 行数 | 104 |
| 调用 | `ai-analysis-center.vue`（唯一） |
| Props | `reloadToken` |
| 行为 | `useAiAnalysisScopeContext` + `useMarkExamRoster` watch 拉名册；编排 `AiAnalysisExamScopePanel` + 4 张 embedded 卡片 |

**Impeccable：** Tab 编排层，scope/roster 与卡片 props 边界清楚，无业务假数据。  
**Finesse：** 纵向 `gap:16px`，无重复顶栏。  
**Taste：** 纯编排无装饰 KPI；符合 AI 分析密态。  

**判定：OK**  
**动作：** 保持薄编排；卡片四态留在子卡。  
**禁：** 在此 Tab 再叠考试 ContextBar 或说明横幅。

---

## 452. `AiAnalysisTrendTab.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/ai-analysis/AiAnalysisTrendTab.vue` |
| 行数 | 68 |
| 调用 | `ai-analysis-center.vue` |
| 行为 | `AiAnalysisOrgTermScopePanel` + `termLabel` computed；下挂 CrossExam / SemesterGrowth / CourseAchievement 三卡 |

**Impeccable：** 跨考趋势 Tab 纯编排，学期标签来自 scope composable。  
**Finesse：** 68 行薄壳，密度交给子卡。  
**Taste：** 无图表假填充。  

**判定：OK**  
**动作：** 保持。  
**禁：** Tab 内重复渲染 org/term 选择器。

---

## 453. `CourseAchievementCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/ai-analysis/cards/CourseAchievementCard.vue` |
| 行数 | 464 |
| 调用 | `AiAnalysisTrendTab.vue` |
| 结构 | `AiAnalysisSection` · `SignalBand` · `MarkTrendSection`+`MarkBarSection` · `AiObjectiveProgressRow` · `AiAnalysisMetaCollapse` |
| API | `generateAchievement` / `listAchievements`；`UiSkeletonState` 加载相 |

**Impeccable：** 完整 AI 达成度卡：历史选择、生成、图表、分目标列表、失败 meta 折叠。  
**Finesse：** 双图各 280px，inline SignalBand，密而不墙。  
**Taste：** `--dp-*`；禁假达成率装饰。  

**判定：OK**  
**动作：** 保持四态（loading/generating/record/empty 由子结构承担）。  
**禁：** 无 API 记录时画默认满格柱状图。

---

## 454. `CrossExamTrendCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/ai-analysis/cards/CrossExamTrendCard.vue` |
| 行数 | 591 |
| 调用 | `AiAnalysisTrendTab.vue` |
| Props | `drillClassId`/`drillClassLabel` + org/term scope 八项 |
| 结构 | `AiAnalysisSection` · 筛选 · 趋势图 · `UiTag` 考试范围 |

**Impeccable：** 跨考对比主卡，drill 班级与 scope 合同齐全。  
**Finesse：** 591 行偏重但单卡职责收敛。  
**Taste：** 图表系列色走 mark-echarts 工具链。  

**判定：OK**  
**动作：** 保持 scope 未齐时空态，不猜默认学年。  
**禁：** 未知考试状态灰色兜底文案。

---

## 455. `ExamQuestionCourseGoalMappingTable.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/ai-analysis/cards/ExamQuestionCourseGoalMappingTable.vue` |
| 行数 | 319 |
| 调用 | `ExamQuestionCourseGoalMappingCard.vue` |
| Props | `loading` `courseGoalConfigured` `readiness` `courseGoals` `rows` `goalOptions` |

**Impeccable：** 题-目标映射表，readiness 与配置态由父卡传入。  
**Finesse：** 表格式密排，非独立页。  
**Taste：** 严格枚举 label，无宽化 Record。  

**判定：OK**  
**动作：** 保持嵌入卡内，不升页。  
**禁：** 未配置时展示假映射行。

---

## 456. `ExperienceEffectivenessCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/ai-analysis/cards/ExperienceEffectivenessCard.vue` |
| 行数 | 676 |
| 调用 | `AiAnalysisSchoolTab.vue` |
| 结构 | `AiAnalysisSection` · 表格 + SignalBand · 生成/历史 API |

**Impeccable：** 校级体验有效性分析卡，失败 toast + 空态分支。  
**Finesse：** 676 行单卡偏重，仍属一业务面。  
**Taste：** 与 trend 卡同 register，无营销壳。  

**判定：OK**  
**动作：** 保持。  
**禁：** 无记录时展示合成有效率。

---

## 457. `QuestionAnswerCorrectionDialog.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/ai-analysis/cards/QuestionAnswerCorrectionDialog.vue` |
| 行数 | 443 |
| 调用 | `QuestionAnalysisCard.vue` |
| 结构 | `a-modal` 720px · 双层 dense `UiAlertStrip` · 客观/数值/填空分支表单 |
| 行为 | `destroy-on-close`；提交走标准答案更正 API |

**Impeccable：** 更正弹窗合同完整，题型分支显式，生效配置 warning 条可见。  
**Finesse：** Alert 用 dense 非大墙。  
**Taste：** 模态内信息层级清楚。  

**判定：OK**  
**动作：** 保持 destroy-on-close。  
**禁：** 暗色全屏抽屉样式。

---

## 458. `SchoolQualityCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/ai-analysis/cards/SchoolQualityCard.vue` |
| 行数 | 548 |
| 调用 | `AiAnalysisSchoolTab.vue` |
| 结构 | 同 AI 卡族：`AiAnalysisSection` + SignalBand + 图表/列表 |

**Impeccable：** 校级质量 AI 卡，scope 五元组 props。  
**Finesse：** 密度与 sibling 卡一致。  
**Taste：** 无 pseudo-KPI 墙。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 假达成/假趋势。

---

## 459. `ScoreDistributionCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/ai-analysis/cards/ScoreDistributionCard.vue` |
| 行数 | 220 |
| 调用 | `statistics.vue`（非 ai-analysis-center） |
| 结构 | `WorkbenchSurfaceCard` · `a-select` 班级 · `SignalBand` · `MarkBarSection` 300px |
| API | `getExamScoreDistribution` |

**Impeccable：** 统计页分数分布卡，班级筛选 emit 回父页。  
**Finesse：** 220 行紧凑，histogram hint 含及格率文案。  
**Taste：** /workbench 卡壳与 AI 卡族分场景，合理。  

**判定：OK**  
**动作：** 保持挂在 statistics 域。  
**禁：** 强行迁入 ai-analysis Tab 造成双入口。

---

## 460. `SemesterGrowthCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/ai-analysis/cards/SemesterGrowthCard.vue` |
| 行数 | 709 |
| 调用 | `AiAnalysisTrendTab.vue` |
| 结构 | drill 班级 + 学期成长趋势图/表 |

**Impeccable：** 学期成长主卡，与 CrossExam 并列。  
**Finesse：** 709 行偏重，实现波次可拆子表。  
**Taste：** 图表空描述明确。  

**判定：OK**  
**动作：** 保持 scope 门禁。  
**禁：** 无数据默认上升曲线。

---

## 461. `BatchCorrectionPlansCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/appeal-handle/BatchCorrectionPlansCard.vue` |
| 行数 | 1021 |
| 调用 | `appeal-handle.vue` |
| 结构 | `WorkbenchSurfaceCard` · `UiFilterBar`+`UiDataTable` · `UiDrawer` 840px 内嵌 `a-form` 多段审批/执行流 |
| Props | `examId` `reloadToken` `scorePolicy` |

**Impeccable：** 批量更正计划全功能单卡：列表+新建+审批动作链，合同完整。  
**Finesse：** **1021 行单体过重** — 列表/抽屉/表单宜拆但须保 API。  
**Taste：** 头部 flow-hint 一行，无装饰 KPI。  

**判定：TUNE**  
**动作：** 实现波次按「列表 / 新建抽屉 / 行内动作」拆文件，不改对外 props。  
**禁：** 同页再叠第二套筛选条。

---

## 462. `CorrectionsCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/appeal-handle/CorrectionsCard.vue` |
| 行数 | 565 |
| 调用 | `appeal-handle.vue` |
| 结构 | `UiFilterBar`+`UiDataTable` · 单条纠正新建模态 |

**Impeccable：** 单条纠正列表卡，分值列 mono 样式，动作完整。  
**Finesse：** 565 行可接受，低于 Batch 计划卡体量。  
**Taste：** 与 461 同 appeal-section 壳，一致。  

**判定：OK**  
**动作：** 保持。  
**禁：** 未知审批状态灰色 Tag。

---

## 463. `ReviewRequestsCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/appeal-handle/ReviewRequestsCard.vue` |
| 行数 | 491 |
| 调用 | `appeal-handle.vue` |
| Props | `examId` |

**Impeccable：** 成绩复核申请列表，枚举 label 映射。  
**Finesse：** 491 行表格卡，密度正常。  
**Taste：** 无重复考试身份条。  

**判定：OK**  
**动作：** 保持失败 toast。  
**禁：** 空列表伪装成功提示。

---

## 464. `ReviewWindowPolicyCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/appeal-handle/ReviewWindowPolicyCard.vue` |
| 行数 | 286 |
| 调用 | `appeal-handle.vue` |
| 结构 | `a-form` 日期/次数/范围 · **`a-button type="primary"`** 保存链（与同页 UiButton 混用） |

**Impeccable：** 复核窗口策略表单，状态 Tag + flow-hint。  
**Finesse：** 286 行适中；Ant Primary 与 UiButton 双轨。  
**Taste：** 表单密排无横幅墙。  

**判定：OK**  
**动作：** 实现波次统一为 UiButton variant。  
**禁：** 未加载 policy 时展示默认开放窗口。

---

## 465. `TaskArchivePlanStep.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/archive-task-create/TaskArchivePlanStep.vue` |
| 行数 | 331 |
| 调用 | `archive-task-create.vue` |
| 行为 | 模板套选择、保管期限、归档方案校验 |

**Impeccable：** 向导第三步，模板/保留规则与 exam 表单联动。  
**Finesse：** 步骤内表单密度正常。  
**Taste：** 归档域，禁 portfolio Scope 壳。  

**判定：OK**  
**动作：** 材料登记走归档专用 modal。  
**禁：** 名册 BatchImport 冒充归档登记。

---

## 466. `TaskBasicInfoStep.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/archive-task-create/TaskBasicInfoStep.vue` |
| 行数 | 350 |
| 调用 | `archive-task-create.vue` |
| Props | `basicRules` |

**Impeccable：** 任务基本信息步，校验规则外置。  
**Finesse：** 350 行单步可接受。  
**Taste：** 向导分段标题，非营销 hero。  

**判定：OK**  
**动作：** 保持。  
**禁：** 混用 quality 表单壳。

---

## 467. `TaskConfirmStep.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/archive-task-create/TaskConfirmStep.vue` |
| 行数 | 156 |
| 调用 | `archive-task-create.vue` |
| Props | `provenanceLabel` |

**Impeccable：** 确认步只读摘要，provenance 标签来自上游。  
**Finesse：** 156 行薄确认页。  
**Taste：** 枚举展示严格。  

**判定：OK**  
**动作：** 保持。  
**禁：** 确认页可编辑关键字段。

---

## 468. `TaskProvenanceStep.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/archive-task-create/TaskProvenanceStep.vue` |
| 行数 | 103 |
| 调用 | `archive-task-create.vue` |
| 结构 | 主路径大按钮卡（`--dp-*` border active）+ `UiTextAction` 次级入口 |
| 行为 | `useInjectedArchiveTaskCreateWizardState` |

**Impeccable：** 来源选择一步，推荐/历史/Excel 分流清楚。  
**Finesse：** 103 行，主路径视觉权重正确。  
**Taste：** **好样板** — 非对称主次，无渐变营销卡。  

**判定：OK**  
**动作：** 保持推荐 Tag + 次级文字链。  
**禁：** 三入口同等大卡片墙。

---

## 469. `ArchiveCollectionRejectDialog.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/ArchiveCollectionRejectDialog.vue` |
| 行数 | 93 |
| 调用 | `archive-volume-detail.vue` |
| 结构 | `a-modal` · 自定义 `#footer` 用 `UiButton` |
| Token | `color: var(--nybc-text-secondary, #666)` 提示文案 |

**Impeccable：** 驳回收材原因必填，API 失败可见。  
**Finesse：** 93 行小模态，恰当。  
**Taste：** 遗留 `--nybc-*` fallback；实现波次改 `--dp-text-secondary`。  

**判定：OK**  
**动作：** 保持 destroy-on-close。  
**禁：** 无原因静默驳回。

---

## 470. `ArchiveSetupGuideBanner.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/ArchiveSetupGuideBanner.vue` |
| 行数 | 105 |
| 调用 | `archive-volume-list.vue` |
| 结构 | 三态 **`UiAlertStrip dense`**：失败 / 加载 / 未就绪清单 |
| 行为 | `adminActionLinks` 仅保留 `ROLES` 平台入口 |

**Impeccable：** 列表页就绪提示，missingItems 列表 + 任务设置引导。  
**Finesse：** **好样板** — compact Alert 非大粉黄墙。  
**Taste：** info/warning tone 语义正确。  

**判定：OK**  
**动作：** 保持 dense + 单条清单 ul。  
**禁：** 未就绪时 blocking 全屏说明。

---

## 471. `ArchiveTemplateSetPreviewDrawer.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/ArchiveTemplateSetPreviewDrawer.vue` |
| 行数 | 418 |
| 调用 | `ArchiveVolumeTemplateSetsPanel.vue` |
| Props | `preview` `categoryGroupMap` `forkSourceSetCode` |

**Impeccable：** 模板套预览抽屉，分类分组展示。  
**Finesse：** 418 行预览合理。  
**Taste：** 禁「版本历史/恢复」产品语义（父面板 REWORK 项）。  

**判定：OK**  
**动作：** 保持只读预览。  
**禁：** 抽屉内做审计快照冒充版本管理。

---

## 472. `ArchiveTemplateSortableTableShell.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/ArchiveTemplateSortableTableShell.vue` |
| 行数 | 76 |
| 调用 | `ArchiveTemplateSetEditorDrawer.vue` |
| 行为 | `useArchiveTemplateTableSortable` + `defineModel` items · ghost `--dp-blue-50` |

**Impeccable：** **真壳有语义** — Sortable 挂载/刷新与 slot 透传，非 SHELL。  
**Finesse：** 76 行，拖拽反馈轻量。  
**Taste：** 表格 flat small。  

**判定：OK**  
**动作：** 保持 active watch 重挂 Sortable。  
**禁：** 再包一层无拖拽的「Sortable」名壳。

---

## 473. `ArchiveVolumeMemberManageDrawer.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/ArchiveVolumeMemberManageDrawer.vue` |
| 行数 | 170 |
| 调用 | `archive-volume-detail.vue` |
| Props | `open` `volumeId` `collaborators` |

**Impeccable：** 协作成员管理抽屉，增删确认链。  
**Finesse：** 170 行适中。  
**Taste：** UiDrawer 域一致。  

**判定：OK**  
**动作：** destroy-on-close 防脏协作列表。  
**禁：** 暗色监控抽屉。

---

## 474. `ArchiveVolumeMineRemediationBanner.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/ArchiveVolumeMineRemediationBanner.vue` |
| 行数 | 161 |
| 调用 | `archive-volume-list.vue` |
| 结构 | 1 条 / 多条整改 **`UiAlertStrip dense`** + `UiTag` 诊断码 |

**Impeccable：** 我的整改任务横幅，定密/普改文案分叉。  
**Finesse：** **好样板** — 多任务列表嵌在 strip 内，非卡片墙。  
**Taste：** warning tone + 主按钮单一 CTA。  

**判定：OK**  
**动作：** 保持 dense 列表态。  
**禁：** 每项整改再包独立大 Card。

---

## 475. `DepartmentReviewListDrawer.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/DepartmentReviewListDrawer.vue` |
| 行数 | 229 |
| 调用 | `archive-volume-list.vue` |

**Impeccable：** 院系审核列表抽屉，卷级审核入口。  
**Finesse：** 229 行。  
**Taste：** Tag 状态映射严格。  

**判定：OK**  
**动作：** 保持。  
**禁：** 与详情页审核面板双入口无区分。

---

## 476. `ArchiveFlowContextBar.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/ArchiveFlowContextBar.vue` |
| 行数 | 117 |
| 调用 | `archive-volume-detail.vue` |
| 结构 | 标题/subtitle · prev/next `UiButton` · **pipeline 条**（`showPipeline` 可关） |
| 遗留 | BEM 前缀 `exam-flow-ctx-bar__`（考试流继承名） |

**Impeccable：** 详情顶栏导航 + 链步骤 badgeCount，收材期可隐藏管道。  
**Finesse：** 管道条密排，竞品对标注释明确。  
**Taste：** ghost 导航键，非大 Step 组件。  

**判定：OK**  
**动作：** 实现波次可重命名为 `archive-flow-ctx-bar`（纯样式）。  
**禁：** 与 SubmitProgressBand 双主进度条同时全展。

---

## 477. `ArchiveFourPropertyGrid.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/ArchiveFourPropertyGrid.vue` |
| 行数 | 29 |
| 调用 | `ArchiveVolumeIntegrityPanel.vue` |
| 行为 | `buildFourPropertyDimensionViews(check)` 纯展示网格 |

**Impeccable：** 四性检测展示子件，逻辑在 util。  
**Finesse：** 29 行 presentation-only，合理。  
**Taste：** pass/fail 色 class，无图标库依赖。  

**判定：OK**  
**动作：** 保持嵌入完整性面板。  
**禁：** 抽成无 props 的「四性 Card」空壳。

---

## 478. `ArchiveScanBatchReviewPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/ArchiveScanBatchReviewPanel.vue` |
| 行数 | 276 |
| 调用 | `archive-volume-detail.vue` |
| Props | `volumeId` `canReview` |

**Impeccable：** 扫描批次审核面板，权限门控。  
**Finesse：** 276 行表格+模态。  
**Taste：** 归档 scan 子链，非 mark 阅卷台。  

**判定：OK**  
**动作：** 保持 canReview 门控。  
**禁：** 无权限仍展示通过按钮。

---

## 479. `ArchiveScanBatchSnapshotPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/ArchiveScanBatchSnapshotPanel.vue` |
| 行数 | 215 |
| 调用 | `archive-volume-detail.vue` |

**Impeccable：** 批次快照只读面板。  
**Finesse：** 215 行。  
**Taste：** Tag/枚举严格。  

**判定：OK**  
**动作：** 保持只读语义。  
**禁：** 快照面板内嵌编辑主链。

---

## 480. `ArchiveVolumeAccessPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/ArchiveVolumeAccessPanel.vue` |
| 行数 | 582 |
| 调用 | `archive-volume-detail.vue` |
| Props | `canRequestAccess` `canApproveAccessRecord` `materials` 等 |

**Impeccable：** 利用申请/审批全链，空态+失败可见。  
**Finesse：** 582 行偏重，宜后续拆申请/审批表。  
**Taste：** 无装饰 KPI。  

**判定：OK**  
**动作：** 保持权限 props 驱动按钮。  
**禁：** 默认展示全部审批动作。

---

## 481. `ArchiveVolumeAppraisalPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/ArchiveVolumeAppraisalPanel.vue` |
| 行数 | 1087 |
| 调用 | `archive-volume-detail.vue` |
| 结构 | toolbar **6+ `UiButton`**（鉴定/销毁/批准/驳回/执行/监销）· dense `UiAlertStrip` 指南 · 区块内**重复「发起鉴定」** |

**Impeccable：** 鉴定/销毁法定流程面板，状态 Tag 双轨（appraisal/destruction）。  
**Finesse：** **1087 行 + 工具栏按钮墙** — 须收成主/次动作或分段菜单。  
**Taste：** guide strip 用法正确，但 toolbar 与 section-actions 重复。  

**判定：TUNE**  
**动作：** 合并重复 CTA；toolbar 按状态只露 2–3 个主操作。  
**禁：** 六按钮同权重横排。

---

## 482. `ArchiveVolumeCatalogEditor.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/ArchiveVolumeCatalogEditor.vue` |
| 行数 | 287 |
| 调用 | `archive-volume-detail.vue` |
| 子件 | `ArchiveVolumeCatalogPreview` |

**Impeccable：** 目录编辑+预览，readonly/catalogStatus 门控。  
**Finesse：** 287 行。  
**Taste：** 表格编辑密态。  

**判定：OK**  
**动作：** 保持。  
**禁：** 未锁定目录允许拖拽排序。

---

## 483. `ArchiveVolumeCatalogPreview.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/ArchiveVolumeCatalogPreview.vue` |
| 行数 | 88 |
| 调用 | `ArchiveVolumeCatalogEditor.vue` |
| Props | `lines` `catalogStatus` |

**Impeccable：** 目录只读预览子件。  
**Finesse：** 88 行薄预览。  
**Taste：** Empty 当 lines 空。  

**判定：OK**  
**动作：** 保持嵌入编辑器。  
**禁：** 升独立路由页。

---

## 484. `ArchiveVolumeEventsPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/ArchiveVolumeEventsPanel.vue` |
| 行数 | 88 |
| 调用 | `archive-volume-detail.vue` |
| 子件 | `ArchiveVolumeEventsTimeline` |

**Impeccable：** 事件面板包装，events props 下传。  
**Finesse：** 88 行薄包装有明确边界。  
**Taste：** 与 audit 时间线一致。  

**判定：OK**  
**动作：** 保持。  
**禁：** 在面板内再套 Gi 时间线壳。

---

## 485. `ArchiveVolumeEventsTimeline.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/ArchiveVolumeEventsTimeline.vue` |
| 行数 | 58 |
| 调用 | `ArchiveVolumeEventsPanel.vue` |
| 结构 | `UiEmpty` · `audit-timeline` 倒序 · `archiveVolumeEventTypeLabel` |

**Impeccable：** 事件流水展示，reason 优先其次状态变更摘要。  
**Finesse：** 58 行轻时间线，无重型 Steps。  
**Taste：** 空态文案说明后续会有记录。  

**判定：OK**  
**动作：** 保持倒序。  
**禁：** 未知 eventType 英文直出。

---

## 486. `ArchiveVolumeIntegrityPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/ArchiveVolumeIntegrityPanel.vue` |
| 行数 | 679 |
| 调用 | `archive-volume-detail.vue` |
| 子件 | `ArchiveFourPropertyGrid` |
| Props | `displayedIntegrityResult` `canWaive*` 等 waive 权限 |

**Impeccable：** 完整性检测+四性+豁免动作，合同字段多但属单业务面。  
**Finesse：** 679 行偏重。  
**Taste：** 诊断可见，非绿勾假通过。  

**判定：OK**  
**动作：** 保持 waive 权限门控。  
**禁：** 检测失败默认可提交。

---

## 487. `ArchiveVolumeMaterialTablePanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/ArchiveVolumeMaterialTablePanel.vue` |
| 行数 | 981 |
| 调用 | `archive-volume-detail.vue` |
| 结构 | toolbar **7 个 outline 按钮** · 自定义 `material-status-icon` · `UiAlertStrip` 统计失败 · server 分页表 |

**Impeccable：** 材料登记主面板，多入口（上传/扫描/批量/同步/引用）业务真实。  
**Finesse：** **981 行 + 工具栏按钮过多** — 应收进「更多」或分组菜单。  
**Taste：** load-error 行内重试正确；mapping hint + RouterLink 去统计页。  

**判定：TUNE**  
**动作：** toolbar 主留「登记材料」「一体机扫描」，余者收入口菜单。  
**禁：** 七按钮同排竞争视觉。

---

## 488. `ArchiveVolumeMaterialTreePanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/ArchiveVolumeMaterialTreePanel.vue` |
| 行数 | 332 |
| 调用 | `archive-volume-detail.vue` |
| Token | scoped `#fff` 一处（树选中背景） |

**Impeccable：** 目录树+缺项提示，与表 panel 并列视图。  
**Finesse：** 332 行。  
**Taste：** 实现波次 `#fff`→`var(--dp-bg-base)`。  

**判定：OK**  
**动作：** 保持树表分工。  
**禁：** 树与表双写登记主链。

---

## 489. `ArchiveVolumeNextStepsPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/ArchiveVolumeNextStepsPanel.vue` |
| 行数 | 161 |
| 调用 | `archive-volume-detail.vue` |
| Props | `actions` `examId` `volumeId` |

**Impeccable：** 详情右侧下一步动作列表，来自后端 actions。  
**Finesse：** 161 行轻引导面板。  
**Taste：** 非装饰 checklist。  

**判定：OK**  
**动作：** 保持 actions 驱动。  
**禁：** 写死假「已完成」步骤。

---

## 490. `ArchiveVolumeOcrSearchPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/ArchiveVolumeOcrSearchPanel.vue` |
| 行数 | 615 |
| 调用 | `archive-volume-detail.vue` |
| Props | `volumeId` `canRegisterMaterial` |

**Impeccable：** 卷内 OCR 检索面板，权限与材料登记联动。  
**Finesse：** 615 行单功能可接受。  
**Taste：** 检索空态明确。  

**判定：OK**  
**动作：** 保持 canRegisterMaterial 门控。  
**禁：** 无 OCR 结果时展示占位高亮块。

---

## Batch 23 小结

| 判定 | 数量 | 代表 |
|------|-----:|------|
| OK | 37 | `ArchiveSetupGuideBanner` dense strip · `TaskProvenanceStep` 主次入口 · `ArchiveTemplateSortableTableShell` 真 Sortable 壳 |
| TUNE | 3 | `BatchCorrectionPlansCard` L1021 · `ArchiveVolumeAppraisalPanel` 按钮墙 · `ArchiveVolumeMaterialTablePanel` 七按钮 toolbar |
| REWORK | 0 | — |
| SHELL | 0 | — |
| DEAD? | 0 | — |

**域注：** AI 卡族统一 `AiAnalysisSection`+图表四态；申诉四卡共享 `appeal-section`/`WorkbenchSurfaceCard`；归档列表横幅是 **compact Alert 好样板**，详情大面板注意 toolbar 去重。
