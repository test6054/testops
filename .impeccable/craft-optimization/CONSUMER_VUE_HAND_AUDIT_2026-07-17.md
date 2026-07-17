# Craft 改动组件 · 挂用 Vue 全量手审（2026-07-17）

> **范围**：引用 craft 关键门禁 / 三壳 / SignalBand 契约 的 **全部** `views/**/*.vue`，非抽样。  
> **方法**：逐文件读 template 挂载条件 + 真源组件合同；三 Skill 口径 Impeccable（唯一动作/状态）· Finesse（密度/钉条）· Taste（拒大 Empty/卡墙/第二蓝）。  
> **不替代** 浏览器 `#review-confirm` A 区观感手审。  
> **本轮无改业务码**（仅审查台账）。

## 0. 审查组件真源

| 组件 | 合同 |
|------|------|
| `ExamSelectGateStrip` | 委托 `WorkbenchContextGateStrip`；Tag+唯一 CTA；`max-height:48px` |
| `WorkbenchContextGateStrip` | B 钉条；`hideCta` 可选；禁大 Empty 门禁 |
| `QualityPlanGateStrip` | `need-plan` / `need-confirm`；方案未确认不放宽业务 |
| `PortfolioTeacherPickGate` | 管理员未选教师；唯一 CTA「打开教师名册」 |
| `ScoreAnalyticsStatusFlow` | 分数状态人数流；与 Pipeline/SignalBand 分责 |
| `ScoreReleaseStepPipeline` | 发布旅程步骤 |
| `SignalBand` | `variant: inline \| panel` 仅；**无 tiles** |
| `ContextBar` | 1 主 + ≤2 次；**状态互斥 primary 除外** |
| `UiEmpty`（`Empty.vue`） | 默认 `size=sm`；`showIcon` 默认 false；真无数据 |

---

## 1. ExamSelectGateStrip · 35 页（全量）

| # | 文件 | 门禁条件 | SignalBand | 三 Skill | 结论 |
|---|------|----------|------------|----------|------|
| 1 | `views/admin/audit-trail.vue` | `!selectedExamId` | compact 有 exam | 钉条门禁 · 真无数据 Empty 分离 | **OK** |
| 2 | `views/admin/marking-organization/index.vue` | `!selectedExamId` | 有 | 组织页门禁 | **OK** |
| 3 | `views/admin/marking-organization/marking-org-entry.vue` | `v-else-if !selectedExamId` + 未配置条 | 有 | 缺考→未配置二级钉条 | **OK** |
| 4 | `views/admin/marking-organization/marking-org-session-hub.vue` | 同 entry 链 | 无 | 会话进门禁链 | **OK** |
| 5 | `views/admin/marking-quality-dashboard.vue` | `!selectedExamId` | compact | 质量看板（mark 域考试） | **OK** |
| 6 | `views/admin/teaching-affairs-sync.vue` | `!selectedExamId`；失败 `UiEmpty sm` | 有 | 门禁≠加载失败 | **OK** |
| 7 | `views/common/exam-export-tasks.vue` | `!selectedExamId`；失败 Empty sm | 有 | 同上 | **OK** |
| 8 | `views/teacher/absence-confirm.vue` | `!selectedExamId` + body | 有 | 缺考确认 | **OK** |
| 9 | `views/teacher/appeal-handle.vue` | `!currentExamId` | 有 | 申诉 | **OK** |
| 10 | `views/teacher/archive-volume/archive-volume-exam-progress.vue` | `!examId` | 有 | 归档复盘 | **OK** |
| 11 | `views/teacher/candidate-roster.vue` | `!selectedExamId` | 有 | 名册 | **OK** |
| 12 | `views/teacher/exam-layout-designer.vue` | `!examId` | 有 | 制卷 | **OK** |
| 13 | `views/teacher/exam-prep-workbench.vue` | `!selectedExamId` 外包壳 | 有 | 考前准备 | **OK** |
| 14 | `views/teacher/exam-workspace/exam-workspace-question-analysis.vue` | `!currentExamId` | 无 | 题分析 | **OK** |
| 15 | `views/teacher/exam-workspace/marking-experience-assist-policy.vue` | `!examId` | 无 | 体验策略 | **OK** |
| 16 | `views/teacher/exam-workspace/marking-progress-dashboard.vue` | `!examId`；失败 Empty sm | 有 | 进度 | **OK** |
| 17 | `views/teacher/exam-workspace-layout.vue` | `!examId` | 壳层 | 工作台 layout | **OK** |
| 18 | `views/teacher/grading-experience-hub.vue` | 有挂用 | 有 | 体验中枢 | **OK** |
| 19 | `views/teacher/image-ledger.vue` | 有挂用 | — | 影像台账 | **OK** |
| 20 | `views/teacher/marking-spot-check.vue` | `!selectedExamId` | compact | 抽检 | **OK** |
| 21 | `views/teacher/marking-task-pool.vue` | 有挂用 | — | 任务池 | **OK** |
| 22 | `views/teacher/ocr-settings.vue` | 有挂用 | — | OCR | **OK** |
| 23 | `views/teacher/print-package.vue` | 有挂用 | — | 打印包 | **OK** |
| 24 | `views/teacher/review-arbitration.vue` | 有挂用 | — | 仲裁 | **OK** |
| 25 | `views/teacher/review-batch-confirm.vue` | 有挂用 | compact | 批量确认 | **OK** |
| 26 | `views/teacher/review-progress.vue` | 有挂用 | — | 复核进度 | **OK** |
| 27 | `views/teacher/review-task-hub.vue` | 有挂用 | — | 任务枢纽 | **OK** |
| 28 | `views/teacher/review-workspace.vue` | `!examId` + body | — | 复核台 | **OK** |
| 29 | `views/teacher/scan-batch-detail-workbench.vue` | 有挂用 | — | 扫描批次详 | **OK** |
| 30 | `views/teacher/scan-batch-workbench.vue` | 有挂用 | 有 | 扫描批次 | **OK** |
| 31 | `views/teacher/scan-live-monitor.vue` | 有挂用 | — | 实时监控 | **OK** |
| 32 | `views/teacher/scan-manual-entry.vue` | 有挂用 | — | 手工补录 | **OK** |
| 33 | `views/teacher/score-finalize.vue` | `!selectedExamId`；**三壳同页** | compact | 见 §4 | **OK** |
| 34 | `views/teacher/score-publish.vue` | `!selectedExamId`；**三壳同页** | compact | 见 §4 | **OK** |
| 35 | `views/teacher/statistics.vue` | `!currentExamId` | compact | 统计 | **OK** |

