# 组件手审账 · Batch 19

> 方法：逐文件 Read 源码 + 路径限定引用核对（排除 `components.d.ts`）。  
> Skills：**Impeccable product** · **Finesse product** · **Taste audit-only**  
> Gate：**frontend-design-mark**（`#1677ff` · 浅色 · `--dp-*` · 禁营销壳）  
> 禁令：结论禁止由扫描脚本生成。  
> Date: 2026-07-16（深审重写 · 去掉机械套话）

## Design Read（本批）

Reading this as: **AI-analysis card kit / archive dispatch / grading immersion / kiosk pick / portfolio cockpit ask**, product workbench density — not kit demos.

| Dial | Value |
|------|------:|
| Taste VARIANCE / MOTION / DENSITY | 3 / 2 / 8 |
| Finesse SPECTACLE / DENSITY | 2 / 8 |
| Impeccable register | product |

---

## 291. `AiAnalysisCardShell.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/analysis/AiAnalysisCardShell.vue` |
| 行数 | 54 |
| Props | `embedded` `title` `context` `headless` `cardClass` |
| 调用 | refs≈7（多张 AI 分析卡） |
| 行为 | `embedded`→`AiAnalysisSection`；否则 `WorkbenchSurfaceCard` |

**Impeccable：** L0/考试内双入口共用卡片壳，避免两套表面合同。  
**Finesse：** 无额外装饰层，只做容器切换。  
**Taste：** 无 eyebrow/渐变。  

**判定：OK**  
**动作：** 保持；新卡必须走此壳。  
**禁：** 卡片再包一层营销 Hero。

---

## 292. `AiAnalysisSection.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/analysis/AiAnalysisSection.vue` |
| 行数 | 34 |
| Props | `title` `context` `headless` |
| 调用 | refs≈7（含 Shell 与部分卡直用） |

**Impeccable：** embedded 标题行 + context/actions，职责清楚。  
**Finesse：** 单行头，密度对。  
**Taste：** 干净。  

**判定：OK**  
**动作：** 保持。  
**禁：** headless 时仍堆大标题。

---

## 293. `ArchiveDutyUserSelect.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/ArchiveDutyUserSelect.vue` |
| 行数 | 164 |
| 调用 | refs≈7（归档台账/整改/设置） |
| Token | `--dp-*` |

**Impeccable：** 归档责任人选择，归档卷域内复用。  
**Finesse：** 选择器密度正常。  
**Taste：** 勿混 portfolio 教师选择壳。  

**判定：OK**  
**动作：** 保持归档域。  
**禁：** 名册选人组件冒充归档责任人。

---

## 294. `MarkExamSelect.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/MarkExamSelect.vue` |
| 行数 | 68 |
| Props | `selectedExamId` `examOptions` `loading` `searching` `resolvingPinned`… |
| 调用 | refs≈7（教务同步/质量看板/审计/导出任务等） |
| 行为 | 远端 search；钉选 id 不在 options 时置空，防幽灵选中 |

**Impeccable：** 考试单选真源之一，合同含 pinned resolve。  
**Finesse：** 仍裸 `a-select`，与 `UiSelect` 双皮。  
**Taste：** 无营销。  

**判定：TUNE**  
**动作：** 迁 `UiSelect`（保留 search/pinned 语义）。  
**禁：** 再造第三套考试下拉。

---

## 295. `AiAnalysisHistorySelect.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/analysis/AiAnalysisHistorySelect.vue` |
| 行数 | 43 |
| Props | `rows` `loading` · `v-model` selectedId |
| 调用 | refs≈5 AI 卡 |
| 行为 | `formatAiAnalysisHistoryLabel` → `a-select`；无行则不渲染 |

**Impeccable：** 历史记录选择有标签格式语义，非纯透传。  
**Finesse：** 280–420 宽，合适。  
**Taste：** 应用 `UiSelect` 对齐。  

**判定：OK**  
**动作：** 可选迁 UiSelect；不必删。  
**禁：** 历史空列表时伪造默认成功项。

---

## 296. `ArchiveMaterialTagSelect.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/ArchiveMaterialTagSelect.vue` |
| 行数 | 80 |
| 调用 | refs≈5（检索/批量登记/派单/材料表） |

