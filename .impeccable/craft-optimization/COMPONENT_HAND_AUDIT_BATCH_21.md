# 组件手审账 · Batch 21

> 方法：逐文件 Read 源码 + 路径限定引用核对（排除 `components.d.ts`）。  
> Skills：**Impeccable product** · **Finesse product** · **Taste audit-only**  
> Gate：**frontend-design-mark**（`#1677ff` · 浅色 · `--dp-*` · 禁营销壳）  
> 禁令：结论禁止由扫描脚本生成。  
> Date: 2026-07-16（深审重写 · 去掉机械套话）

## Design Read（本批）

Reading this as: **layout-designer phases / marking+scan workbench / portfolio editors / quality accreditation+improvement tabs**, product density — not marketing.

| Dial | Value |
|------|------:|
| Taste VARIANCE / MOTION / DENSITY | 3 / 2 / 8 |
| Finesse SPECTACLE / DENSITY | 2 / 8 |
| Impeccable register | product |

---

## 371. `LayoutQuestionCropStrip.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/layout-designer/LayoutQuestionCropStrip.vue` |
| 行数 | 185 |
| Props | `document` `question` |
| 调用 | LayoutDesignLayoutPhase |
| Token | `--dp-*` |

**Impeccable：** 题目裁剪条，制卷划区辅助。  
**Finesse：** 条带密度合适。  
**Taste：** 干净。  

**判定：OK**  
**动作：** 保持。  
**禁：** 条带加营销 onboarding。

---

## 372. `LayoutQuestionOutlinePanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/layout-designer/LayoutQuestionOutlinePanel.vue` |
| 行数 | 221 |
| Props | `document` `focusedQuestionId` `focusedBlockId` |
| 调用 | LayoutDesignLayoutPhase |

**Impeccable：** 题目/块大纲导航。  
**Finesse：** 侧栏密。  
**Taste：** `--dp-*`。  

**判定：OK**  
**动作：** 保持。  
**禁：** 大纲改成装饰树动画。

---

## 373. `LayoutReviewDrawer.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/layout-designer/LayoutReviewDrawer.vue` |
| 行数 | 123 |
| Props | `examId` `document` `pageNo` `readonly` |
| 调用 | exam-layout-designer |
| 结构 | 仍引 `LayoutCanvasLite`（Batch20 SHELL） |

**Impeccable：** 制卷复核抽屉。  
**Finesse：** 123 行克制。  
**Taste：** `--dp-*`。  

**判定：OK**  
**动作：** 实现时直引 `LayoutCanvas`，去掉 Lite。  
**禁：** 复核抽屉再套第二预览壳。

---

## 374. `LayoutDesignLayoutPhase.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/layout-designer/workbench/LayoutDesignLayoutPhase.vue` |
| 行数 | 155 |
| 调用 | exam-layout-designer |
| 行为 | 编排 Canvas/图层/大纲/属性/裁剪；全卷模式判定 |

**Impeccable：** LAYOUT 阶段编排核，有 `fullPaperMode` 语义。  
**Finesse：** 组合密，无多余装饰。  
**Taste：** 干净。  

**判定：OK**  
**动作：** 保持为划区阶段真源。  
**禁：** 阶段内再嵌 Source 入口双轨。

---

## 375. `LayoutDesignQuestionPhase.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/layout-designer/workbench/LayoutDesignQuestionPhase.vue` |
| 行数 | 28 |
| 调用 | exam-layout-designer |
| 结构 | 透传 → `LayoutQuestionLedgerPanel` |

**Impeccable：** 无增量阶段壳。  
**Finesse：** —  
**Taste：** —  

**判定：SHELL**  
**动作：** 设计师页直挂 LedgerPanel。  
**禁：** 再包 QuestionPhase2。

---

## 376. `LayoutDesignReviewPhase.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/layout-designer/workbench/LayoutDesignReviewPhase.vue` |
| 行数 | 145 |
| Props | `saveBlockingReasons` `saving` `previewing` `saveDisabled`… |
| 调用 | exam-layout-designer |

**Impeccable：** 校验/保存阶段，阻断原因列表可见。  
**Finesse：** 密。  
**Taste：** `--dp-*`。  

**判定：OK**  
**动作：** 保持阻断可见。  
**禁：** 阻断原因空时仍可保存成功。

---

## 377. `LayoutDesignSourcePhase.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/layout-designer/workbench/LayoutDesignSourcePhase.vue` |
| 行数 | 48 |
| Props | 含未使用的 `hasPages` |
| 结构 | 外层 div + 透传 `LayoutEntryGateway` |

