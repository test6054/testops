# 组件手审账 · Batch 20

> 方法：逐文件 Read 源码 + 路径限定引用核对（排除 `components.d.ts`）。  
> Skills：**Impeccable product** · **Finesse product** · **Taste audit-only**  
> Gate：**frontend-design-mark**（`#1677ff` · 浅色 · `--dp-*` · 禁营销壳）  
> 禁令：结论禁止由扫描脚本生成。  
> Date: 2026-07-16（深审重写 · 去掉机械套话）

## Design Read（本批）

Reading this as: **kiosk scan ops / AI analysis cards / archive gates & template admin / marking overview dashboard / layout-designer chrome**, product workbench — not marketing.

| Dial | Value |
|------|------:|
| Taste VARIANCE / MOTION / DENSITY | 3 / 2 / 8 |
| Finesse SPECTACLE / DENSITY | 2 / 8 |
| Impeccable register | product |

---

## 331. `KioskScanExceptionPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/components/KioskScanExceptionPanel.vue` |
| 行数 | 482 |
| Props | `open` `pageNo` `paperInstanceId` |
| 调用 | ScanningStage · ReviewStage |
| 行为 | 边扫边绑；strict-enum 考生/页状态；占缩略图列非遮罩 |

**Impeccable：** 一体机异常修正主链，BINDING_CONFLICT 须显式 paperInstanceId。  
**Finesse：** 侧栏操作密度优先，符合 kiosk。  
**Taste：** Web 勿抄暗色/大触控。  

**判定：OK**  
**动作：** 保持 Agent 合同。  
**禁：** 绑定失败静默当成功。

---

## 332. `KioskScanSessionStrip.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/components/KioskScanSessionStrip.vue` |
| 行数 | 179 |
| 调用 | ScanningStage · ReviewStage |

**Impeccable：** 当前扫描会话条，状态可读。  
**Finesse：** 单行条，密。  
**Taste：** kiosk 域。  

**判定：OK**  
**动作：** 保持。  
**禁：** Web ContextBar 套用本条皮肤。

---

## 333. `KioskSessionBatchPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/components/KioskSessionBatchPanel.vue` |
| 行数 | 378 |
| Props | `variant` |
| 调用 | ScanningStage · SetupStage |

**Impeccable：** 会话批次面板，Setup/扫描共用。  
**Finesse：** 触控列表密度。  
**Taste：** Web 勿抄。  

**判定：OK**  
**动作：** 保持。  
**禁：** 批次失败假完成。

---

## 334. `AiGenerationProgressPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/ai-analysis/cards/AiGenerationProgressPanel.vue` |
| 行数 | 131 |
| Props | `title` `active` `waitingText` |
| 调用 | AiAnalysisCardBody · QuestionAnalysisCard |
| Token | `--dp-*` · pulse 用 `#1677ff`；`prefers-reduced-motion` 已关动画 |

**Impeccable：** 生成中明示「等待真实分析结果」，防假空。  
**Finesse：** 文案密；pulse 略抬 MOTION（可接受，已减动效）。  
**Taste：** 品牌色正确。  

**判定：OK**  
**动作：** 保持等待文案诚实。  
**禁：** 超时自动填样例数据。

---

## 335. `ClassWeaknessCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/ai-analysis/cards/ClassWeaknessCard.vue` |
| 行数 | 256 |
| 调用 | statistics · AiAnalysisTeachingTab |
| 结构 | Shell/Body + `AiWeaknessRow` |

**Impeccable：** 班级薄弱点卡；L0/考试内双入口。  
**Finesse：** 卡密度正常。  
**Taste：** 禁假达成色。  

**判定：OK**  
**动作：** 保持双入口同卡。  
**禁：** 逻辑分叉两套 API。

---

## 336. `ErrorCauseClusterCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/ai-analysis/cards/ErrorCauseClusterCard.vue` |
| 行数 | 207 |
| 调用 | statistics · ClusterWorkbench |
| 结构 | 用 `AiClusterTile` |

**Impeccable：** 错因聚类卡。  
**Finesse：** 207 行克制。  
**Taste：** 禁置信度。  

**判定：OK**  
**动作：** 保持。  
**禁：** 未知枚举灰「未知」。

---

## 337. `RejudgePlanCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/ai-analysis/cards/RejudgePlanCard.vue` |
| 行数 | 437 |
| 调用 | statistics · ClusterWorkbench |

**Impeccable：** 复评计划建议卡。  
**Finesse：** 体量中等。  
**Taste：** 建议须可追溯到题号/范围。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 空计划当「无需复评」假成功。