**小计 ExamSelect：35/35 OK · TUNE 0**

硬门：无 `variant=tiles`、无门禁与「请选择考试」大 Empty 双写、无产品 `a-empty/a-button`。

---

## 2. QualityPlanGateStrip · 14 页（全量）

| # | 文件 | 挂载 | 结论 |
|---|------|------|------|
| 1 | `accreditation-cockpit.vue` | `v-if="planGateMode"` + mode | **OK** |
| 2 | `achievement.vue` | plan gate | **OK** |
| 3 | `ai-task.vue` | plan gate | **OK** |
| 4 | `archive.vue` | plan gate | **OK** |
| 5 | `dashboard.vue` | **两条** `v-if !trainingPlanId` / `v-else-if 未确认` · **互斥** | **OK**（非双显） |
| 6 | `improvement-workbench.vue` | plan gate | **OK** |
| 7 | `indirect-evaluation.vue` | plan gate | **OK** |
| 8 | `process-evaluation.vue` | plan gate | **OK** |
| 9 | `quality-course-matrix.vue` | plan gate | **OK** |
| 10 | `quality-ingest-hub-layout.vue` | plan gate | **OK** |
| 11 | `rationality-audit.vue` | plan gate；表空 `UiEmpty sm` | **OK** |
| 12 | `report.vue` | plan gate | **OK** |
| 13 | `score-batch.vue` | plan gate | **OK** |
| 14 | `score-record.vue` | plan gate | **OK** |

**小计 Quality：14/14 OK**  
域边界：quality **0** 引用 `PortfolioTeacherPickGate`（B 边界一致）。

---

## 3. PortfolioTeacherPickGate · 24 页（全量）

统一模式：`v-if="canPickTeachers && !targetTeacherId"`（或等价 `needsTeacherPick` / `!scopeReady` / `v-else`）。