**Impeccable：** 归档材料标签选择，归档子链专用。  
**Finesse：** 密度正常。  
**Taste：** 非名册 Excel。  

**判定：OK**  
**动作：** 保持。  
**禁：** portfolio 材料标签混用本组件合同。

---

## 297. `AiAnalysisCardBody.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/analysis/AiAnalysisCardBody.vue` |
| 行数 | 38 |
| Props | `loading` `generating` `hasContent` `emptyDescription` `progressTitle` `progressWaitingText` |
| 调用 | refs≈4 |
| 行为 | `resolveAiAnalysisCardPhase` → skeleton / 生成进度 / empty / slot |

**Impeccable：** 四态相位门禁，失败/空与生成中分离，防假空成功。  
**Finesse：** 无装饰。  
**Taste：** 正确。  

**判定：OK**（纠正原 SHELL：有相位语义）  
**动作：** 保持为卡片统一 body。  
**禁：** 生成失败写成「暂无数据」。

---

## 298. `ExperienceAssistBadge.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/ExperienceAssistBadge.vue` |
| 行数 | 54 |
| Props | `applied` `sourceExamName` `consistencyRate` `clickable` |
| 调用 | refs≈4（复核/批阅 AI 抽屉/给分板） |
| 行为 | `applied` 才显示；可点开 AI 历史 |

**Impeccable：** 定标经验引用可见，一致率展示非置信度字段。  
**Finesse：** sm Tag，克制。  
**Taste：** purple tone 可接受作辅助语义。  

**判定：OK**  
**动作：** 保持；缺来源名显示「来源考试待补录」正确。  
**禁：** 引入 confidence 文案。

---

## 299. `DocumentKioskActivationGate.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/components/DocumentKioskActivationGate.vue` |
| 行数 | 54 |
| 调用 | refs≈4（派单落地/档案袋扫描会话等） |

**Impeccable：** 文档类一体机激活闸门（归档/档案袋派单）。  
**Finesse：** 闸门紧凑。  
**Taste：** kiosk 域，Web 勿抄暗色。  

**判定：OK**  
**动作：** 保持。  
**禁：** 未激活当已可扫。

---

## 300. `GiCellAvatar.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/GiCell/GiCellAvatar.vue` |
| 行数 | 362 |
| 调用 | refs≈3（`UiPendingList`/`UiWarningList`/HeaderRightBar） |
| Token | `--dp-*`；体积偏大（含上传 trigger） |

**Impeccable：** 头像+姓名单元格，Header 在用。  
**Finesse：** 362 行偏重；与待办 REWORK 卡耦合。  
**Taste：** Gi 命名遗留。  

**判定：TUNE**  
**动作：** 收敛上传分支；PendingList 治理时一并评估是否内联。  
**禁：** 新列表再扩 GiCell 家族。

---

## 301. `AnalysisExamMultiSelect.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/AnalysisExamMultiSelect.vue` |
| 行数 | 332 |
| 调用 | refs≈3（校级/学期增长/跨考趋势卡） |
| Props | 组织/学期 scope + `autoSelectScopedExams` |

**Impeccable：** 学情多考选择，带 scope 自动勾选。  
**Finesse：** 控件密，可接受。  
**Taste：** 勿叠 PortfolioScope。  

**判定：OK**  
**动作：** 保持。  
**禁：** 静默清空已选考试当成功。

---

## 302. `ConfidentialWatermarkLayer.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/ConfidentialWatermarkLayer.vue` |
| 行数 | 70 |
| Props | `lines` `density` |
| 调用 | refs≈3（`GradingWorkspaceLayout` / `ScanImageStage` / `WholePaperGallery`） |

**Impeccable：** 涉密水印强制层，打印/批阅门禁关键件。  
**Finesse：** 旋转网格 opacity 克制；dense 可调。  
**Taste：** `--dp-text-primary`，无荧光色。  

**判定：OK**  
**动作：** 涉密场景必须挂载。  
**禁：** 可关闭水印的「演示模式」旁路。

---

## 303. `GradingImmersionSection.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/GradingImmersionSection.vue` |
| 行数 | 83 |
| Props | `title` |
| 调用 | refs≈3（复核详情/工作台/任务信息卡） |
| Token | `--dp-surface/border` · panel radius |