---

## 338. `StudentLearningProfileCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/ai-analysis/cards/StudentLearningProfileCard.vue` |
| 行数 | 439 |
| Token | `--dp-*` |
| 调用 | statistics · TeachingTab |

**Impeccable：** 学生学习画像卡；学生搜索/名册加载态齐全。  
**Finesse：** 密度高。  
**Taste：** 干净。  

**判定：OK**  
**动作：** 保持。  
**禁：** 画像失败用空画像冒充。

---

## 339. `TeachingImprovementCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/ai-analysis/cards/TeachingImprovementCard.vue` |
| 行数 | 256 |
| 调用 | statistics · TeachingTab |
| 结构 | `AiRecommendationBlock` |

**Impeccable：** 教学改进建议卡。  
**Finesse：** 正常。  
**Taste：** 「AI 建议」标签可接受，勿营销 Hero。  

**判定：OK**  
**动作：** 保持。  
**禁：** 建议区堆渐变卡。

---

## 340. `ArchiveTemplateSetEditorDrawer.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/ArchiveTemplateSetEditorDrawer.vue` |
| 行数 | 402 |
| 调用 | platform-template-admin · TemplateSetsPanel |
| Token | `--dp-*` |

**Impeccable：** 归档模板套材料/自检编辑抽屉。  
**Finesse：** 表单密。  
**Taste：** 归档域，非名册 Excel。  

**判定：OK**  
**动作：** 保持。  
**禁：** 用名册导入模态编辑模板材料。

---

## 341. `ArchiveVolumeCollaboratorStrip.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/ArchiveVolumeCollaboratorStrip.vue` |
| 行数 | 74 |
| Props | `collaborators` `canManage` |
| 调用 | archive-volume-detail · TaskSettingsDrawer |

**Impeccable：** 协作者条，权限位清晰。  
**Finesse：** 紧凑条，好。  
**Taste：** 干净。  

**判定：OK**  
**动作：** 保持。  
**禁：** 扩成人员 KPI 墙。

---

## 342. `ArchiveVolumeTemplateSetsPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/ArchiveVolumeTemplateSetsPanel.vue` |
| 行数 | 973 |
| 调用 | platform-template-admin · archive-volume-settings |
| 行为 | 平台/租户模板套表；复制；**「模板版本历史」Drawer +「恢复此版本」**（实为 `auditId` 审计快照） |
| Token | `--dp-*`；展示 `releaseTag` |

**Impeccable：** 模板套管理主面板；审计回滚能力存在，但 IA 文案做成「版本历史/恢复此版本」，与 mark「禁止业务版本化读取模型、追溯用审计」口径冲突。  
**Finesse：** 973 行过重；一键复制条可接受。  
**Taste：** releaseTag 蓝标勿演变成成绩/答案版本徽章。  

**判定：REWORK**  
**动作：** 文案改为「审计快照 / 回滚到该审计」；评估是否保留一键恢复；拆分平台/租户子面板降行数。  
**禁：** 扩展为模板/成绩/发布多版本注册中心。

---

## 343. `DepartmentReviewMaterialSummary.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/DepartmentReviewMaterialSummary.vue` |
| 行数 | 226 |
| 调用 | DepartmentReviewListDrawer · DepartmentReviewPanel |

**Impeccable：** 院系评审材料摘要。  
**Finesse：** 摘要密。  
**Taste：** `--dp-*`。  

**判定：OK**  
**动作：** 保持。  
**禁：** 与 portfolio 评审混 Scope。

---

## 344. `ArchiveVolumeMaterialTagModal.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/ArchiveVolumeMaterialTagModal.vue` |
| 行数 | 89 |
| 调用 | archive-volume-search · MaterialTablePanel |

**Impeccable：** 材料打标签模态，归档专用。  
**Finesse：** 小模态。  
**Taste：** 干净。  

**判定：OK**  
**动作：** 保持。  
**禁：** 名册 Excel 模态冒充打标。

---

## 345. `ArchiveVolumeSubmitTaskList.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/ArchiveVolumeSubmitTaskList.vue` |
| 行数 | 103 |
| Props | `items` `readonly` |
| 调用 | SubmitProgressBand · SubmitChecklistModal |

**Impeccable：** 提交任务清单复用核。  
**Finesse：** 列表密。  
**Taste：** 干净。  

**判定：OK**  
**动作：** 保持单核。  
**禁：** Band/Modal 各写一套清单。

---

## 346. `ScanDispatchForceReleaseDialog.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/ScanDispatchForceReleaseDialog.vue` |
| 行数 | 98 |
| 调用 | scanner-ops ScanExceptionPanel · ScanDispatchPanel |

