# PAGE_HAND_AUDIT_BATCH_P27 · 档案袋页面（首批 20）

> 2026-07-16 · 三 Skill 手审（**禁止脚本写结论**）  
> Impeccable product · Finesse product operate · Taste audit-only（3/2/8）  
> Gate: frontend-design-mark · 只审不改 Vue（除既定 Scope 债已登记）

**Design Read:** regulated university teaching-portfolio workbench · trust-first · high-density · product register · SPECTACLE 2 · DENSITY 8

---

## 批次范围

字母序档案袋前 20 个 `views/portfolio/**/*.vue`（含 `components/PortfolioCockpitAskPanel.vue`）。

| 判定 | 数 |
|------|---:|
| OK | 11 |
| TUNE | 6 |
| REWORK | 3 |
| HOLD | 0 |

---

## 逐页结论

### REWORK

| 页面 | 源码事实 | Impeccable | Finesse | Taste | 动作 |
|------|----------|------------|---------|-------|------|
| `archive-category-edit.vue` L479 | 空态「请从教师名册选择目标教师」；LOCAL_SCOPE | 未选教师与真实无字段未分清；依赖全局 Scope 却仍页内说明 | 可完成但入口文案错位 | 无 slop | 空态改为「请在上方教师范围选择目标教师」；未选不渲染编辑器 |
| `correction.vue` L550 | 同上「请从教师名册…」 | 同 | 纠错办理流本身清晰 | 无 | 同上；与 correction-admin 分责保持 |
| `ai-four-assistants.vue` L602 | 空态已正确指顶部范围；仍 LOCAL_SCOPE；subtitle 已声明须复核 | CTA 分散在助手内；未选门禁 OK | 四助手任务轨未组件化，长页 | 无 | **TUNE 偏 REWORK 边缘**：拆任务轨+历史；禁第二选人。**改判 TUNE**（空态已优） |

> 订正：`ai-four-assistants` → **TUNE**（空态已对齐 Scope）。REWORK 实为 2 页。

### TUNE

| 页面 | 源码事实 | 三 Skill | 动作 |
|------|----------|----------|------|
| `ai-four-assistants.vue` | StageWorkbench + ContextBar；结果须教师确认文案正确 | Imp 通过 AI 边界；Fin 长页；Taste 通过 | 任务轨组件化；继承 Scope 不重复 |
| `ai-orchestration.vue` L814 | CARD_HEAVY；scopeReady；材料先入库文案 | Imp 编排边界清楚；Fin 卡过多；Taste 无 | 收敛卡片；队列主面 |
| `annual-review-scene.vue` | LOCAL_SCOPE + PAGE_SCOPE | 场景页可能叠说明 | 去页内身份说明 |
| `configuration-workbench.vue` L108 | 纯路由按钮超市五段 | Imp 无假状态；Fin **配置超市**难完成感；Taste 平 | 按 CONFIGURATION 壳信息架构分组为「任务」非按钮墙；可接受过渡壳 |
| `department-cockpit.vue` | hex `#f0f0f0` | token 漂移 | 改 `--dp-border` / surface |
| `dept-one-table.vue` L727 | hex `#e8e8e8`；ContextBar 未走 `#context` 槽？ | 结构可用；导出走主 CTA | ContextBar 进 shell slot；hex→token |

### OK

| 页面 | 一句话 |
|------|--------|
| `achievement-comprehensive.vue` | 表+筛选；空态业务语言；单 primary |
| `alert-center.vue` | 失败与真空态分流（画像/合规 loadFailed）— Impeccable 佳 |
| `annual-report-analytics.vue` | 生成任务台账密度合格 |
| `archive-score-rule-admin.vue` | 配置台账 OK |
| `audit-log-admin.vue` | 审计列表克制 |
| `compliance-threshold-admin.vue` | 重算空态可行动 |
| `components/PortfolioCockpitAskPanel.vue` | 驾驶舱问数局部组件；边界清楚 |
| `correction-admin.vue` | 管理端工单；与教师 correction 分责 |
| `department-gap.vue` | 补采催办；空态清楚 |
| `department-objection.vue` | 异议复核 OK |
| `department-report.vue` | 报告列表 OK |
| `department-review.vue` L1076 | 院审台；空态业务语言；**非代办身份** — 保持队列过滤语义 |

---

## 批次级发现

1. **空态禁语未绝迹**：`archive-category-edit` / `correction` 仍「教师名册」口径（弱于 URL 版但仍不指顶部 Scope）。  
2. **配置中心**是功能超市：Finesse 完成度风险，非视觉 slop。  
3. **院审页 OK**：未与管理员代办混淆（本批未发现伪装代办）。  
4. **硬编码灰** `#f0f0f0` / `#e8e8e8` 出现在部门分析页。  

## 与组件账关系

- 全局 `PortfolioScopeHeader` 仍 REWORK（代办标/回本人）— 页级空态依赖其完成。  
- `ScoreAnalyticsStatusFlow` 不在本批（阅卷域）。

## 下批

- **BATCH_P28**：`views/portfolio` 续（含 `teacher-home` / `teacher-archive` / `teacher-portrait` / `teacher-review-status` 等 P0 URL 空态页）  
- **BATCH_P29**：`views/quality/**`  
- **BATCH_P30+**：`views/teacher/**` 阅卷主链  