**Impeccable：** 相对 Gateway 无业务增量；`hasPages` 死 props。  
**Finesse：** —  
**Taste：** —  

**判定：SHELL**  
**动作：** 页直挂 EntryGateway；删除未用 `hasPages`。  
**禁：** 为「阶段对称」保留空壳。

---

## 378. `LayoutQuestionLedgerPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/layout-designer/workbench/LayoutQuestionLedgerPanel.vue` |
| 行数 | 183 |
| 调用 | 仅 QuestionPhase（壳） |
| Token | `--dp-*` |

**Impeccable：** 题目台账真源（被壳转发）。  
**Finesse：** 表/列表密。  
**Taste：** 干净。  

**判定：OK**  
**动作：** 去壳后由设计师直引。  
**禁：** 台账与属性面板字段分叉无文档。

---

## 379. `ManualSupplementCandidateTable.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/manual-supplement/ManualSupplementCandidateTable.vue` |
| 行数 | 180 |
| 调用 | scan-manual-entry |

**Impeccable：** 补扫考生表。  
**Finesse：** 表密。  
**Taste：** 无装饰。  

**判定：OK**  
**动作：** 保持。  
**禁：** 空表用假考生填充。

---

## 380. `ManualSupplementWizardDrawer.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/manual-supplement/ManualSupplementWizardDrawer.vue` |
| 行数 | 620 |
| Props | `open` `context` |
| 调用 | scan-manual-entry |
| 结构 | 复用 `ManualSupplementFormCore` |

**Impeccable：** 补扫向导抽屉，与 Modal 共用 FormCore。  
**Finesse：** 620 行偏重，步骤流可再收。  
**Taste：** 干净。  

**判定：OK**  
**动作：** 保持单核表单；体积债记实现波次。  
**禁：** Wizard/Modal 各写字段。

---

## 381. `MarkingQuestionViewCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/MarkingQuestionViewCard.vue` |
| 行数 | 113 |
| Props | 含 `confidential` `watermarkLines` |
| 调用 | marking-task-detail |

**Impeccable：** 批阅题面卡，涉密参数下传。  
**Finesse：** 113 行克制。  
**Taste：** 干净。  

**判定：OK**  
**动作：** 保持水印链路。  
**禁：** confidential 时省略水印。

---

## 382. `MarkingTaskInfoCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/MarkingTaskInfoCard.vue` |
| 行数 | 82 |
| Props | `task` + 父注入 `formatDateTime`/状态 label 函数 |
| 调用 | marking-task-detail |

**Impeccable：** 任务信息卡；匿名模式标签可见。  
**Finesse：** 密。  
**Taste：** 父注入 formatter 略别扭，非阻断。  

**判定：OK**  
**动作：** 可选改为组件内 import utils。  
**禁：** 信息卡堆 KPI 四格。

---

## 383. `MarkingTaskToolbar.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/MarkingTaskToolbar.vue` |
| 行数 | 267 |
| Token | `--dp-*` |
| 调用 | marking-task-detail |

**Impeccable：** 批阅任务工具条（导航/解匿名/只读）。  
**Finesse：** 操作密，好。  
**Taste：** 干净。  

**判定：OK**  
**动作：** 保持。  
**禁：** 工具条加营销徽章。

---

## 384. `QuestionExperienceAssistBindingModal.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/QuestionExperienceAssistBindingModal.vue` |
| 行数 | 192 |
| 调用 | marking-experience-assist-policy |

**Impeccable：** 题目级定标经验绑定。  
**Finesse：** 模态密。  
**Taste：** 无 confidence 命名。  

**判定：OK**  
**动作：** 保持。  
**禁：** 字段改 confidence*。

---

## 385. `RevealAnonymousModal.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/RevealAnonymousModal.vue` |
| 行数 | 118 |
| Props | `examId` `taskId` |
| 行为 | 密码二次验证 + 必填理由；失败 `showUserError` |

**Impeccable：** 解匿名 step-up，审计语义正确。  
**Finesse：** 表单密；`UiAlertStrip` 提示。  
**Taste：** 好。  

**判定：OK**  
**动作：** 保持双因子门槛。  
**禁：** 无密码/无理由解匿名。

---

## 386. `ScanBatchDiscardDialog.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/ScanBatchDiscardDialog.vue` |
| 行数 | 90 |
| 调用 | scan-batch-detail-workbench |

