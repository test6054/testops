# COMPONENT_HAND_AUDIT_BATCH_26

> 2026-07-16 晚 · 三 Skill 手审重核（**禁止脚本写结论**）  
> Skills: **Impeccable product/audit** · **Finesse product audit** · **Taste audit-only**  
> Gate: **frontend-design-mark**（浅色 · `#1677ff` · `--dp-*` · Ui* · 工作台壳）  
> 方法：逐文件 Read + 路径限定 `rg` 引用核验（排除 `components.d.ts` 自注册）· 不调用 `review-craft-recommendations.mjs` / `detect.mjs` 写结论

---

## 0. 盘点真相（先于再打分）

| 项 | 结论 |
|----|------|
| 历史 INDEX | 509 路径（Batch 01–25） |
| **已物理删除** | **99**（`COMPONENT_ZERO_REF_DELETED.json`，2026-07-16） |
| **磁盘仍在** `src/components` | **258** `.vue` |
| **磁盘仍在** `src/layout` | **18** `.vue` |
| 旧 DEAD? 表 45–50 项 | **文件已不存在**；结论需改为 **GONE / 已删**，不是「待删」 |
| `types/components.d.ts` | **已清洗**：剥离 102 已删路径；保留 ant `A*` 与 `ScoreAnalyticsStatusFlow`（冷启动 Vite 全量 dts 会丢 A*，故用备份剥离法） |

### 0.1 已删 99 件（不复活）

记录见 `COMPONENT_ZERO_REF_DELETED.json`。本轮抽核：

| 代表路径 | 磁盘 | 业务引用（排除 d.ts） | 判定 |
|----------|------|----------------------|------|
| `AccreditationWorkflowHints.vue` | 无 | 无 | **GONE** |
| `ArchivePackageEventTimeline.vue` | 无 | 无（现网 `ArchivePackageTimeline`） | **GONE** |
| `LayoutDesignPhaseRail.vue` | 无 | 无（现网 `LayoutDesignWorkflowRail`） | **GONE** |
| `MarkExamStageRail.vue` | 无 | 无 | **GONE** |
| `DrilldownBreadcrumb.vue` | 无 | 无 | **GONE** |
| `ui-guide` 大批死壳（Tabs/Table*/ChatShell/…） | 无 | 业务侧误命中多为变量名/Ant 同名 | **GONE** |

**Impeccable**：删除后残留 d.ts 会造成 IDE 假自动导入 → **P1 卫生债**。  
**Finesse**：减包体正确；勿再「为了完整 kit」加回未接入组件。  
**Taste**：已删营销壳（UiPageHero/UiAgentCard 等）不得借 redesign 复活。

---

## 1. 真零引用（曾 4 件 · 现 0 · 258→255 components）

对每个候选：Read 源码 + `rg` 全 `src`（排除 self 与 `components.d.ts`）。

| 判定 | 路径 | 源码事实 | 三 Skill 结论 | 动作 |
|------|------|----------|---------------|------|
| **GONE** | `components/ui-guide/ui/UiEntityCard.vue` | eyebrow + `#2563eb`；零业务引用 | Taste 驳回 | **2026-07-16 已删** |
| **GONE** | `components/ui-guide/ui/UiSearchForm.vue` | FilterBar 薄壳；零业务引用 | Finesse 薄壳 | **2026-07-16 已删** |
| **GONE** | `components/ui-guide/ui/InputNumber.vue`（`UiInputNumber`） | 页用 ant InputNumber | 双轨 | **2026-07-16 已删** |
| **OK（已接入）** | `components/workbench/ScoreAnalyticsStatusFlow.vue` | 分数状态 Tag 流；数据 `buildScoreAnalyticsFlowSteps` | 业务需要：考后成绩确认/发布状态分析 | **已挂载** `score-finalize` + `score-publish`；与 `ScoreReleaseStepPipeline` 分责，禁止合并 |

> 说明：`GiFooter` / `Breadcrumb` / `AjCaptcha` / `AuthLayout` 等有真实引用 → **不是** DEAD。

---

## 2. 档案袋组件 · 三 Skill 重审（逐文件 Read）