**Impeccable：** 沉浸批阅分区容器，配合 `GradingWorkspaceLayout`。  
**Finesse：** 14px 标题，密度对，无 ContextBar 叠用。  
**Taste：** 干净。  

**判定：OK**  
**动作：** 保持。  
**禁：** 沉浸页再套 StageWorkbench ContextBar。

---

## 304. `MarkingScanMaterialPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/MarkingScanMaterialPanel.vue` |
| 行数 | 266 |
| Props | `sliceFileId` `sourceScanPage` `layoutPaperPage` `confidential` `examLabel` `watermarkLines` |
| 调用 | refs≈3 |

**Impeccable：** 批阅扫描材料主视区，涉密时叠水印。  
**Finesse：** 操作密度优先。  
**Taste：** 无营销。  

**判定：OK**  
**动作：** 保持与水印联动。  
**禁：** confidential=true 时省略水印层。

---

## 305. `ErrorPage.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/error/components/ErrorPage.vue` |
| 行数 | 182 |
| 调用 | refs≈3（ErrorBoundary / 403 / 404） |
| Token | `--dp-*` |

**Impeccable：** 错误页共用壳，失败可见。  
**Finesse：** 办理页尺度，非工作台内嵌。  
**Taste：** 勿堆插画营销。  

**判定：OK**  
**动作：** 保持。  
**禁：** 错误页假造成功 CTA 墙。

---

## 306. `KioskBoundStudentsPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/components/KioskBoundStudentsPanel.vue` |
| 行数 | 220 |
| 调用 | refs≈3（扫描/历史/复核阶段） |

**Impeccable：** 一体机已绑考生面板。  
**Finesse：** 触控密度。  
**Taste：** Web 勿抄。  

**判定：OK**  
**动作：** 保持。  
**禁：** 绑定失败静默。

---

## 307. `KioskDeviceActivationPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/components/KioskDeviceActivationPanel.vue` |
| 行数 | 217 |
| 调用 | refs≈3（TaskKindHub / ActivationGate / DocumentGate） |

**Impeccable：** 设备激活操作面，闸门复用。  
**Finesse：** compact 模式可用。  
**Taste：** kiosk 域。  

**判定：OK**  
**动作：** 保持。  
**禁：** Web 工作台嵌入本面板皮肤。

---

## 308. `ExamQuestionCourseGoalMappingCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/ai-analysis/cards/ExamQuestionCourseGoalMappingCard.vue` |
| 行数 | 259 |
| 调用 | refs≈3（statistics / ClusterWorkbench / exam-workspace） |
| Token | `--dp-*` |

**Impeccable：** 题-课程目标映射分析卡；L0 与考试内共用。  
**Finesse：** 卡片密度正常。  
**Taste：** 禁假达成色条。  

**判定：OK**  
**动作：** 保持双入口同卡。  
**禁：** 逻辑分叉两套 API。

---

## 309. `PaperQualityCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/ai-analysis/cards/PaperQualityCard.vue` |
| 行数 | 115 |
| Props | 含 `showSignalBand` |
| 调用 | refs≈3 |

**Impeccable：** 试卷质量卡；可选 SignalBand。  
**Finesse：** 115 行克制。  
**Taste：** SignalBand 勿改三列装饰 KPI 墙。  

**判定：OK**  
**动作：** 保持。  
**禁：** 空结果当满分质量。

---

## 310. `QuestionAnalysisCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/ai-analysis/cards/QuestionAnalysisCard.vue` |
| 行数 | 856 |
| 调用 | refs≈3 |
| Token | `--dp-*` |

**Impeccable：** 题目分析主卡，体量大但合同集中。  
**Finesse：** 856 行债；实现波次按表/图拆，非营销分区。  
**Taste：** 禁置信度列。  

**判定：OK**  
**动作：** 体积债记实现波次；本轮只审。  
**禁：** 未知枚举灰「未知」兜底。

---

## 311. `ArchiveEvaluationExportTaskModal.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/ArchiveEvaluationExportTaskModal.vue` |
| 行数 | 106 |
| 调用 | refs≈3（评建批次/督导/整改） |
| 行为 | 读 `useArchiveEvaluationExportFlow`；strict-enum 状态；可取消 |

**Impeccable：** 现网迎评导出进度真源（对照 Batch18 未挂载的 ProgressDialog）。  
**Finesse：** 420 Drawer，密。  
**Taste：** 干净。  