**Impeccable：** 批次废弃确认。  
**Finesse：** 小对话框。  
**Taste：** 干净。  

**判定：OK**  
**动作：** 保持确认。  
**禁：** 无确认直接废弃。

---

## 387. `ScanBatchPageInspectorPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/ScanBatchPageInspectorPanel.vue` |
| 行数 | 693 |
| 调用 | scan-batch-detail-workbench |

**Impeccable：** 扫描页检查/归属主面板。  
**Finesse：** 693 行重；操作密度优先。  
**Taste：** 无营销。  

**判定：OK**  
**动作：** 体积债记实现波次。  
**禁：** 归属失败假成功。

---

## 388. `ScanBatchPageRail.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/ScanBatchPageRail.vue` |
| 行数 | 335 |
| 调用 | scan-batch-detail-workbench |

**Impeccable：** 批次页轨/虚拟列表选择。  
**Finesse：** 轨密度高，好。  
**Taste：** 干净。  

**判定：OK**  
**动作：** 保持。  
**禁：** 页轨改成大图瀑布营销墙。

---

## 389. `ScanBatchSupplementModal.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/ScanBatchSupplementModal.vue` |
| 行数 | 238 |
| 调用 | scan-batch-detail-workbench |
| 结构 | 复用 FormCore |

**Impeccable：** 批次内补扫模态。  
**Finesse：** 密。  
**Taste：** 干净。  

**判定：OK**  
**动作：** 保持与 Wizard 共核。  
**禁：** 另写一套补扫字段。

---

## 390. `ScanOrphanRecoveryAlert.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/ScanOrphanRecoveryAlert.vue` |
| 行数 | 171 |
| 调用 | scan-batch-workbench |
| 行为 | dense warning strip + 失败 error strip 列表；仅 owner 可补救 |

**Impeccable：** 孤儿扫描事件补救，失败项逐条可见。  
**Finesse：** **好样板**（dense strip，非大门禁）。  
**Taste：** 好。  

**判定：OK**  
**动作：** 其它扫描告警对齐此形态。  
**禁：** 部分失败仍 toast 全成功。

---

## 391. `WholePaperGallery.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/WholePaperGallery.vue` |
| 行数 | 234 |
| 调用 | marking-task-detail |
| 行为 | 虚拟滚动页廊；`ConfidentialWatermarkLayer`；质量 Tag strict |
| 结构 | `UiCard` class 含遗留 `info-card` |

**Impeccable：** 原始扫描页廊，涉密水印+禁右键路径齐全。  
**Finesse：** 密度高。  
**Taste：** 去掉 `info-card` 遗留类名。  

**判定：TUNE**  
**动作：** 删 `info-card`；保持水印。  
**禁：** 无水印的「清晰预览」旁路。

---

## 392. `PortfolioAiCandidateConfirmPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/portfolio/PortfolioAiCandidateConfirmPanel.vue` |
| 行数 | 438 |
| Props | `taskId` `readonly` |
| 调用 | PortfolioMaterialIntakePanel |
| Token | `--dp-*` |

**Impeccable：** 档案袋 AI 候选确认，材料入库子链。  
**Finesse：** 438 行可再收。  
**Taste：** 勿混 mark OCR 模态。  

**判定：OK**  
**动作：** 保持 portfolio 域。  
**禁：** 用归档卷 OCR Detail 冒充本确认。

---

## 393. `PortfolioEligibilityTreeEditor.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/portfolio/PortfolioEligibilityTreeEditor.vue` |
| 行数 | 168 |
| 调用 | indicator-eligibility |

**Impeccable：** 指标资格树编辑。  
**Finesse：** 树编辑密。  
**Taste：** 干净。  

**判定：OK**  
**动作：** 保持。  
**禁：** 资格树套考试 ContextBar。

---

## 394. `PortfolioPortraitLayoutEditor.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/portfolio/PortfolioPortraitLayoutEditor.vue` |
| 行数 | 250 |
| Props | `widgets` |
| 调用 | portrait-template-admin |

**Impeccable：** 画像模板布局编辑。  
**Finesse：** 250 行克制。  
**Taste：** `--dp-*`。  

**判定：OK**  
**动作：** 保持。  
**禁：** 编辑器加渐变画布皮肤。

---