**Impeccable：** 派单强制释放确认，运维高风险动作。  
**Finesse：** 对话框紧凑。  
**Taste：** 应用 warning dense，勿大门禁色块。  

**判定：OK**  
**动作：** 保持二次确认。  
**禁：** 无确认一键释放。

---

## 347. `ArchiveEvalCampaignScopeSummary.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/archive-volume/ArchiveEvalCampaignScopeSummary.vue` |
| 行数 | 59 |
| 调用 | archive-volume-eval-campaign |

**Impeccable：** 评建批次范围摘要。  
**Finesse：** 短摘要，好。  
**Taste：** `--dp-*`。  

**判定：OK**  
**动作：** 保持。  
**禁：** 扩成三列装饰 KPI。

---

## 348. `ArchiveExamAutoCreateStatus.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/archive-volume/ArchiveExamAutoCreateStatus.vue` |
| 行数 | 108 |
| 调用 | archive-volume-exam-progress |
| Props | 含失败/超时/重试/非 owner 提示 |

**Impeccable：** 自动建卷状态，失败与超时可见。  
**Finesse：** 状态条密。  
**Taste：** 好。  

**判定：OK**  
**动作：** 保持失败文案。  
**禁：** 超时当成功建卷。

---

## 349. `ArchiveExamExportTasksCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/archive-volume/ArchiveExamExportTasksCard.vue` |
| 行数 | 346 |
| 调用 | archive-volume-exam-progress |

**Impeccable：** 考试归档导出任务卡（现网相关能力，非死 RelatedLinks）。  
**Finesse：** 346 行可再收。  
**Taste：** `--dp-*`。  

**判定：OK**  
**动作：** 保持创建权限位。  
**禁：** 与死 `ArchiveRelatedLinksCard` 双轨。

---

## 350. `ArchiveExamScoreGatePanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/archive-volume/ArchiveExamScoreGatePanel.vue` |
| 行数 | 266 |
| Props | `gate` `loading` `showStats` |
| 调用 | ArchiveVolumeScoresPanel |
| 结构 | 门禁行（pass/pending/异常）+ 可选三统计 |

**Impeccable：** 成绩门禁检查表，零卷口径文案明确。  
**Finesse：** 主链是 checklist；`showStats` 三格勿默认开成 KPI 墙。  
**Taste：** Tag 语义清楚。  

**判定：OK**  
**动作：** 默认以门禁行为主；stats 仅详情需要时开。  
**禁：** 门禁失败仍显示全绿。

---

## 351. `ArchiveLifecyclePipeTrack.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/archive-volume/ArchiveLifecyclePipeTrack.vue` |
| 行数 | 171 |
| 调用 | ArchiveLifecyclePipe |
| Props | `steps` `clickable` |

**Impeccable：** 归档生命周期轨可视化。  
**Finesse：** 轨密度合适。  
**Taste：** `--dp-*`。  

**判定：OK**  
**动作：** 保持。  
**禁：** 做成营销 progress 彩虹条。

---

## 352. `ArchivePackageTimeline.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/archive-volume/ArchivePackageTimeline.vue` |
| 行数 | 130 |
| Props | `steps: ArchiveVolumeExamArchivePackageTimelineStepVO[]` |
| 调用 | archive-volume-exam-progress（现网真源） |
| 对照 | Batch18 `ArchivePackageEventTimeline` 为死分叉 |

**Impeccable：** 打包步骤时间线真源；failed/active/done 点色可辨。  
**Finesse：** 空态文案清楚。  
**Taste：** 干净。  

**判定：OK**  
**动作：** 只维护本组件。  
**禁：** 再挂 EventTimeline 双轨。

---

## 353. `ExamArchiveGateBanner.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/archive-volume/ExamArchiveGateBanner.vue` |
| 行数 | 223 |
| 调用 | score-publish |
| 行为 | dense `UiAlertStrip`；失败 strip；可选班级进度小表 |

**Impeccable：** 成绩发布页归档门禁，加载失败可见；compact+表可组合。  
**Finesse：** **好样板**（dense strip，非全宽粉黄大门禁）。  
**Taste：** 好。  

**判定：OK**  
**动作：** 其它门禁对齐此形态。  
**禁：** 换大 Alert 色块占满首屏。

---

## 354. `ExportTaskCenter.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/export/ExportTaskCenter.vue` |
| 行数 | 592 |
| 调用 | HeaderRightBar |