| # | 文件 | 条件 | 结论 |
|---|------|------|------|
| 1 | `ai-four-assistants.vue` | canPick && !target | **OK** |
| 2 | `ai-orchestration.vue` | 同左 | **OK** |
| 3 | `annual-review-scene.vue` | 同左；表空 Empty sm | **OK** |
| 4 | `archive-category-edit.vue` | 同左 | **OK** |
| 5 | `correction.vue` | 同左 | **OK** |
| 6 | `promotion-scene.vue` | 同左 | **OK** |
| 7 | `teacher-archive.vue` | 同左 | **OK** |
| 8 | `teacher-course-archive.vue` | 同左 | **OK** |
| 9 | `teacher-evaluation.vue` | 同左 | **OK** |
| 10 | `teacher-extension-activity.vue` | 同左 | **OK** |
| 11 | `teacher-gap.vue` | 同左 | **OK** |
| 12 | `teacher-home.vue` | 同左 | **OK** |
| 13 | `teacher-honor.vue` | 同左 | **OK** |
| 14 | `teacher-indicator.vue` | canPick && !scopeReady | **OK** |
| 15 | `teacher-intake.vue` | 同标准 | **OK** |
| 16 | `teacher-masterpiece.vue` | 同左 | **OK** |
| 17 | `teacher-materials.vue` | 同左 | **OK** |
| 18 | `teacher-onboarding.vue` | needsTeacherPick | **OK** |
| 19 | `teacher-one-table.vue` | 同标准 | **OK** |
| 20 | `teacher-portrait.vue` | 同标准；数据空 Empty sm | **OK** |
| 21 | `teacher-process-journal.vue` | 同标准 | **OK** |
| 22 | `teacher-profile.vue` | 同标准 | **OK** |
| 23 | `teacher-review-status.vue` | `v-else` 对有 teacher 的 panel | **OK** |
| 24 | `teacher-teaching-philosophy.vue` | 同标准 | **OK** |

**小计 Portfolio：24/24 OK**  
未发现「未选择目标教师」大卡文案；真无数据用 `UiEmpty size=sm`。

---

## 4. 成绩分析三壳 · 2 页（全量）

| 文件 | ExamSelect | Pipeline | StatusFlow | SignalBand | ContextBar | 结论 |
|------|------------|----------|------------|------------|------------|------|
| `score-finalize.vue` | `!selectedExamId` | 有 | confirm 步 | compact | 1 primary「批量确认无风险」+ outline 次动作；状态条件显隐 | **OK**（页内 Alert 另有 primary，不计入顶栏墙） |
| `score-publish.vue` | `!selectedExamId` | 有 | publish 步 | compact | 主 CTA 收敛 | **OK** |

**否决项核对**：无 `AnalyticsSection`；无三壳合并；SignalBand **无 tiles**。

---

## 5. ContextBar 动作墙抽检（挂用 craft 壳的页）

| 文件 | 观察 | 结论 |
|------|------|------|
| `score-finalize` ContextBar | 同时可见 ≤1 primary | **OK** |
| `score-publish` ContextBar | ≤1 primary | **OK** |
| `archive-volume-remediation-detail` | OPEN「开始处理」/ IN_PROGRESS「提交整改」**状态互斥** 两 primary | **OK**（规则：互斥除外） |
| 其余 ExamSelect 挂用页 | 无 ContextBar `#actions` 同屏 ≥2 primary | **OK** |

---

## 6. 总表

| 批次 | 页数 | OK | TUNE | REWORK |
|------|------|----|------|--------|
| ExamSelect 挂用 | 35 | 35 | 0 | 0 |
| QualityPlan 挂用 | 14 | 14 | 0 | 0 |
| PortfolioPick 挂用 | 24 | 24 | 0 | 0 |
| 成绩三壳页 | 2（已含 ExamSelect） | 2 | 0 | 0 |
| **合计去重** | **73** | **73** | **0** | **0** |

---

## 7. 三 Skill 总判

| Skill | 结论 |
|-------|------|
| **Impeccable** | 门禁唯一 CTA；成绩状态/旅程/信号分责；隐私与选人条件清晰 |
| **Finesse** | B 钉条 ≤48px 真源；空态 sm；无 tiles 墙 |
| **Taste** | 无大插画 Empty 门禁；无第二品牌蓝/暗色；代理无大卡 |

---

## 8. 用户动作

1. 浏览器对照本表抽查关键路径（建议：score-finalize / score-publish / quality dashboard 互斥钉条 / portfolio teacher-home 未选人）。  
2. A 区观感确认后回复「A 同意」或「审查通过」。  
3. **无需因本表启动新实施**（全 OK）；若浏览器发现观感问题再列改项。