| 判定 | 组件 | 引用 | 源码事实 | Impeccable | Finesse | Taste | 优化动作 |
|------|------|------|----------|------------|---------|-------|----------|
| **REWORK** | `PortfolioScopeHeader.vue` L338 | Layout 全局 | select/本人 Tag/工作壳；无代办标、无回本人；admin 默认可清空 | 身份六态不全；未选写保护不在本组件表达 | 密度 OK；操作不可见「退出代办」 | 无 slop；勿加红营销条 | 代办 UiTag + 回本人；清空→未选；可选 warn 底 |
| **OK** | `PortfolioLayoutContext.vue` L30 | LayoutDefault | 路由可见时挂 ScopeHeader | 边界清晰 | 无薄业务 | 通过 | 代办态可加淡底，不加文案墙 |
| **OK** | `PortfolioTeacherJourneyRail.vue` L50 | 教师旅程页 | 薄包 `StageRail` arrow/compact | 有 select 语义 | 可接受边界适配 | 通过 | 保持；禁自绘营销 timeline |
| **OK** | `PortfolioProgressCockpitBand.vue` L149 | teacher-home 等 | 薄包 SignalBand metrics | 指标可点 | 正确密度 | 通过 | 指标必须可下钻（页面责） |
| **TUNE** | `PortfolioMaterialIntakePanel.vue` L683 | intake | SignalBand + 上传 + AI 候选确认 | 读写/只读分支在 | 略长但仍单职责 | 无 hex | 确认入库走代办二次确认；禁自动入正式库 |
| **OK** | `PortfolioAiCandidateConfirmPanel.vue` | Intake 内 | 候选确认 | 草稿边界 | 可操作 | 通过 | 保持 AI≠终裁 |
| **OK** | `PortfolioTeacherReviewStatusTable.vue` | teacher-review-status | 表 | 状态列 | 密度 | 通过 | 页级 URL 空态另案 |
| **TUNE** | `PortfolioProgressCompareDrawer.vue` | teacher-home | 对比抽屉 | 范围跟 teacherId | 应用 UiDrawer 合同 | 通过 | 确认抽屉原语 |
| **TUNE** | `PortfolioArchiveVersionComparePanel.vue` | archive-category-edit | 对比面板 | 名含 version 易误解 | 原生 select 风险 | 通过 | 文案改为「审计快照」；select→UiSelect |
| **OK** | `PortfolioEligibilityTreeEditor.vue` | indicator-eligibility | 递归树编辑 | 有 | 操作完成 | 通过 | 保持 |
| **OK** | `PortfolioPortraitLayoutEditor.vue` | portrait-template-admin | 布局编辑 | 配置壳 | OK | 通过 | 保持 |
| **TUNE** | `PortfolioTeacherOnboardingWizard.vue` | onboarding | 多步 + AlertStrip 门禁 | 阻断清晰 | 步骤文案偏长 | 无 eyebrow | 压缩说明；门禁保留 |

---

## 3. 质量组件 · 三 Skill 重审

| 判定 | 组件 | 引用 | 源码事实 | 三 Skill | 优化动作 |
|------|------|------|----------|----------|----------|
| **OK** | `QualityScopeChrome.vue` L300 | workspace layout | 按 scopeProfile 裁剪；未确认 Tag+CTA；禁 silent 首项 | Imp: 门禁事实清楚 · Fin: 紧凑 · Taste: 通过 | 保持；禁再叠全宽黄 Alert |
| **OK** | `QualityPageContextBar.vue` L39 | 质量页 | ContextBar 适配；无 title 可隐藏 | 边界适配非空壳 | 保持 |
| **OK** | `QualityObeJourneyStrip.vue` L125 | OBE 旅程 | nav+button 阶段；pending disabled | 语义 HTML | 保持；禁大图标墙 |
| **OK** | `MarkQualitySyncChip.vue` L124 | 阅卷→质量 | Tag+显式跳转 | 跨域可见 | 保持；禁隐式带 teacherId |
| **OK** | `QualityWorkbenchCharts.vue` L106 | 达成图 | MarkBarSection 循环 | 摘要在 section | 语义色交给 Mark 图 |
| **TUNE** | `QualityIngestPageShell.vue` L33 | ingest | 条件 StageWorkbenchShell | 近似壳但有 embedded 分支 | 可保留边界 |
| **OK** | `improvement/*` 族 | workbench | 任务/整改/督导 | 体积风险已记 Batch21 | 行内动作，禁按钮墙 |
| **OK** | `accreditation/*Panel` | cockpit | 分面板证据 | 证据链 | 不复活 Hints |
| **OK** | `selectors/*` | 各页 | page-contract 分页搜索 | 合同统一 | 禁 silent 首项 |

---

## 4. 工作台壳 · 抽核

| 判定 | 组件 | 结论 |
|------|------|------|
| **TUNE** | `SignalBand.vue` L367 | 三 variant；可点指标合同正确；禁装饰 KPI / tiles 滥用 hero |
| **TUNE** | `ContextBar.vue` L158 | 标题+actions；禁与页内双标题 |
| **REWORK** | `DualDomainSideNav.vue` L740 | 三域菜单；「更多/超市」风险仍在；按 access-scope 投影 |
| **OK** | `StageRail.vue` | 旅程真源；档案袋 rail 复用正确 |

---

## 5. 关键页面 · 三 Skill 手审