## 395. `PortfolioProgressCompareDrawer.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/portfolio/PortfolioProgressCompareDrawer.vue` |
| 行数 | 201 |
| Props | `open` `teacherId` |
| 调用 | teacher-home |
| 结构 | 裸 `a-drawer`（非 `UiDrawer`）；学年完整度/缺口 |

**Impeccable：** 跨学年进度对比，缺口分类可见。  
**Finesse：** 行式对比密。  
**Taste：** 应统一 UiDrawer；非 mark 成绩版本。  

**判定：TUNE**  
**动作：** 迁 `UiDrawer`；文案保持「进度/缺口」勿写成版本对比。  
**禁：** 与 Batch18 档案「版本对比」混名。

---

## 396. `PortfolioTeacherOnboardingWizard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/portfolio/PortfolioTeacherOnboardingWizard.vue` |
| 行数 | 420 |
| Props | `blockedByTemplate` `blockedByReadiness` `readonlyMode` |
| 调用 | teacher-onboarding |
| 行为 | 模板未发布/就绪失败用 `UiAlertStrip`（非 dense）；分步引导 |

**Impeccable：** 教师档案袋引导，阻断原因可见。  
**Finesse：** 步骤清晰；Alert 可改 dense。  
**Taste：** 说明书文案偏长，可接受。  

**判定：OK**  
**动作：** 可选 Alert `dense`。  
**禁：** 阻断时仍可「完成引导」假成功。

---

## 397. `PortfolioTeacherReviewStatusTable.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/portfolio/PortfolioTeacherReviewStatusTable.vue` |
| 行数 | 167 |
| 调用 | teacher-review-status |

**Impeccable：** 教师审核状态表。  
**Finesse：** 表密。  
**Taste：** `--dp-*`。  

**判定：OK**  
**动作：** 保持。  
**禁：** 未知状态灰「未知」。

---

## 398. `AccreditationAnnualPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/accreditation/AccreditationAnnualPanel.vue` |
| 行数 | 475 |
| 调用 | accreditation-cockpit |

**Impeccable：** 认证年度计划面板。  
**Finesse：** 475 行中等。  
**Taste：** 须 `QualityScopeChrome`，禁考试 ContextBar。  

**判定：OK**  
**动作：** 保持 quality 域。  
**禁：** 混考试旅程标签。

---

## 399. `AccreditationAnnualReportMaterialPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/accreditation/AccreditationAnnualReportMaterialPanel.vue` |
| 行数 | 687 |
| 调用 | accreditation-cockpit |

**Impeccable：** 年度报告材料面板。  
**Finesse：** 687 行偏重。  
**Taste：** quality 域。  

**判定：OK**  
**动作：** 体积债记实现波次。  
**禁：** 材料登记走名册 Excel 模态冒充。

---

## 400. `AccreditationCyclePanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/accreditation/AccreditationCyclePanel.vue` |
| 行数 | 790 |
| Token | `--dp-*` |
| 调用 | accreditation-cockpit |

**Impeccable：** 认证周期主面板。  
**Finesse：** 790 行重。  
**Taste：** 对照死组件 `AccreditationWorkflowHints`，本面板为现网真源。  

**判定：OK**  
**动作：** 保持；Hints 挂载或删（Batch18）。  
**禁：** 周期状态假绿。

---

## 401. `AccreditationEvidencePanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/accreditation/AccreditationEvidencePanel.vue` |
| 行数 | 577 |
| 调用 | accreditation-cockpit |

**Impeccable：** 认证证据面板。  
**Finesse：** 577 行。  
**Taste：** quality 域。  

**判定：OK**  
**动作：** 保持。  
**禁：** 证据缺失当已齐套。

---

## 402. `AccreditationOnsitePanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/accreditation/AccreditationOnsitePanel.vue` |
| 行数 | 604 |
| 调用 | accreditation-cockpit |

**Impeccable：** 现场考查面板。  
**Finesse：** 604 行。  
**Taste：** quality 域。  

**判定：OK**  
**动作：** 保持。  
**禁：** 现场状态与周期状态分叉无校验。

---

## 403. `AccreditationSupportPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/accreditation/AccreditationSupportPanel.vue` |
| 行数 | 857 |
| Token | `--dp-*` |
| 调用 | accreditation-cockpit |

**Impeccable：** 师资与支持条件面板（自评第 6/7 章前置）。  
**Finesse：** 857 行最重。  
**Taste：** quality 域。  

**判定：OK**  
**动作：** 体积债记实现波次。  
**禁：** 未确认支持条件仍生成完整自评假成功。

---