**Impeccable：** 顶栏导出任务中心。  
**Finesse：** 592 行偏重，但入口集中正确。  
**Taste：** 勿营销。  

**判定：OK**  
**动作：** 保持单入口。  
**禁：** 每域再造平行导出中心。

---

## 355. `AiClusterTile.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/analysis/AiClusterTile.vue` |
| 行数 | 26 |
| 调用 | ErrorCauseClusterCard |
| Props | `label` `proportionText` `description` `questionNos` `suggestion` |

**Impeccable：** 聚类块展示原子，题号+建议齐全。  
**Finesse：** 小 article，密。  
**Taste：** 无装饰渐变。  

**判定：OK**  
**动作：** 保持。  
**禁：** 加置信度百分比环。

---

## 356. `AiObjectiveProgressRow.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/analysis/AiObjectiveProgressRow.vue` |
| 行数 | 49 |
| 调用 | CourseAchievementCard |
| Props | `objective` `achievementRate` `status` `targetRate` |

**Impeccable：** 课程目标达成行。  
**Finesse：** 行级密度。  
**Taste：** 禁假绿。  

**判定：OK**  
**动作：** 保持。  
**禁：** 缺失目标率默认 100%。

---

## 357. `AiRecommendationBlock.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/analysis/AiRecommendationBlock.vue` |
| 行数 | 29 |
| 调用 | TeachingImprovementCard |

**Impeccable：** 建议块：区域 Tag + 严重度 + 建议正文。  
**Finesse：** 克制。  
**Taste：** 「AI 建议」标签克制。  

**判定：OK**  
**动作：** 保持。  
**禁：** 大紫色建议卡片。

---

## 358. `AiWeaknessRow.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/analysis/AiWeaknessRow.vue` |
| 行数 | 27 |
| 调用 | ClassWeaknessCard |

**Impeccable：** 薄弱点行原子。  
**Finesse：** 一行一事。  
**Taste：** 干净。  

**判定：OK**  
**动作：** 保持。  
**禁：** 行内进度彩虹条。

---

## 359. `AnalysisExamSelect.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/AnalysisExamSelect.vue` |
| 行数 | 138 |
| 调用 | ExperienceEffectivenessCard（仅 1） |
| 行为 | 自拉 `pageExams` + org scope；裸 `a-select` |
| 对照 | `MarkExamSelect`（外注入 options）双轨 |

**Impeccable：** AI 分析单考选择有 scope 查询语义，但与 `MarkExamSelect` 并行。  
**Finesse：** 自包含加载可接受。  
**Taste：** 应收敛到 UiSelect + 单一考试选择合同。  

**判定：TUNE**  
**动作：** 与 MarkExamSelect 合并或明确「自拉取 vs 注入」唯一 API；迁 UiSelect。  
**禁：** 第三套考试下拉。

---

## 360. `ApplyScoreToRemainingModal.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/ApplyScoreToRemainingModal.vue` |
| 行数 | 126 |
| Props | `open` `score` `remainingCount` `countdownSeconds` |
| 调用 | marking-task-detail |

**Impeccable：** 同题剩余卷应用给分确认，含倒计时门槛。  
**Finesse：** 模态密。  
**Taste：** `--dp-*`。  

**判定：OK**  
**动作：** 保持倒计时/确认。  
**禁：** 跳过确认批量写分。

---

## 361. `MarkingOverviewAnalytics.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/dashboard/MarkingOverviewAnalytics.vue` |
| 行数 | 148 |
| 调用 | marking-overview |
| 结构 | 三张 compact `UiCard` + `MarkBarSection`；空描述齐全 |

**Impeccable：** 总览分析区，空态诚实。  
**Finesse：** 三卡并置略「报表墙」，但均为真实分布图且 compact。  
**Taste：** 可接受；勿再加第四装饰卡。  

**判定：OK**  
**动作：** 保持 compact。  
**禁：** 同页再叠无筛选的 KPI 四卡。

---

## 362. `OngoingExamCardGrid.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/dashboard/OngoingExamCardGrid.vue` |
| 行数 | 359 |
| 调用 | marking-overview |
| 结构 | 考试卡：阶段 Tag + 进度条 + **四统计** + 进入；阻断描边 |

**Impeccable：** 进行中考试网格，阻断/扫描关注可见。  
**Finesse：** 四统计偏密；优于假 KPI，仍略卡墙。  
**Taste：** `--dp-*`；无渐变。  

**判定：TUNE**  
**动作：** 统计收为 2 关键+「更多」或行式 meta，降低卡面同权数字。  
**禁：** 无考试时用样例卡填充。

---