| 判定 | 页面 | 源码事实 | 优化 |
|------|------|----------|------|
| **REWORK** | `teacher-home.vue` L853 | 空态「URL 携带 teacherId」；local canPick | 改「上方教师范围选择」；scopeReady 门禁；首屏三问 |
| **REWORK** | `teacher-archive.vue` L1669 | 同上 URL 空态 | 同上 |
| **REWORK** | `teacher-portrait.vue` L1040 | 同上 | 同上 |
| **REWORK** | `teacher-review-status.vue` L161 | 同上 | 同上 |
| **OK** | `ai-four-assistants.vue` L602 | 空态已写「顶部教师范围」 | 保持；禁页内第二选人 |
| **OK** | `teacher-materials.vue` / `teacher-intake.vue` | page_scope | 跟随 Scope |
| **OK** | `department-review.vue` | 队列空态业务语言 | 壳=院审≠代办 |
| **OK** | `quality/dashboard.vue` / `achievement.vue` | 「请选择培养方案」 | 与 ScopeChrome 对齐，不叠大框 |
| **OK** | `improvement-workbench.vue` | 范围无任务 | 可行动空态 |
| **OK** | `quality-workspace-layout.vue` | 挂 QualityScopeChrome | 唯一范围真源 |
| **OK** | `accreditation-cockpit.vue` | 选专业方案 | 证据优先 |

---

## 6. 评分（本批焦点面，非全库）

| # | Dimension (Impeccable audit) | Score | Key Finding |
|---|------------------------------|------:|-------------|
| 1 | Accessibility | 2 | 旅程 strip 有 aria；Scope select 缺代办态 live region |
| 2 | Performance | 3 | 已删 99 死组件利好；d.ts 陈旧无运行时伤 |
| 3 | Theming | 2 | UiEntityCard 第二蓝 hex；业务页多数 token |
| 4 | Responsive | 3 | Scope 有 mobile 折行 |
| 5 | Anti-Patterns | 2 | URL 说明书空态、eyebrow 死组件、菜单超市风险 |
| **Total** | | **12/20** | Acceptable · 范围可见性与死代码卫生优先 |

**Taste verdict**：未发现新营销 hero；**驳回** UiEntityCard 接入；**驳回** 换 Geist/暗色。  
**Finesse spectacle**：产品 SPECTACLE=2 · 无需引擎 · 通过。

---

## 7. 优先动作清单（只审不改 Vue 时的交接）

### 成绩壳唯一真源（Batch 26 补记 · 已落地）

| 层 | 真源 | 职责 | 禁止 |
|----|------|------|------|
| 数据 | `utils/score-workbench-analytics.ts` → `buildScoreAnalyticsFlowSteps` | 状态人数 + 确认/发布 emphasis | 页内手写状态序列 |
| UI | `ScoreAnalyticsStatusFlow.vue` | 分数状态流转展示 | 页内再抄 Tag 流 |
| 发布旅程 | `ScoreReleaseStepPipeline.vue` | 确认→发布流程导航 | 与状态流合并成一个组件 |
| KPI | `SignalBand` + `score-workbench-signal` | 顶栏指标 tiles | 用 SignalBand 冒充状态流转 |

挂载：`score-finalize.vue`（mode=confirm）· `score-publish.vue`（mode=publish + publishableCount）。

### 已删 99 件引用重核（Batch 26 续）

- 磁盘：`still_on_disk = 0`
- 业务 `import` / 路径引用（排除 `components.d.ts`）：**0 hits**
- 结论：**可确认删除正确**；卫生债仅剩 d.ts 陈旧声明，需 unplugin/dev 重生成
- 勿因组件名与 ant-design-vue / 变量名撞名（Tabs、InputNumber、RangePicker 等）误判「仍在用」

### P0
1. `PortfolioScopeHeader`：代办标 + 回本人 + 未选语义  
2. 四页 URL 空态文案 → 指向顶部范围  
3. ~~真零引用 3 件~~ **已删**（UiEntityCard / UiSearchForm / InputNumber）；累计 `COMPONENT_ZERO_REF_DELETED` = **102**
4. `components.d.ts` 已剥离已删路径（备份剥离法，避免 Vite 冷启动丢 ant `A*`）

### P1
4. 重生成 / 清洗 `components.d.ts`（去掉 99 已删 + 将删 4 件）  
5. `DualDomainSideNav` 去超市投影  
6. `PortfolioArchiveVersionComparePanel` 文案与 select 原语  

### P2
7. `PortfolioMaterialIntakePanel` 代办确认矩阵  
8. SignalBand/ContextBar 使用审计（禁止双标题、装饰 KPI）

---

## 8. 与 Batch 01–25 关系

- Batch 01–25 对**仍存在**文件的 REWORK/TUNE/OK **仍有效**，除非本批改判。  
- Batch 18 DEAD? 列表中路径 **已 GONE** → 计入「已删 99」，不再占用 DEAD? 待办。  
- 全库 258 现存组件的「逐文件重打分」未在本批一次完成；本批完成：**零引用真相 + 档案袋/质量/范围壳重审 + 关键页**。后续 BATCH_27+ 按包继续（ui-kit 存活件 → mark → archive-volume）。