**判定：OK**  
**动作：** 保持；勿再挂死 ProgressDialog 双轨。  
**禁：** 导出失败 toast 后仍显示成功。

---

## 312. `ArchiveVolumeMaterialOcrDetailModal.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/ArchiveVolumeMaterialOcrDetailModal.vue` |
| 行数 | 26 |
| 调用 | refs≈3 |
| 结构 | `UiDrawer` + `ArchiveVolumeMaterialOcrDetailContent` 透传 props |

**Impeccable：** 仅抽屉边界，无额外业务。  
**Finesse：** —  
**Taste：** —  

**判定：SHELL**  
**动作：** 调用方直接 UiDrawer+Content，或保留为唯一边界但勿再套壳。  
**禁：** 再包一层 Modal 套 Drawer。

---

## 313. `ScanDispatchResultDialog.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/ScanDispatchResultDialog.vue` |
| 行数 | 309 |
| 调用 | refs≈3（材料表 / portfolio intake / teacher-gap） |
| Token | `--nybc-text-*` + `#8c8c8c/#262626` 回落 |
| 行为 | 派单票+二维码+取消；支持 `PORTFOLIO_COLLECT` |

**Impeccable：** 扫描派单结果跨 archive/portfolio，taskKind 分域正确。  
**Finesse：** Drawer 信息密，可接受。  
**Taste：** token 族旧。  

**判定：TUNE**  
**动作：** `--nybc-*` → `--dp-text-*`。  
**禁：** 派单成功但二维码/URL 缺失仍关窗当完成。

---

## 314. `ClassStudentTreeSelectorDrawer.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/edu/ClassStudentTreeSelectorDrawer.vue` |
| 行数 | 693 |
| 调用 | refs≈2（名册 / 考试创建 CandidateScope） |

**Impeccable：** 班级-学生树选择，考试名册主链。  
**Finesse：** 大体量抽屉，操作密度优先。  
**Taste：** 非营销。  

**判定：OK**  
**动作：** 保持。  
**禁：** 归档材料登记复用本抽屉冒充。

---

## 315. `EvaluationWorkgroupPage.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/evaluation/EvaluationWorkgroupPage.vue` |
| 行数 | 885 |
| Props | `domainShell` |
| 调用 | refs≈2（`quality/evaluation-workgroup` · `portfolio/...-admin`） |

**Impeccable：** 评价工作组页按 `domainShell` 分 quality/portfolio，避免复制整页。  
**Finesse：** 885 行偏大。  
**Taste：** 须跟各自 Scope 壳，禁考试 ContextBar。  

**判定：OK**  
**动作：** 保持 domainShell 分域。  
**禁：** 两域共用考试旅程标签。

---

## 316. `AiAnalysisExamScopePanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/analysis/AiAnalysisExamScopePanel.vue` |
| 行数 | 13 |
| 调用 | refs≈2（Cluster/Teaching Tab） |
| 结构 | `examLocked` 时不渲染；否则 `<AiAnalysisScopeFilterBar mode="exam" />` |

**Impeccable：** 仅 mode + 锁定门闩，增量薄。  
**Finesse：** —  
**Taste：** —  

**判定：SHELL**  
**动作：** Tab 内联 `AiAnalysisScopeFilterBar` + `examLocked` 判断。  
**禁：** 再包第三层 ScopePanel。

---

## 317. `AiAnalysisOrgTermScopePanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/analysis/AiAnalysisOrgTermScopePanel.vue` |
| 行数 | 10 |
| 调用 | refs≈2（School/Trend Tab） |
| 结构 | 固定 `mode="org-term"` 转发 |

**Impeccable：** 纯 mode 别名壳。  
**Finesse：** —  
**Taste：** —  

**判定：SHELL**  
**动作：** Tab 直调 FilterBar。  
**禁：** 与已死的 `AnalysisOrgScopeBar` 再并行一套。

---

## 318. `AiAnalysisScopeFilterBar.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/analysis/AiAnalysisScopeFilterBar.vue` |
| 行数 | 318 |
| Props | `mode: org-term \| exam` |
| 调用 | 仅被上述两 Panel（及内联后的 Tab） |
| Token | `--dp-*`；`UiFilterBar` + quality 选择器 |