## 363. `PublishedExamInsightChart.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/dashboard/PublishedExamInsightChart.vue` |
| 行数 | 80 |
| 调用 | marking-overview |

**Impeccable：** 已发布考试洞察图。  
**Finesse：** 80 行克制。  
**Taste：** `--dp-*`。  

**判定：OK**  
**动作：** 保持。  
**禁：** 空 insights 画装饰假曲线。

---

## 364. `PublishedExamInsightTable.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/dashboard/PublishedExamInsightTable.vue` |
| 行数 | 121 |
| 调用 | marking-overview |

**Impeccable：** 已发布考试洞察表。  
**Finesse：** 表密度正常。  
**Taste：** 干净。  

**判定：OK**  
**动作：** 保持与 Chart 同数据源。  
**禁：** 表/图字段分叉。

---

## 365. `ExamExperienceAssistPolicyEnableModal.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/ExamExperienceAssistPolicyEnableModal.vue` |
| 行数 | 162 |
| 调用 | marking-experience-assist-policy |
| Props | 一致性率/汉明距/条数上限（非 confidence） |

**Impeccable：** 定标经验策略启用确认。  
**Finesse：** 参数表密。  
**Taste：** 好（无置信度命名）。  

**判定：OK**  
**动作：** 保持。  
**禁：** 字段改名为 confidence*。

---

## 366. `LayoutBlockLayerPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/layout-designer/LayoutBlockLayerPanel.vue` |
| 行数 | 199 |
| 调用 | LayoutDesignLayoutPhase |

**Impeccable：** 制卷图层列表。  
**Finesse：** 侧栏密。  
**Taste：** `--dp-*`。  

**判定：OK**  
**动作：** 保持。  
**禁：** 图层面板再套大页头。

---

## 367. `LayoutCanvasLite.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/layout-designer/LayoutCanvasLite.vue` |
| 行数 | 26 |
| 调用 | LayoutReviewDrawer |
| 结构 | 透传 props/emits → `LayoutCanvas`（无 readOnly/focusedQuestion 等增量） |

**Impeccable：** 无语义增量的别名壳。  
**Finesse：** —  
**Taste：** —  

**判定：SHELL**  
**动作：** ReviewDrawer 直引 `LayoutCanvas`（按需传 readOnly）。  
**禁：** 再加 CanvasLite2。

---

## 368. `LayoutCanvasToolbar.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/layout-designer/LayoutCanvasToolbar.vue` |
| 行数 | 138 |
| 调用 | LayoutCanvas |
| Props | zoom/grid/snap/tool/readOnly |

**Impeccable：** 画布工具条，编辑态控件集中。  
**Finesse：** 工具密，好。  
**Taste：** `--dp-*`。  

**判定：OK**  
**动作：** 保持。  
**禁：** 工具条加营销徽章。

---

## 369. `LayoutPreviewDrawer.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/layout-designer/LayoutPreviewDrawer.vue` |
| 行数 | 78 |
| Props | `previewPdfFileId` |
| 调用 | exam-layout-designer |

**Impeccable：** 制卷 PDF 预览抽屉。  
**Finesse：** 78 行克制。  
**Taste：** 干净。  

**判定：OK**  
**动作：** 保持。  
**禁：** 预览失败假空白页当成功。

---

## 370. `LayoutPropertyDrawer.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/layout-designer/LayoutPropertyDrawer.vue` |
| 行数 | 247 |
| Props | `document` `block` |
| 调用 | LayoutDesignLayoutPhase |

**Impeccable：** 块属性抽屉。  
**Finesse：** 表单密。  
**Taste：** `--dp-*`。  

**判定：OK**  
**动作：** 保持。  
**禁：** 与 QuestionPropertyPanel 字段合同分叉无文档。

---

## Batch 20 小结

| 判定 | # | 要点 |
|------|---:|------|
| OK | 36 | kiosk 异常/会话、AI 卡族、归档门禁好样板 `ExamArchiveGateBanner`、现网 `ArchivePackageTimeline`、导出中心、制卷工具条等 |
| TUNE | 2 | `AnalysisExamSelect` 与 MarkExamSelect 双轨；`OngoingExamCardGrid` 四统计偏卡墙 |
| REWORK | 1 | `ArchiveVolumeTemplateSetsPanel`「版本历史/恢复此版本」vs 审计快照口径 + 体积 |
| SHELL | 1 | `LayoutCanvasLite` 纯透传 |

**对照：** 打包时间线只认本批 `ArchivePackageTimeline`；门禁对齐 `ExamArchiveGateBanner` dense strip。