## 404. `SelfAssessmentReportPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/accreditation/SelfAssessmentReportPanel.vue` |
| 行数 | 528 |
| 调用 | accreditation-cockpit |

**Impeccable：** 自评报告面板（含 AI 报告入口合同）。  
**Finesse：** 528 行。  
**Taste：** 禁营销报告 Hero。  

**判定：OK**  
**动作：** 保持失败可见。  
**禁：** 报告生成失败显示空八章当成功。

---

## 405. `GlobalPromptInputDialog.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/GlobalPromptInputDialog.vue` |
| 行数 | 49 |
| 调用 | App.vue（全局） |
| 结构 | `UiConfirmModal` + textarea；接 `usePromptInputDialog` |

**Impeccable：** 全局文本确认输入边界，有校验错误展示。  
**Finesse：** 薄但非纯透传（表单项+error）。  
**Taste：** 干净。  

**判定：OK**  
**动作：** 保持单例挂 App。  
**禁：** 各页再造平行 prompt Modal。

---

## 406. `AuditIssueTab.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/improvement/AuditIssueTab.vue` |
| 行数 | 679 |
| 调用 | improvement-workbench |
| 行为 | scope guard；失败上抛 `onLoadError` |

**Impeccable：** 持续改进-问题台账 Tab。  
**Finesse：** 679 行。  
**Taste：** QualityScope，禁考试壳。  

**判定：OK**  
**动作：** 保持 scope stale 失败可见。  
**禁：** stale scope 静默用旧列表。

---

## 407. `AuditRectificationTab.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/improvement/AuditRectificationTab.vue` |
| 行数 | 791 |
| 调用 | improvement-workbench |

**Impeccable：** 整改 Tab。  
**Finesse：** 791 行。  
**Taste：** quality 域。  

**判定：OK**  
**动作：** 保持。  
**禁：** 整改关闭无证据假完成。

---

## 408. `AuditSupervisionTab.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/improvement/AuditSupervisionTab.vue` |
| 行数 | 861 |
| 调用 | improvement-workbench |

**Impeccable：** 督导 Tab。  
**Finesse：** 861 行最重之一。  
**Taste：** quality 域。  

**判定：OK**  
**动作：** 体积债记实现波次。  
**禁：** 督导结论无记录可点通过。

---

## 409. `ImprovementTaskTab.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/improvement/ImprovementTaskTab.vue` |
| 行数 | 930 |
| 调用 | improvement-workbench |
| 结构 | FilterBar+表+Drawer；操作列 width **380**；strict-enum 状态 tone |

**Impeccable：** 改进任务主 Tab，scope/AI 触发齐全。  
**Finesse：** 930 行过重；操作列 380 过宽，挤占内容。  
**Taste：** 状态用 BadgeTone map（名含 COLOR 但值为 tone，可接受）。  

**判定：TUNE**  
**动作：** 拆抽屉/列表；操作改 `UiTableActions` split，列宽≤200。  
**禁：** 操作列继续堆并列按钮墙。

---

## 410. `MarkQualitySyncChip.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/MarkQualitySyncChip.vue` |
| 行数 | 124 |
| Props | `exam` |
| 调用 | teacher/statistics（考后讲评） |
| 行为 | 查 `markExamSyncApi.status`；strict-enum；跳转 QualityAchievement |

**Impeccable：** mark→quality **显式同步芯片**（非偷偷改 course 域）；失败 toast。  
**Finesse：** 芯片+按钮，密。  
**Taste：** 好。  

**判定：OK**  
**动作：** 保持为跨域跳转唯一轻量入口。  
**禁：** 在 mark 页内嵌整页 quality 工作台。

---

## Batch 21 小结

| 判定 | # | 要点 |
|------|---:|------|
| OK | 34 | 制卷 LAYOUT/REVIEW、批阅/扫描主链、解匿名、孤儿补救好样板、认证/改进 Tab、质量同步芯片 |
| TUNE | 3 | `WholePaperGallery` 去 `info-card`；`PortfolioProgressCompareDrawer`→UiDrawer；`ImprovementTaskTab` 体积+操作列宽 |
| SHELL | 2 | `LayoutDesignQuestionPhase`；`LayoutDesignSourcePhase`（含死 props `hasPages`） |

**对照：** Question 阶段真源是 `LayoutQuestionLedgerPanel`；Source 真源是 `LayoutEntryGateway`；扫描告警对齐 `ScanOrphanRecoveryAlert` dense strip。