**Impeccable：** AI 分析 scope 真源；考试锁/组织锁语义在此。  
**Finesse：** FilterBar 密度符合工作台。  
**Taste：** 复用 quality 选择器可接受，勿换 PortfolioScopeHeader。  

**判定：OK**  
**动作：** 保持为唯一 scope 条。  
**禁：** 再引入 Batch18 的死 `AnalysisOrgScopeBar`。

---

## 319. `ExamQuestionIdentityCells.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/analysis/ExamQuestionIdentityCells.vue` |
| 行数 | 45 |
| Props | `columnKey` `record` |
| 调用 | refs≈2（QuestionAnalysis / GoalMapping 表） |

**Impeccable：** 题目身份单元格渲染，表合同集中。  
**Finesse：** 小单元。  
**Taste：** `--dp-*`。  

**判定：OK**  
**动作：** 保持。  
**禁：** 模板内 `as` 宽化 record。

---

## 320. `PendingTodoFeed.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/dashboard/PendingTodoFeed.vue` |
| 行数 | 244 |
| 调用 | refs≈2（阅卷总览 / 考试工作台概览） |
| 行为 | 紧迫点+阻断 Tag；空态可 CTA；strict-enum 待办类型 |

**Impeccable：** 教师待办真源列表，阻断可见。  
**Finesse：** 行式 feed，优于 KPI 卡墙。  
**Taste：** 好。  

**判定：OK**  
**动作：** 保持。  
**禁：** 待办改成三列装饰统计卡。

---

## 321. `LayoutCanvas.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/layout-designer/LayoutCanvas.vue` |
| 行数 | 625 |
| 调用 | refs≈2（Lite / Layout 阶段） |

**Impeccable：** 制卷画布主交互。  
**Finesse：** 高密度编辑面。  
**Taste：** `--dp-*`。  

**判定：OK**  
**动作：** 保持。  
**禁：** 画布上叠营销 onboarding 遮罩。

---

## 322. `LayoutQuestionPropertyPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/layout-designer/LayoutQuestionPropertyPanel.vue` |
| 行数 | 380 |
| 调用 | refs≈2 |

**Impeccable：** 题目属性侧栏。  
**Finesse：** 表单密度正常。  
**Taste：** 干净。  

**判定：OK**  
**动作：** 保持。  
**禁：** 属性面板再套 Auth 大页头。

---

## 323. `ManualSupplementFormCore.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/manual-supplement/ManualSupplementFormCore.vue` |
| 行数 | 228 |
| 调用 | refs≈2（补扫 Modal / Wizard） |

**Impeccable：** 人工补扫表单核，Modal/Wizard 共用。  
**Finesse：** 字段密。  
**Taste：** 无装饰。  

**判定：OK**  
**动作：** 保持单核。  
**禁：** Modal 与 Wizard 各写一套字段。

---

## 324. `ScorePublishRelatedLinksCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/workbench/ScorePublishRelatedLinksCard.vue` |
| 行数 | 74 |
| Props | `variant` |
| 调用 | refs≈2（缺考确认 / 申诉处理） |
| 结构 | 「相关能力」说明列表 + 前往 |

**Impeccable：** 成绩发布相关跳转；有路由表驱动。  
**Finesse：** 说明书卡，spectacle 偏高一点。  
**Taste：** 类似归档 RelatedLinks；可收成页内文字链。  

**判定：TUNE**  
**动作：** 缩成 Context 旁链接或空态 CTA，弱化独立「相关能力」卡。  
**禁：** 扩成多段营销导流栅格。

---

## 325. `WorkflowPrerequisiteEmpty.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/workbench/workflow-readiness/WorkflowPrerequisiteEmpty.vue` |
| 行数 | 92 |
| Props | `model`（title/description/steps/actions） |
| 调用 | refs≈2（试评/正评 Session 工作台） |

**Impeccable：** 工作流前置未满足时空态+步骤+跳转，符合「Scope+empty」门禁偏好。  
**Finesse：** 步骤点列表克制，无全宽 Alert 墙。  
**Taste：** 好样板。  

**判定：OK**  
**动作：** 其它域门禁对齐此形态。  
**禁：** 换成大粉黄 Alert 占满首屏。

---

## 326. `SessionGroupCreateSummary.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/admin/marking-organization/components/SessionGroupCreateSummary.vue` |
| 行数 | 146 |
| Props | `phase` `policy` `groupReadiness` `sessionReadiness` |
| 调用 | refs≈2（正评/试评创建 Dialog） |

**Impeccable：** 创建场次摘要，就绪态可见。  
**Finesse：** 摘要密。  
**Taste：** 无假绿。  

**判定：OK**  
**动作：** 保持。  
**禁：** 就绪失败仍可点创建成功。

---

## 327. `SessionLifecycleReasonModal.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/admin/marking-organization/components/SessionLifecycleReasonModal.vue` |
| 行数 | 154 |
| Props | `open` `action` `sessionId` `canManage` |
| 调用 | refs≈2 |

**Impeccable：** 场次生命周期原因录入。  
**Finesse：** 模态密度正常。  
**Taste：** 干净。  

**判定：OK**  
**动作：** 保持必填原因。  
**禁：** 无原因直接流转状态。

---

## 328. `cas/index.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/login/components/cas/index.vue` |
| 行数 | 613 |
| 调用 | refs≈2（login / cas-first-login-completion） |
| Token | `--dp-*` |

**Impeccable：** CAS 登录子面板，auth 域。  
**Finesse：** 表单密度。  
**Taste：** 勿套工作台壳。  

**判定：OK**  
**动作：** 保持。  
**禁：** 登录页 KPI/营销卡。

---

## 329. `PortfolioCockpitAskPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/portfolio/components/PortfolioCockpitAskPanel.vue` |
| 行数 | 463 |
| Props | `departmentId` `schoolScopeOnly` `initialTaskId` |
| 调用 | refs≈2（校/院驾驶舱） |
| 行为 | 问数提交/轮询/历史/拒答原因/下钻；失败 `showUserError` |

**Impeccable：** 档案袋驾驶舱问数面板，拒答与 issue 可见。  
**Finesse：** 表+输入密度高，spectacle 低。  
**Taste：** 用 `UiCard`/`UiDataTable`；勿与 mark AI 分析卡混壳。  

**判定：OK**  
**动作：** 保持 portfolio 域。  
**禁：** 拒答写成「暂无数据」假空；混用考试 ContextBar。

---

## 330. `KioskExamPickPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/components/KioskExamPickPanel.vue` |
| 行数 | 573 |
| Props | `selectedExamId` `excludeExamId` `interactionLocked` `instantBind` |
| 调用 | refs≈2（BindStage / ExamSwitchGate） |
| Token | 选中环 `rgba(37, 99, 235, 0.16)`（非 `#1677ff`） |

**Impeccable：** 一体机 5×2 大磁贴选考，instantBind 合同清楚。  
**Finesse：** 触控磁贴合理；Web 禁止同形态。  
**Taste：** 蓝阶偏 Tailwind 蓝，kiosk 可保留但应收敛到品牌主色变量。  

**判定：TUNE**  
**动作：** 选中环改 `color-mix`/`--ant-color-primary`；Web 勿复用磁贴墙。  
**禁：** Web 考试列表抄 5×2 挂号磁贴。

---

## Batch 19 小结

| 判定 | # | 要点 |
|------|---:|------|
| OK | 31 | AI 卡壳/相位 body、涉密水印、沉浸分区、评建导出 Modal、ScopeFilterBar、待办 feed、制卷画布、问数面板、kiosk 闸门等 |
| TUNE | 5 | `MarkExamSelect`→UiSelect；`GiCellAvatar` 体积；`ScanDispatchResultDialog` `--nybc-*`；`ScorePublishRelatedLinksCard` 说明书卡；`KioskExamPickPanel` 37,99,235 |
| SHELL | 3 | OCR Detail Modal；`AiAnalysisExamScopePanel`；`AiAnalysisOrgTermScopePanel` |
| 纠正 | — | `AiAnalysisCardBody`/`HistorySelect` 非空壳（有相位/标签语义） |

**对照 Batch18：** 现网导出进度用本批 `ArchiveEvaluationExportTaskModal`，勿复活死 `ArchiveEvaluationExportProgressDialog`；AI scope 真源是 `AiAnalysisScopeFilterBar`，勿挂死 `AnalysisOrgScopeBar`。
