## 130. B 区五边界源码核验（2026-07-17）

| 边界 | 源码结论 |
|------|----------|
| 三壳不合并 | SAF + Pipeline + SignalBand 分文件；finalize/publish 同页并存；AnalyticsSection 无；tiles=0 |
| 质量≠档案袋 | quality 无 PortfolioTeacherPickGate/proxy；TeacherSelector 为业务字段；档案门禁独立 |
| 隐私仅本人 | teacher-privacy-consent privacyWriteBlocked；禁代签同意/撤回 |
| Taste 主题 | #1677ff；无产品暗色开关/第二蓝 |
| PATH0 不删 | UiRadio/selectors 等 PATH0 存活；禁脚本批量删 |

用户动作：浏览器 B 区勾「同意」（可与 A 一并终确认）。无改码。

## 131. B 区证据包补强（2026-07-17）

| 项 | 结论 |
|----|------|
| 动作 | 仅看板 `#review-confirm` B 区 + 证据清单；**无业务 Vue 改码** |
| 三壳 | SAF / Pipeline / SignalBand 三分文件；finalize+publish 同页；tiles 类型无；AnalyticsSection 无 |
| 质量≠档案 | quality 内 PortfolioTeacherPickGate=0；QualityScopeChrome + QualityPlanGateStrip |
| 隐私 | teacher-privacy-consent privacyWriteBlocked；禁代签同意/撤回/暂不授权 |
| Taste | ui-tokens primary=#1677ff；无产品暗色开关 |
| PATH0 | UiRadio/Select/Checkbox/Switch 存活且有挂用 |
| 你确认 | B 五条仍为 □ 同意（不代勾） |

用户动作：`craft-board-hi-fi.html#review-confirm` 先勾 B → 再审 A → 终确认。


## 132. B 五条用户同意（2026-07-17）

| 项 | 结论 |
|----|------|
| 用户口径 | 「B同意」 |
| 看板 | `#review-confirm` B 区五条「你确认」→ ☑ 同意 |
| 业务码 | 无改 |
| 下一动作 | 用户审 A 区 → 终确认 / 列改项 |


## 133. 挂用 Vue 全量手审（2026-07-17）

| 项 | 结论 |
|----|------|
| 范围 | ExamSelect 35 + Quality 14 + Portfolio 24 = **73** 页（非抽样） |
| 结果 | **73/73 OK · TUNE 0 · REWORK 0** |
| 台账 | `CONSUMER_VUE_HAND_AUDIT_2026-07-17.md` |
| 看板 | `#review-confirm` B2 表 |
| 业务码 | 无改 |
| 说明 | dashboard 双 QualityPlanGateStrip 为互斥；remediation ContextBar 双 primary 状态互斥 |
| 下一动作 | 用户 A 区观感终确认 |


## 134. 改动组件挂载页全量手审（2026-07-17）

| 项 | 结论 |
|----|------|
| 目标 | 所有改动组件挂载页面全量逐页手审 |
| 清单 | `CRAFT_MOUNT_INVENTORY.json` |
| views | **265/265 OK** · `MOUNT_AUDIT_MASTER.md` |
| UiDataTable views | **166/166 OK** · 06b 合同 |
| SignalBand/ContextBar/UiEmpty/Tabs/Shell… | 分册全 OK |
| components 挂载面 | **77/77 OK** · `MOUNT_AUDIT_COMPONENTS.md` |
| 门禁 73 | 仍见 `CONSUMER_VUE_HAND_AUDIT_2026-07-17.md` |
| TUNE/REWORK | **0** |
| 业务码 | 无改 |
| 下一动作 | 用户统一审查台账 + A 区观感 |


# Craft 看板变更统计 · 2026-07-16（业务 Vue 改码进行中 · 2026-07-17 续）

> 用途：用户续审时的变更台账。**业务代码改动 = 0。**

## 1. 触及文件

| 文件 | 角色 | 约体积 |
|------|------|--------|
| `craft-board-hi-fi.html` | 高保真审查板（主） | ~1.3 MB |
| `EMPTY_GATE_PLAN_UNCONFIRMED_TRI_SKILL.md` | 门禁/空态/大卡定案 | ~11 KB |
| `CRAFT_BOARD_CHANGE_STATS_2026-07-16.md` | 本统计 | 本文件 |

## 2. 定案项（用户已拍板或截图否决）

| # | 定案 | 看板锚点 | 状态 |
|---|------|----------|------|
| 1 | 空态/门禁 **形态 B 钉条**（≤48px · 唯一 CTA） | `#north-star` | 定案 |
| 2 | 否决 **大插画 Empty** / 全宽黄粉 Alert | `#north-star` · `#component-vision` | 定案 |
| 3 | 档案袋身份 **单行 Scope**（本人/代办 Tag + 回本人） | `#proxy-interaction` · `#component-vision` | 定案 |
| 4 | 否决并 **移除** 粉红「未选择目标教师」大卡、「代办办理中」标题行动卡 | `#proxy-interaction` | 定案（看板） |
| 5 | 门禁真源：质量 = `QualityScopeChrome`；档案袋 = `PortfolioScopeHeader` | 决策表 | 定案 |
| 6 | 业务门禁不放宽（未确认方案不可正式达成度/报告） | EMPTY_GATE | 定案 |
| 7 | AI 四助手 IA | `#assistants` | **SHIP · 用户确认**（本人办理 + 代办/未选） |

## 3. 看板 mock 改动计数（约）

| 类型 | 数量/说明 |
|------|-----------|
| 新增/强化 B 钉条 mock | gate-row ×8 处量级 |
| 轻占位 empty-lite | ×8 |
| 否决角标 / SHIP 角标 | veto + ok-badge |
| `.gate` 样式 | 标「否决大卡」角标，仅反例 |
| Portfolio 远景六格 state-contract | 已从推荐远景移除 |
| 决策表新增「否决并移除大卡」行 | 1 |
| 审查清单新增勾选项 | 钉条 + 代办禁大卡 + 页大 Empty 待批 |
| section 开闭 | 23 / 23 平衡 |

## 4. 文档同步

| 文档章节 | 内容 |
|----------|------|
| EMPTY_GATE §9–10 | B 钉条定案勾选 |
| EMPTY_GATE §11 | 档案袋大卡截图否决 + 待清页线索 |
| 本文件 | 统计 + AI 助手 HOLD |

## 5. 业务 Vue（明确 0 改动）

- **未**改 `edu-practice-mark-vue/src/**`
- **未**删组件、**未** regen `components.d.ts`
- 待批清退线索（仅记录）：  
  - quality：achievement / dashboard / report 大 Empty  
  - portfolio：`ai-four-assistants`、`teacher-portrait`、`correction`、`archive-category-edit`、`teacher-evaluation` 等未选教师大 Empty/双写

## 6. 续审队列（用户进行中）

- [x] 空态 B 钉条 / 否决大插画  
- [x] 代办壳禁大卡  
- [x] **AI 四助手 IA** — 用户确认两 mock SHIP（本人办理 + 代办/未选）  
- [ ] 其它组件远景逐页审查  
- [ ] 批准后再改业务码  

## 7. 打开入口

- 总板：`edu-practice-mark-vue/.impeccable/craft-optimization/craft-board-hi-fi.html`
- 空态：`#north-star`
- 代办：`#proxy-interaction`
- AI 助手 HOLD：`#assistants`
- 审查勾选：`#review-confirm`

## 8. AI 四助手重画说明（2026-07-16 晚）

- **否决**：左任务轨 + 中编辑器 + 右历史（IDE/邮件隐喻）。
- **推荐 mock**：保留「理念/总结/画像/材料」四 Tab；单栏草稿；顶条状态+唯一主 CTA；底栏版本 chips；未选/代办与全局 B 钉条同构。
- **状态**：**SHIP（用户确认）**；业务 Vue 仍 0 改动，落地另批。

## 9. AI 四助手用户确认（2026-07-16）

| mock | 结论 |
|------|------|
| 重画 · 本人办理 | **确认 SHIP** |
| 重画 · 管理员代办 / 未选 | **确认 SHIP** |
| IDE 三栏 | 仍否决 |
| 业务改码 | 未批；确认的是看板远景 |

## 10. 缺失幕补回（2026-07-16）

| 幕 | 锚点 | 状态 |
|----|------|------|
| 03 考试内旅程+概览 | `#scene-03` | 已补 mock · 待确认 |
| 06b 表格与多 Tab | `#scene-06b` | 已补 mock · 待确认 |
| 07 全景工作台 | `#scene-07` | 已补 mock · 待确认 |
| 08 档案袋·质量流程 | `#scene-08` | 已补 mock · 待确认 |
| 09 AI·扫描·OCR | `#scene-09` | 已补 mock · 待勾选 A3 |
| 索引 | `#scene-index` | 导航入口 |

业务 Vue 仍 0 改动。

## 11. 09 幕纠偏（2026-07-16）

- **否决**：教师=找内容；超管 OCR 配置进本幕；只画队列不画带队。  
- **定案草案**：主考带队三程（扫描清障 · 阅卷盯人 · 本场学情知况）+ 协作教师任务面。  
- **状态**：看板已重画 · **待用户确认** · 业务 Vue 0 改动。

## 12. 源码对齐 08/09（2026-07-16）

- **08**：否决域/工作壳黑话；按 teacher-home 门禁→待办→维护重画。  
- **09**：带队方向保留；标明须主考/派发/扫描 API 合同后再定交互。  
- 文档：`BUSINESS_FLOW_CODE_ALIGNED_08_09.md`

## 13. 09 源码合同（续）

- 文档：`TEAM_LEAD_CONTRACT_09.md`
- 看板 `#scene-09` 去掉假「指派/催办」，对齐共享异常队列 + 题组策略 + 任务池
- 业务 Vue 仍 0

## 14. 09 合同版二次重画（2026-07-16 续）

- **问题**：看板 `#scene-09` 仍残留「派给王老师 / 催办 / 已派李工」主路径草图，与 `TEAM_LEAD_CONTRACT_09.md` 冲突（上一轮文档已定案但 HTML 未完全替换）。
- **处理**：整节替换为 **源码合同版** mock：
  - 否决区：假派单/假催办（反例）
  - 推荐：共享 attention 队列 CTA=处理/绑定/监控
  - 阅卷：题组进度表 + 策略/启评；教师=任务池领取
  - 学情：锁考本场；配置域移出
- **同步**：`BUSINESS_FLOW_CODE_ALIGNED_08_09.md` §2/§4；scene-index 文案
- **业务 Vue**：仍 **0** 改动
- **待用户**：合同 §7 四勾 + 08/03/06b/07 分幕勾选

## 15. Layout 18 三 Skill 全表（已出）

- 文档：`LAYOUT_TRI_SKILL_BATCH_28.md`
- 分布：OK10 / TUNE5 / REWORK1（DualDomainSideNav 更多入口）/ SHELL2
- 未改 layout 代码；审查勾选见该 md 末

## 16. 08 入口 IA 重画（2026-07-16 续）

- **用户质疑**：管理员应有老师档案袋列表进入；老师进自己的；非顶栏选人；是否先建立档案袋。
- **源码**：`teacher-directory` 已是列表入口；`PortfolioScopeHeader` 顶栏 Select 仅 `canPickTeachers`；首建=readiness+privacy+onboarding。
- **清北**：清华教师建立袋+院系评袋；北大教师主体平台。
- **看板**：`#scene-08` 整节替换为入口 IA（否决顶栏主入口 / 推荐 A本人 B名册 C首建 / 院审任务 / 质量隔离）。
- **文档**：`PORTFOLIO_ENTRY_IA_08.md`
- **业务 Vue**：0

## 17. 质量入口纠偏（2026-07-16 续）

- **用户**：质量「换域 → QualityScope 学期任务链；治理」严重错误；现网是不同菜单不同列表不同主页面。
- **处理**：`#quality-blueprint` 整节重画；`QUALITY_ENTRY_IA.md`；作废 F-FLOW-QUALITY 任务链表述；08 质量并列说明改为菜单分页。
- **业务 Vue**：0（路由本就正确，只改设计表述）

## 18. 清北理念差异分析（2026-07-16 续）

- 文档：`PORTFOLIO_QINGBEI_GAP_ANALYSIS.md`
- 看板：`#qingbei-gap`
- 结论：清北=代表作+全过程+评袋/发展；现网=证据流水线+完整度+场景合规；最大缺口=过程记录与整袋评阅视图
- 业务 Vue：0

## 19. 清北认可 · 须补充规格（2026-07-16 续）

- 用户认可清北理念；文档 §8 理念勾选已记 SHIP
- 新增须补充包 **S1–S5** 规格（`PORTFOLIO_QINGBEI_GAP_ANALYSIS.md` §10）
- 看板 `#qingbei-gap` 重画为：清单 / 代表作预览 / 过程记录 / 反堆砌+评袋 mock
- 业务 Vue：0；改码另批

## 20. 完整方案文档（2026-07-16 续）

- 主方案：`docs/plans/2026-07-16-mark-vue-craft-full-plan.md`
- 索引：`FULL_PLAN_INDEX.md`
- 结论：可以规划完整方案；分波次 A–F；业务 Vue 仍 0

## 21. 档案入口 A+B+C 全要（2026-07-16 续）

- 用户确认：推荐 A 本人工作台 · B 名册进入 · C 首次启用 **全部需要**（角色分流，非三选一）
- 文档：`PORTFOLIO_ENTRY_IA_08.md` §6.1 / §8
- 看板：`#scene-08` 角标 A+B+C 全要 · SHIP
- 完整方案 D10 SHIP · 实施归 **波次 B**
- 业务 Vue：0

## 22. 业务 Vue 落地波次（2026-07-16 续 · 改码）

> 用户确认：看板全部优化建议一次性实现（A+B+C 已 SHIP；本段补 A4 / E / F / 质量 need-confirm / S4 文案）。

### 已改码路径（本段）

| 域 | 路径 | 对应定案 |
|----|------|----------|
| 档案 AI | `views/portfolio/ai-four-assistants.vue` | D03 四 Tab + 单栏草稿 + 版本 chips；代办钉条；禁 IDE 三栏 |
| 质量门禁 | `achievement.vue` / `report.vue` / `dashboard.vue` | D01 need-plan + **need-confirm** B 钉条 |
| 考试侧栏 | `ExamSubSidebar.vue` / `ExamSubSidebarNav.vue` | E1 本程工具；primary 主路径 + 次要工具折叠 |
| 布局 | `DualDomainSideNav.vue` | F1 secondary≤4 一级化；禁裸「更多」文案 |
| 原语 | `SignalBand.vue` | P-* panel active 淡底+边+蓝字 |
| 清北 S4 | `promotion-scene.vue` / `annual-review-scene.vue` | 出包前甄选提示 + 代表作链 |

### 仍未闭环（需后端或另波）

| 项 | 原因 |
|----|------|
| S3 过程记录完整课次三段落库 | 现网 `teacher-process-journal` 仍为课程档案入口；新模型另评 |
| S4 出包硬门禁 | 仅文案钩子；强制拦截需 API/规则 |
| E2/E3 全站表/Tab 扫改 | 合同已写，逐页改量另批 |
| 09 假指派文案全扫 | 扫描异常「指派」与任务池真实指派需区分后改 |
| DEAD 再批 | 前批 3 已删；PATH0 假阳性不批量删 |
| 管理员 defaultWorkShell 强制名册 | 依赖后端 `defaultWorkShellRoute`；前端名册 CTA 已就位 |

### 验证

- `pnpm exec vue-tsc --noEmit`（edu-practice-mark-vue）→ EXIT 0

## 23. 业务 Vue 续跑（2026-07-17 · B 钉条 / 管理员着陆 / 质量门禁扩展）

> 续跑 handoff：空态门禁全量收敛 · 管理员默认名册 · 质量页门禁钉条化。**禁止大插画 Empty 作门禁**。

### 本段已改码

| 域 | 路径 | 对应定案 |
|----|------|----------|
| 档案门禁 | `teacher-indicator` / `teacher-review-status` / `teacher-course-archive` / `teacher-extension-activity` / `teacher-teaching-philosophy` / `teacher-profile` / `teacher-honor` / `teacher-materials` / `teacher-intake` / `ai-orchestration` / `promotion-scene` | D01+B 钉条 · `PortfolioTeacherPickGate` 唯一 CTA 名册 |
| 档案着陆 | `work-shell-entry.vue` | D10-B：`canPickTeachers` 且 TEACHER 壳 → `/portfolio/teachers` |
| 质量门禁 | `accreditation-cockpit.vue` | need-plan → `QualityPlanGateStrip` |
| 质量门禁 | `score-record.vue` / `score-batch.vue` | 未选方案 → `QualityPlanGateStrip`；未选课程 → 钉条 Tag（非大 Empty） |
| 质量门禁 | `process-evaluation.vue` | 未选课程 → 钉条 Tag |

### 仍未闭环

| 项 | 状态 |
|----|------|
| S3 课次三段落库 | 后置 |
| S4 出包硬门禁 | 后置（仅文案） |
| E2 全站 `a-tabs type=card` | 另批 |
| 09 扫描共享队列文案精修 | 本场扫描无假「指派给人」CTA；派单=工位工单真源，勿删 |
| `teacher-gap` 等任务深链未选人 | 从任务进入，门禁优先级低 |
| 后端 defaultWorkShell 名册 | 前端 TEACHER 壳已补拦；后端默认路由仍可后续对齐 |

### 验证

- `pnpm --dir edu-practice-mark-vue exec vue-tsc --noEmit` → **EXIT 0**（2026-07-17）

## 24. 业务 Vue 续跑（2026-07-17 · 考试门禁 / S3 三段 / 启用 C）

### 本段已改码

| 域 | 路径 | 对应定案 |
|----|------|----------|
| 考试门禁原语 | `components/workbench/ExamSelectGateStrip.vue` | D01 · B 钉条 · CTA 考试列表 |
| 考试页门禁 | statistics / appeal / score-finalize / score-publish / absence / spot-check / experience / review-progress / marking-progress / prep / scan-batch / print-package / roster / arbitration / audit / marking-quality-dashboard / teaching-affairs-sync / marking-org / export-tasks | E 波 · 禁大 Empty「请选择考试」 |
| 质量 | `quality-ingest-hub-layout.vue` | need-plan 钉条 |
| 档案 S3 | `teacher-process-journal.vue` | 课前/过程/反馈映射五框架 · overview API |
| 档案 C | `PortfolioTeacherOnboardingWizard.vue` | 启用白话 + dense 阻断钉条 |
| 档案范围 | department-cockpit / major-group / dept-one-table | 未选组织钉条 |

### 仍后置

| 项 | 状态 |
|----|------|
| S4 出包硬门禁 API | 仅文案钩子 |
| S5 评袋深链增强 | 院审已有读整袋入口，另评 |
| E2 type=card | 现网已无 `type=card` 页过滤 |
| 09 假指派 | 本场扫描无假指派；工位派单保留 |
| 后端 defaultWorkShell 名册 | 前端 TEACHER 壳已拦 |

### 验证

- `pnpm --dir edu-practice-mark-vue exec vue-tsc --noEmit` → **EXIT 0**（2026-07-17 §24）

## 25. 业务 Vue + 后端（2026-07-17 · S4 硬门禁 / S5 读整袋 / 默认名册）

### 本段已改码

| 域 | 路径 | 对应定案 |
|----|------|----------|
| S4 DB | `t_portfolio_title_promotion_application.selection_confirmed` | 反堆砌硬门禁字段 |
| S4 后端 | entity/request/VO/mapper/`PortfolioTitleCriteriaEvaluateService`/`PortfolioTitlePromotionService` | canSubmit 强制甄选；submit 再校验 |
| S4 前端 | `promotion-scene.vue` + `title-promotion.ts` | 甄选 Checkbox + payload |
| S5 | `department-review.vue` 列表操作 | 读整袋（代表作）与复核并列 |
| 默认壳 | `PortfolioOrgAccessService` tenantWide TEACHER 路由 | `/portfolio/teachers` |
| IT | `PortfolioWorkShellAccessScopeIntegrationTest` + TitleCriteria IT | 对齐新合同 |

### 验证

- 前端：`vue-tsc --noEmit` EXIT 0
- 后端 IT：`PortfolioWorkShellAccessScopeIntegrationTest` 4/4 · `PortfolioTitleCriteriaEvaluationIntegrationTest` 8/8 · Failures 0
- 前端再跑：`vue-tsc --noEmit` EXIT 0

## 26. 业务 Vue 续跑（2026-07-17 · S5 职称读整袋 / 考试钉条扫尾 / 页内选择钉条）

### 本段已改码

| 域 | 路径 | 对应定案 |
|----|------|----------|
| S5 职称院审 | `title-promotion-admin.vue` 列表操作 + 院审/专家抽屉 | 读整袋 → `/portfolio/teacher/masterpiece?teacherId=`（`teacherUserId`） |
| 考试门禁扫尾 | `scan-live-monitor` / `ocr-settings` / `review-task-hub` / `image-ledger` / `scan-manual-entry` / `review-batch-confirm` / `review-workspace` / `exam-layout-designer` / `exam-workspace-layout` / `exam-workspace-question-analysis` / `marking-experience-assist-policy` | D01 · `ExamSelectGateStrip` 替换「未进入考试工作台 / 缺少考试上下文」大 Empty |
| 质量页内选择 | `score-record` 未选批次 · `process-evaluation` 未选节点 | Tag + 钉条（非大 Empty「请选择」） |
| 档案页内选择 | `development-plan-admin` / `development-plan-department-admin` / `template-admin` | 未选规划/分类 → 钉条 |
| P-* 细节 | `_analysis-center.scss` AI 建议块 | 去左彩条 → 淡底+边（对齐 #scene-07） |

### 仍后置

| 项 | 状态 |
|----|------|
| S3 课次三段独立落库 | 现为五框架映射；需新模型时再开后端 |
| E2 全站 a-tabs → UiSectionTabs | 现网已无 type=card；语义 Tab 另批 |
| 表行 inset 左条（考试列表优先级/归档风险行） | 列表紧迫态指示，非 KPI 左彩条；若要统一再批 |
| school 角色抽查入口深链 | 规格有，产品另拍 |
| DEAD 组件 PATH0 手审删除 | 禁止脚本批量删 |

### 验证

- `pnpm --dir edu-practice-mark-vue typecheck`（`vue-tsc -p tsconfig.app.json --noEmit`）→ **EXIT 0**（2026-07-17 §26）

## 27. 业务 Vue 续跑（2026-07-17 · E2 Tab / S5 抽查读整袋 / 表行去左条 / 页内钉条）

### 本段已改码

| 域 | 路径 | 对应定案 |
|----|------|----------|
| E2 Tab | `title-promotion-admin.vue` | `a-tabs` → `UiSectionTabs`（线型 Tab，禁 card） |
| S5 抽查 | `reviewer-browse.vue` | 行操作首项「读整袋」 |
| S5 专家 | `expert-review.vue` | 非脱敏审阅包：被评教师表「读整袋」；脱敏态不暴露 ID/不深链 |
| 表行 P-* | `exam-list.vue` / `archive-volume-list.vue` | inset 左彩条 → 整行淡底 tone |
| 页内钉条 | `quality-course-matrix` / `training-plan-workbench` / `ai-task` / `IndirectResponseReviewPanel` / `score-detail` / remediation / supervision / readiness / development-plan* | Tag + 钉条替换「请选择」大 Empty |

### 未做（明确后置）

| 项 | 原因 |
|----|------|
| development-plan* 全量 a-tabs→UiSectionTabs | 多 pane + 条件 Tab，机械替换易损；本轮仅保留钉条，Tab 另批手工 |
| S3 课次三段落库 | 需新模型 |
| 全站其余 a-tabs | 逐步高流量页迁移 |

### 验证

- `pnpm --dir edu-practice-mark-vue typecheck`（vue-tsc app）→ **EXIT 0**（2026-07-17 §27）
- 顺带修复 `development-plan-admin` 历史导入诊断：`errorReportJson` → 契约字段 `errorReport[]`

## 28. 业务 Vue 续跑（2026-07-17 · E2 高流量 Tab 迁移 / 页内钉条）

### 本段已改码

| 域 | 路径 | 对应定案 |
|----|------|----------|
| E2 Tab | `key-teacher-admin` / `quality-ingest-hub-layout` / `teacher-recommendation-admin` / `national-achievement-admin` / `evaluation-fill-admin` / `external-teacher-admin` / `improvement-workbench` / `accreditation-cockpit` | `a-tabs` → `UiSectionTabs` |
| E2 Tab | `indicator-history` / `indicator-tenant-admin` / `indicator-ops-admin` / `indicator-platform-admin` | 安全按 `a-tab-pane` 边界迁移（保留嵌套 bodyCell） |
| 页内钉条 | `promotion-scene` / `org-admin` / `marking-quality-dashboard` / `scan-batch-detail-workbench` / `archive-volume-statistics` | Tag + 钉条；批次明细考试门禁用 `ExamSelectGateStrip` |

### 仍后置

| 项 | 状态 |
|----|------|
| development-plan* / teacher-profile / archive.vue / quality archive / message / login | 多 pane 或壳页，另批 |
| S3 课次落库 | 需后端模型 |
| DEAD 组件手审 | 禁脚本批量删 |

### 验证

- `pnpm --dir edu-practice-mark-vue typecheck` → **EXIT 0**（2026-07-17 §28）
- 指标页契约对齐：`snapshotSummary` / `indicatorSummary` 结构化展示；试算 `params`；解释抽屉 `scoreExplain`/`eligibilityExplain`

## 29. 业务 Vue 续跑（2026-07-17 · 剩余 a-tabs 清零）

### 本段已改码

| 域 | 路径 | 对应定案 |
|----|------|----------|
| E2 Tab | `development-plan-admin` / `development-plan-department-admin` | 条件 Tab 用 computed items + `showAdminStats` |
| E2 Tab | `teacher-profile` / `quality/archive` / `user/message` / `quality/ai-task` | `UiSectionTabs`；消息 Tab 带未读 count |
| E2 Tab | `ArchiveTemplateSetEditorDrawer` / `ArchiveTemplateSetPreviewDrawer` | 动态分组 Tab + 自查项，v-show 保挂载 |
| E2 Tab | `ArchiveVolumeMaterialOcrDetailContent` | 页级 Tab → UiSectionTabs + activePage |
| 登录 | `login/pwdExpired` | 去装饰性 a-tabs，过期提示 + 表单 |

### 验证

- `pnpm --dir edu-practice-mark-vue typecheck` → **EXIT 0**（2026-07-17 §29）
- `src/views` 下 `<a-tabs` 扫描：**0** 处
- 修复：`development-plan-admin` 历史导入 `errorReport[]`；消息 Tab `badgeTone` 收窄为 `ToneCode`

## 30. 业务 Vue 续跑（2026-07-17 · 钉条扫尾 / DEAD 手审结论）

### 本段已改码

| 域 | 路径 | 对应定案 |
|----|------|----------|
| 页内钉条 | `development-plan-admin.vue` | 未选规划 `UiEmpty` → Tag + `UiAlertStrip`（与 department-admin 同构） |
| 质量门禁 | `ai-task.vue` | 未选培养方案 → `QualityPlanGateStrip`（唯一真源，含 CTA） |
| 认证支撑 | `AccreditationSupportPanel.vue` | 无方案只显钉条并隐藏编辑区；数据空仍用 `UiEmpty` |
| 自评报告 | `SelfAssessmentReportPanel.vue` | 未登记周期 → 钉条 |
| 阅卷质量 | `marking-quality-dashboard.vue` | 题组进度汇总 `!scopeValid` → 钉条（与快照区一致） |
| 扫描检视 | `ScanBatchPageInspectorPanel.vue` | 未选页轨 → 钉条 |
| 阅卷经验 | `grading-experience-hub.vue` | 聚类待查询 → 钉条 |

### DEAD 手审（禁脚本批量删）

| 组件 | 结论 | 证据 |
|------|------|------|
| `ScoreAnalyticsStatusFlow` | **在用** | `score-finalize` / `score-publish` |
| `TaskResultPanel` | **在用** | `ai-task` / `report` / `achievement` / `external-pull` / `score-batch` |
| `MatrixWorkbench` | **在用** | `quality-course-matrix` / `training-plan-workbench` |
| `ExamJourneyRail` / `ExamJourneyMiniStrip` | **在用** | `ExamWorkspaceChrome` / `ExamWorkbenchOverviewDashboard` |
| `COMPONENT_ZERO_REF_REGISTRY` 中 `refs=0` 且仍存在文件 | **仅 2** | `views/login/components/student|account`（登录壳，在用） |
| 其余 ZERO_REF 路径 | **文件已 MISSING** | 前批已删；本轮 **无新增真 DEAD 可删** |

### 仍后置

| 项 | 状态 |
|----|------|
| S3 课次三段独立落库 | 现为五框架映射；需新模型 |
| 布局设计器 / 向导内「请先完成…」工作流 Empty | 阶段内指导，非页级上下文门禁；不改业务 |
| 表密度 T1/T2 细项 | 页级抽改 |
| school 抽查专入口 | reviewer-browse 已有读整袋 |

### 验证

- `pnpm --dir edu-practice-mark-vue typecheck`（`vue-tsc -p tsconfig.app.json --noEmit`）→ **EXIT 0**（2026-07-17 §30）

## 31. 业务 Vue 续跑（2026-07-17 · 钉条续 / 06b T2 / 看板同步）

### 本段已改码

| 域 | 路径 | 对应定案 |
|----|------|----------|
| 页内钉条 | `absence-confirm.vue` | 未出勤核对 → Tag 钉条 + 唯一 CTA「立即出勤核对」 |
| 页内钉条 | `teacher-pk-analytics.vue` | 未生成对比 → 钉条（非大 Empty） |
| 页内钉条 | `PortfolioMaterialIntakePanel.vue` | 待登记字段 → 钉条 |
| 页内钉条 | `archive-volume-eval-campaign.vue` | 未选迎评批次 → 钉条；表仅在选批后展示，空文案改为数据空 |
| 06b T2 | `UiDataTable.vue` | 表边/底边统一 `--dp-table-border` |
| 看板 | `craft-board-hi-fi.html#scene-06b` | T1+T2+T3 角标 SHIP；审查清单勾选 |

### 已核实仍成立（未改码）

| 项 | 证据 |
|----|------|
| F1 侧栏禁裸「更多」 | `DualDomainSideNav` 语义折叠标签 + secondary≤4 全提升 |
| S4 出包甄选硬门禁 | 前端 `promotion-scene` checkbox + 后端 `PortfolioTitlePromotionService` 提交校验 |
| T3 a-tabs 清零 | `src/**/*.vue` 无 `<a-tabs`（§29） |
| 成绩分析三壳分责 | StatusFlow / Pipeline 未合并 |

### 仍后置

| 项 | 状态 |
|----|------|
| S3 课次三段独立落库 | 需新数据模型，现为五框架映射 |
| 布局设计器阶段 Empty | 工作流步骤指导，非页级 Scope 门禁 |
| 表行操作 ≤1 主 CTA 全站抽查 | 页级渐进 |

### 验证

- `pnpm --dir edu-practice-mark-vue typecheck`（`vue-tsc -p tsconfig.app.json --noEmit`）→ **EXIT 0**（2026-07-17 §31）

## 32. S3 全过程过程记录独立落库（2026-07-17）

### 本段已改码

| 层 | 路径 | 说明 |
|----|------|------|
| SQL | `edu-quality/.../sql/2026-07-17-portfolio-process-session.sql` | `t_portfolio_process_session` 已在 `nybc_ai_mark` 执行 |
| 后端 | Entity/Mapper/XML/Service/Controller `PortfolioProcessSession*` | list/save/delete/set-masterpiece |
| API | `/api/portfolio/process-session/*` | 仅本人可写；列表可按课程/精选过滤；讲授课程锚定校验 |
| 前端 | `apis/portfolio/process-session.ts` | 契约类型 |
| 前端 | `teacher-process-journal.vue` | 选课→新建课次→三段编辑→独立落库→精选代表作 |
| 前端 | `teacher-masterpiece.vue` | 第④章展示 `selectedOnly` 过程记录 |

### 验证

- `mvn -pl edu-quality -am compile -DskipTests` → **BUILD SUCCESS**
- `pnpm exec vue-tsc -p tsconfig.app.json --noEmit` → **EXIT 0**
- 远程表 `nybc_ai_mark.t_portfolio_process_session` 列结构已确认

### 仍后置

| 项 | 状态 |
|----|------|
| 过程记录进材料审核任务队列 | 可选后续：linked_archive_record_id 深链 |
| 布局设计器阶段 Empty | **§33 已钉条化** |
| 行操作 ≤1 主 CTA 全站抽查 | **§33 高流量页已收敛**；剩余页级渐进 |

## 33. 布局阶段 Empty 钉条 + 行 CTA 唯一主操作 + 双真源收敛（2026-07-17）

### 本段已改码

| 域 | 路径 | 对应定案 |
|----|------|----------|
| 布局阶段钉条 | `LayoutDesignLayoutPhase.vue` | 「待同步页底图」Tag + `UiAlertStrip`，否决大 Empty |
| 布局阶段钉条 | `LayoutQuestionLedgerPanel.vue` | 「待完成资料入口」钉条 |
| 布局阶段钉条 | `LayoutPreviewDrawer.vue` | 待生成预览 / 预览未就绪 钉条 |
| 布局阶段钉条 | `LayoutCanvas.vue` | 「待配置页背景」钉条 |
| 行 CTA ≤1 primary | `exam-list.vue` | `进入` primary；`阅卷` 降为次操作 |
| 行 CTA ≤1 primary | `archive-volume-search.vue` | 仅「查看卷」primary |
| 行 CTA ≤1 primary | `scan-live-monitor.vue` | 关注项主处置 1 primary；补扫次操作 |
| 行 CTA ≤1 primary | `school-evaluation.vue` | 阶段主动作唯一 primary（恢复>发布>异议>推进>归档） |
| 行 CTA ≤1 primary | `ai-model-profile.vue` / `teaching-affairs-sync.vue` / `teacher-evaluation.vue` | 去掉并存双 primary |
| 行 CTA ≤1 primary | `archive-volume-list.vue` | 仅「详情」primary |
| 行 CTA ≤1 primary | `scan-batch-workbench.vue` | 可重试时重试 primary，否则详情 |
| 行 CTA ≤1 primary | `ai-task.vue` | 立即执行 > 重置 > 人工处置 唯一 primary |
| 行 CTA ≤1 primary | `score-batch.vue` | 确认优先于重新解析 |
| 双真源 | `Button.vue` + `UiButton.vue` | `small`/`secondary→soft`/token 并入 `Button`；`UiButton` re-export |
| 双真源 | `Empty.vue` + `UiEmpty.vue` | 字节相同；`UiEmpty` re-export `Empty` |

### 定案对齐

- B 钉条 ≤48px 语义：阶段工作流「请先…」与页级 Scope 门禁同构（Tag + 文案，无大插画）
- 不合并成绩分析三壳；`ScoreAnalyticsStatusFlow` 仍保留
- 不把阶段 Empty 当成 Scope 放开业务

### 仍后置

| 项 | 状态 |
|----|------|
| 过程记录 → 材料审核深链 | **§34 已落地** link-archive API + 过程记录页办理 |
| 租户可配过程类目 | **§35**：过程→档案仅列出已发布模板分类（租户在档案模板治理配置） |
| 行 CTA 全站剩余页 | 低流量列表页级渐进 |
| 看板 HTML 部分幕角标与现网全文同步 | 03/07/09 等 |

### 验证

- `pnpm --dir edu-practice-mark-vue exec vue-tsc --noEmit` → **EXIT 0**（2026-07-17 §33）

## 34. 过程记录 → 材料审核深链（2026-07-17）

### 本段已改码

| 层 | 路径 | 说明 |
|----|------|------|
| Request | `PortfolioProcessSessionLinkArchiveRequest` | id / categoryId / submitForReview |
| Service | `PortfolioProcessSessionService#linkToArchive` | 确认态校验；已发布模板字段语义映射；saveDraft/submit；回写 `linkedArchiveRecordId` |
| Controller | `POST /api/portfolio/process-session/link-archive` | 返回 `PortfolioArchiveRecordWriteResultVO` |
| API | `process-session.ts#linkArchive` | 前端契约 |
| UI | `teacher-process-journal.vue` | 「提交材料审核」钉条式办理抽屉：选分类 + 可选立即提交；Tag「已关联档案」；打开关联 |

### 业务规则

- 仅教师本人可写（与 S3 过程记录一致）
- 须 `CONFIRMED` 才可提交材料审核
- 字段映射：标题/日期/课程/准备/过程/反馈/综合叙述 → 模板 fieldCode/label；必填未覆盖显式失败
- 证据引用：`PROCESS_SESSION:{id}`
- 非无感入库：默认可勾选立即提交；关闭则仅草稿

### 验证

- `mvn -pl edu-common install -DskipTests` → EXIT 0
- `mvn -pl edu-quality compile -DskipTests` → EXIT 0（`linkToArchive` 已进 class）
- `pnpm --dir edu-practice-mark-vue exec vue-tsc --noEmit` → EXIT 0

### 仍后置

| 项 | 状态 |
|----|------|
| 租户可配过程类目模板 | 依赖档案分类模板配置；非本轮硬编码类目 |
| 低流量行 CTA 扫尾 | 页级渐进 |
| 看板 03/07/09 全文角标 | 与现网再对齐 |

## 35. 03/07/09 SHIP 对账 + 行 CTA 扫尾 + 过程类目可配入口（2026-07-17）

### 本段已改码

| 域 | 路径 | 对应定案 |
|----|------|----------|
| 看板 | `craft-board-hi-fi.html` #scene-03 / #scene-07 / #scene-09 | 分幕索引与审查清单 ☑ SHIP（现网：ExamWorkspaceChrome + Overview KPI + createUser 主考/共享队列） |
| 行 CTA | `process-evaluation.vue` | 状态迁移仅首个 primary |
| 行 CTA | `dual-teacher-admin.vue` | 行内最多 1 个 primary |
| 过程类目 | `teacher-process-journal.vue` | 关联档案仅 `publishedVersionId` 分类（租户模板可配） |
| 阶段空态 | `promotion-scene.vue` | 「待预览核验」钉条 |

### 现网对账（未改行为，仅确认 SHIP）

| 幕 | 现网真源 |
|----|----------|
| 03 | `ExamWorkspaceChrome` + `ExamJourneyRail` + `ExamWorkbenchOverviewDashboard` |
| 07 | Overview KPI/进度/待办/单主 CTA |
| 09 | `exam.createUser` 主考；扫描 attention 无指派；`marking-task-pool` 领取 |

### 验证

- `pnpm --dir edu-practice-mark-vue exec vue-tsc --noEmit` → **EXIT 0**

### 仍后置

| 项 | 状态 |
|----|------|
| 过程类目专用种子分类 | **§36 已落地** `PROCESS_SESSION` 幂等种子 |
| portfolio 部分数据空态大 Empty | 真无数据保留紧凑 Empty；门禁页已钉条化 |
| 低流量页行 CTA 逐页扫尾 | 页级渐进 |

## 36. PROCESS_SESSION 模板种子 + 审查清单对账（2026-07-17）

### 本段已改码

| 层 | 路径 | 说明 |
|----|------|------|
| 种子 | `PortfolioArchiveTemplateSeedService` | 幂等预置分类 `PROCESS_SESSION`「教学全过程·过程记录」+ 10 字段（课次标题/日期/课程/三段/叙述） |
| 前端 | `teacher-process-journal.vue` | 提交材料审核默认预选 `PROCESS_SESSION`；仅已发布模板分类 |
| 看板 | `craft-board-hi-fi.html` 审查清单 | QualityScope / 未确认方案 / portfolio 门禁 Empty → ☑ 通过（现网 GateStrip） |

### 字段映射对齐

- 必填：`sessionTitle`、`sessionDate`（过程记录确认后必可映射）
- 可选：courseName/code、academicYear、semester、prep/process/feedback、content
- 租户已执行过 `seed/defaults` 时：再次调用幂等补建 `PROCESS_SESSION`（不覆盖已发布）

### 验证

- `mvn -pl edu-quality compile -DskipTests` → **BUILD SUCCESS**
- `pnpm exec vue-tsc --noEmit` → **EXIT 0**

### 仍后置

| 项 | 状态 |
|----|------|
| 各租户运维侧再跑一次 seed/defaults | **§37 远程 nybc_ai_mark 已 SQL 幂等落库 PROCESS_SESSION** |
| 低流量页行 CTA 扫尾 | 页级渐进 |
| craft 手审旧表 P2 页密度 | 与功能无冲突时可渐进 densify |

## 37. 远程 PROCESS_SESSION 落库 + 映射修正 + 账本钉条（2026-07-17）

### 本段已改码 / 执行

| 层 | 路径 | 说明 |
|----|------|------|
| SQL | `edu-quality/.../sql/2026-07-17-portfolio-process-session-category-seed.sql` | 幂等：分类+PUBLISHED 版本+10 字段+默认审核流绑定 |
| 远程 DB | `nybc_ai_mark` tenant=1 | `PROCESS_SESSION` id=915 · version=682 · fields=10 · status=PUBLISHED |
| 映射 | `PortfolioProcessSessionService#resolveFieldValue` | 日期优先于课次标题；`sessiondate`/`academicyear` camelCase 命中 |
| UI | `LedgerSummaryCard.vue` | 未建账本 → Tag + 钉条 |

### 验证

- `psql` 查询：`PROCESS_SESSION` 已发布且 10 字段
- `mvn -pl edu-quality compile -DskipTests` → **BUILD SUCCESS**
- `pnpm exec vue-tsc --noEmit` → **EXIT 0**

### 仍后置

| 项 | 状态 |
|----|------|
| 低流量页行 CTA / 手审 P2 densify | 页级渐进 |
| 其它租户若多租户扩展 | 同 SQL 循环已按 tenant 幂等 |

## 38. 行 CTA 扫尾 + P2 densify + 过程深链（2026-07-17）

### 本段已改码

| 域 | 路径 | 对应定案 |
|----|------|----------|
| 行 CTA ≤1 primary | `ScanExceptionPanel.vue` | 绑定 > 重试页登记 > 前往处理/派单 > 忽略并继续 |
| 行 CTA ≤1 primary | `score-finalize.vue` | 可确认优先于可发布 |
| 行 CTA ≤1 primary | `FormalSessionWorkbench.vue` | 启动 > 完成 > 恢复 > 关闭归档 |
| 行 CTA ≤1 primary | `ReviewRequestsCard.vue` | 领取 / 通过 primary |
| 行 CTA ≤1 primary | `BatchCorrectionPlansCard.vue` | 提交 > 通过 > 执行 |
| 行 CTA ≤1 primary | `AuditIssueTab.vue` | 首个可迁状态 primary |
| P2 densify | `absence-confirm.vue` | 去掉大环图；SignalBand 含出勤率；ContextBar 唯一 primary |
| 过程深链 | `teacher-process-journal.vue` | `getRecord` → `/portfolio/teacher/archive/:categoryId?recordId=`；行内 1 primary |

### 验证

- `pnpm --dir edu-practice-mark-vue exec vue-tsc --noEmit` → **EXIT 0**（2026-07-17 §38）

### 仍后置

| 项 | 状态 |
|----|------|
| 极低流量列表若仍有多 primary | 页级发现再改 |
| craft 手审旧表 P2 余量 densify | 与功能无冲突时渐进 |
| 真无数据紧凑 Empty | 非门禁，勿放开 |

## 39. 质量门禁补齐 + 代办写确认 + 行 CTA 续扫（2026-07-17）

### 本段已改码

| 域 | 路径 | 对应定案 |
|----|------|----------|
| 质量 B 钉条 | `improvement-workbench.vue` | 未选方案 → QualityPlanGateStrip；禁无方案时办任务 |
| 质量 B 钉条 | `quality-course-matrix.vue` | 方案门禁 → 课程钉条 → 矩阵 |
| 质量 B 钉条 | `archive.vue` | 材料归档列表门禁方案 |
| 质量 B 钉条 | `rationality-audit.vue` | 合理性审核门禁方案 |
| 代办写确认 | `usePortfolioProxyWriteGuard.ts` | 代办写操作二次确认目标教师 |
| 代办写确认 | `teacher-process-journal.vue` | 保存/关联/精选/删除 |
| 代办写确认 | `archive-category-edit.vue` | 草稿/提交审核 |
| 代办写确认 | `promotion-scene.vue` | 职称草稿/提交 |
| P2 densify | `score-publish.vue` | ContextBar 次操作 ghost 化 |

### 验证

- `pnpm --dir edu-practice-mark-vue exec vue-tsc --noEmit` → **EXIT 0**（2026-07-17 §39）

### 仍后置

| 项 | 状态 |
|----|------|
| 其余档案袋写页挂载 confirmProxyWrite | 页级渐进（荣誉/材料/画像等） |
| 极低流量列表多 primary | 页级发现再改 |
| 真无数据紧凑 Empty | 非门禁，勿放开 |

## 40. 代办写确认全量铺开 + 材料采集/建档引导（2026-07-17）

### 本段已改码

| 域 | 路径 | 说明 |
|----|------|------|
| 代办写确认 | `usePortfolioProxyWriteGuard.ts` | 真源不变 |
| 教师办理写页 | honor / materials / philosophy / gap / profile / extension / process-journal / archive-category-edit / promotion-scene | 保存/删除/提交前二次确认 |
| 档案与材料 | `teacher-archive.vue` 支撑材料/修订/导出；`PortfolioMaterialIntakePanel.vue` 采集写路径 | 代办确认 |
| AI/评价 | `ai-four-assistants.vue` `ai-orchestration.vue` `teacher-evaluation.vue` `annual-review-scene.vue` | 任务/确认/异议/年报 |
| 其它 | `correction.vue` `teacher-course-archive.vue` `teacher-portrait.vue` `PortfolioTeacherOnboardingWizard.vue` | 纠错/自建分类/忽略推荐/完成引导 |

### 验证

- `pnpm --dir edu-practice-mark-vue exec vue-tsc --noEmit` → **EXIT 0**（2026-07-17 §40）

### 仍后置

| 项 | 状态 |
|----|------|
| 纯只读页（home/indicator/one-table/review-status） | 无需写确认 |
| dual-teacher-apply 本人申请 | 非代办路径，不挂 |
| 极低流量 admin 列表 densify | 页级渐进 |
| craft-board 手审旧表 P2 | 与功能无冲突时 densify |

## 41. P2 densify + 看板 SHIP 对账 + 管理端工具栏密度（2026-07-17）

### 本段已改码

| 域 | 路径 | 说明 |
|----|------|------|
| densify | `score-finalize.vue` | 去重顶栏/告警双 CTA；次操作 ghost；成功态不重复主按钮 |
| densify | `development-plan-admin.vue` | 工具栏 sm + 主次变体 |
| densify | `title-promotion-admin.vue` | 审评动作 sm + 唯一 primary |
| densify | `template-admin.vue` | 分类/字段工具栏 densify |
| densify | `absence-confirm.vue` | 「前往成绩发布」降为 outline |
| 看板 | `craft-board-hi-fi.html` | 代办/Scope/写确认落地优先级改 SHIP 文案 |

### 验证

- `pnpm --dir edu-practice-mark-vue exec vue-tsc --noEmit` → **EXIT 0**（2026-07-17 §41）

### 仍后置

| 项 | 状态 |
|----|------|
| 其它 admin 治理页工具栏 sm 统一 | 页级渐进 |
| craft 手审旧表模板句 | 非改码清单，以 #review-confirm 为准 |
| 全量浏览器手审勾选 | 用户审查确认 |

## 42. 全站工具栏 densify（sm 统一）（2026-07-17）

### 本段已改码

| 域 | 范围 | 说明 |
|----|------|------|
| densify | portfolio `*-admin.vue` / 院审 / 职称 / 模板 / 指标 / 名册等 | 未标 size 的 `UiButton` 统一 `size="sm"` |
| densify | teacher 工作台高流量页 | 缺考/成绩确认/扫描/任务池/出卷等 |
| densify | portfolio 教师办理页 | 荣誉/材料/画像/拓展/档案/过程等 |
| densify | quality 治理 + accreditation 组件 | 院审队列/支撑/证据/年报等 |
| densify | workbench/portfolio 组件 | 材料采集/建档引导/材料布局配置 |

### 验证

- `pnpm --dir edu-practice-mark-vue exec vue-tsc --noEmit` → **EXIT 0**（2026-07-17 §42）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器手审 `#review-confirm` 勾选 | 用户审查 |
| 个别动态 `h(Button)` 渲染路径 size | 页级发现再改 |
| craft 旧手审表模板句 | 不作改码清单 |

## 43. densify 扫尾：剩余 UiButton + a-button 收敛 + kiosk 触控保留（2026-07-17）

### 本段已改码

| 域 | 说明 |
|----|------|
| densify | 全 src 剩余未标 size 的 `UiButton` 补 `size="sm"`（116 处 / 39 文件） |
| kiosk | 扫描工位页撤销 sm densify，恢复默认 `md` 触控尺寸 |
| a→Ui | `quality-course-matrix` 支撑/权重弹层 footer |
| a→Ui | `alert-center` / `indicator-dashboard-admin` 查询刷新 |
| a→Ui | `ReviewWindowPolicyCard` / `BatchCorrectionPlansCard` 策略与明细按钮 |

### 验证

- `pnpm --dir edu-practice-mark-vue exec vue-tsc --noEmit` → **EXIT 0**（2026-07-17 §43）

### 仍后置

| 项 | 状态 |
|----|------|
| 登录/消息等非工作台 a-button | 非 craft 工作台密度主路径 |
| 浏览器 `#review-confirm` 勾选 | 用户手审 |
| 个别遗留 a-button 页级发现 | 渐进 |

## 44. a-button 收敛扫尾 + 组件 footer Ui 化（2026-07-17）

### 本段已改码

| 域 | 路径 | 说明 |
|----|------|------|
| a→Ui | `AuditRectificationTab.vue` / `AuditSupervisionTab.vue` | 证据/发现增删按钮 → UiButton sm |
| a→Ui | `ExportTaskCenter.vue` | 刷新/下载/删除 → UiButton sm |
| a→Ui | `ClassStudentTreeSelectorDrawer.vue` | drawer footer → UiButton sm |

### 验证

- `pnpm --dir edu-practice-mark-vue exec vue-tsc --noEmit` → **EXIT 0**（2026-07-17 §44）

### 仍后置

| 项 | 状态 |
|----|------|
| 消息弹窗 / 改密 a-button | §45 处理消息弹窗 |
| 浏览器 `#review-confirm` 勾选 | 用户手审 |
| 行/工具栏多 primary | §45 收敛 |

## 45. 消息弹窗 Ui + 多 primary 收敛 + 看板 SHIP 对账（2026-07-17）

### 本段已改码

| 域 | 路径 | 说明 |
|----|------|------|
| a→Ui | `NoticePopup.vue` | 上一篇/下一篇/关闭 → UiButton；关闭唯一 primary |
| CTA | `promotion-scene.vue` | 预览核验 outline、草稿 ghost、提交唯一 primary |
| CTA | `archive-volume-settings.vue` | 「返回」ghost、「新建任务」primary |
| CTA | `evaluation-comprehensive-admin.vue` | 空态去掉重复 primary，仅工具栏「分析」 |
| CTA | `score-finalize.vue` | 告警区「去题目复核」outline，避免与顶栏双 primary；清理重复 size 属性 |
| empty | `ImprovementWorkbenchPanel.vue` | size=sm + 紧凑 padding；文案改为真无数据（门禁由页级 QualityPlanGateStrip 承担） |
| 看板 | `craft-board-hi-fi.html` | 结论表「待批」→ 现网 B 钉条/空态 SHIP 说明 |

### 验证

- `pnpm --dir edu-practice-mark-vue exec vue-tsc --noEmit` → **EXIT 0**（2026-07-17 §45）

### 仍后置

| 项 | 状态 |
|----|------|
| 登录/改密/MenuFold a-button | §46 已收敛 |
| kiosk notification `h(Button)` | Ant notification API 宿主，非工作台表单 CTA |
| 浏览器 `#review-confirm` 勾选 | 用户手审确认 |
| 极低流量多 primary | 页级发现再改 |

## 46. 登录改密/侧栏折叠 Ui 化 + 阅卷组织空态去双 primary（2026-07-17）

### 本段已改码

| 域 | 路径 | 说明 |
|----|------|------|
| a→Ui | `change-password.vue` | 取消/提交/刷新 → UiButton |
| a→Ui | `MenuFoldBtn.vue` | 折叠按钮 ghost icon-only |
| a→Ui | `login/.../modifyPassword` | 立即修改 → UiButton |
| CTA | `marking-org-entry.vue` | 空态去掉重复「立即创建」，仅顶栏唯一 primary |

### 验证

- `pnpm --dir edu-practice-mark-vue exec vue-tsc --noEmit` → **EXIT 0**（2026-07-17 §46）

### 仍后置

| 项 | 状态 |
|----|------|
| `AjCaptcha` 内 a-button | 验证码组件壳，保留 Ant |
| 浏览器 `#review-confirm` | 用户手审 |

## 47. Ant 结果/空态/告警清退 + 多 primary 再收敛 + 首页代办写确认（2026-07-17）

### 本段已改码

| 域 | 路径 | 说明 |
|----|------|------|
| a→Ui | `archive-volume-exam-progress.vue` | a-result→UiEmpty；a-alert→UiAlertStrip；关考 CTA outline |
| a→Ui | `LayoutPropertyDrawer` / `LayoutQuestionPropertyPanel` | a-empty→UiEmpty sm |
| a→Ui | `expert-assignment-admin.vue` | 免登链接 a-alert→UiAlertStrip |
| a→Ui | `ai-orchestration.vue` | 类型异常 a-result→UiEmpty |
| a→Ui | `PortfolioCockpitAskPanel.vue` | 问数拒绝 a-result→UiEmpty |
| a→Ui | `ImportResponseDocumentModal.vue` | 成功/失败 a-result→UiEmpty |
| a→Ui | `TaskKindHub.vue` | 工位失败 a-result→UiEmpty |
| CTA | `score-publish.vue` | 告警区导航 CTA 全 outline；顶栏「全场发布」唯一 primary；计零补齐保留 primary |
| CTA | `title-promotion-admin.vue` | 审/专抽屉「读整袋」outline，审核动作保留 primary |
| CTA | `teacher-process-journal.vue` | 无课程「去课程档案」outline |
| CTA | `annual-review-scene.vue` | 「采集与确认材料」outline |
| 代办写 | `teacher-home.vue` | 确认知悉纠错驳回前挂 `confirmProxyWrite` |

### 验证

- `pnpm --dir edu-practice-mark-vue exec vue-tsc --noEmit` → **EXIT 0**（2026-07-17 §47）
- 产品路径 `<a-button` / `<a-result` / `<a-empty` / `<a-alert` 仅余 `AjCaptcha` 内 a-button

### 仍后置

| 项 | 状态 |
|----|------|
| `AjCaptcha` a-button | 验证码壳保留 Ant |
| kiosk `notification` h(Button) | Ant API 宿主 |
| 浏览器 `#review-confirm` 勾选 | 用户手审 |
| 极低流量页多 primary | 页级发现再改 |

## 48. 首页入口墙收紧 + AjCaptcha Ui 化 + 看板 C 区 SHIP 对账（2026-07-17）

### 本段已改码

| 域 | 路径 | 说明 |
|----|------|------|
| IA | `teacher-home.vue` | 顶栏唯一 primary=材料采集；次操作 ghost；「更多」改为分组 ghost 列表，去掉与清单重复入口 |
| a→Ui | `AjCaptcha/index.vue` | 刷新/清除/确认 → UiButton；产品路径 a-button=0 |
| densify | `annual-review-scene.vue` | 去掉页内长条解释句，保留动作行 |
| 看板 | `craft-board-hi-fi.html#review-confirm` C 区 | 原 P0/P1 代办可见性、写保护、URL 文案、Button 双轨标 SHIP；结论草稿同步 |

### 验证

- `pnpm --dir edu-practice-mark-vue exec vue-tsc --noEmit` → **EXIT 0**（2026-07-17 §48）
- 全 src `<a-button` → **0**

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B 勾选 | 用户手审（刻意边界需人确认） |
| 旧 #files/#components 脚本 P0 表 | 索引陈旧，以 #review-confirm / 台账为准 |
| 极低流量 admin CTA 密度 | 页级发现再改 |

## 49. 阅卷任务池考试门禁 + 培养方案工作台 B 钉条密度（2026-07-17）

### 本段已改码

| 域 | 路径 | 说明 |
|----|------|------|
| 门禁 | `marking-task-pool.vue` | 未选考试 `ExamSelectGateStrip`；有考试才渲染旅程/领取/任务表 |
| densify | `training-plan-workbench.vue` | planGate / stageGuidance → Tag+短文案 inline 钉条；去掉长认证说教句 |
| 看板 | `craft-board-hi-fi.html#files` | 声明旧表 P0 标签非现网状态，以 #review-confirm 为准 |

### 验证

- `pnpm --dir edu-practice-mark-vue exec vue-tsc --noEmit` → **EXIT 0**（2026-07-17 §49）
- 证据审计：产品路径 a-button/a-result/a-empty/a-alert=0；代理写路径已挂 guard；ingest-hub 已有 QualityPlanGateStrip

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B 勾选 | 用户手审 |
| 旧 #files 脚本表逐行改标 | 索引用途，不阻塞投产 |
| 极低流量 admin CTA | 页级发现再改 |

## 50. 阅卷组织入口/会话 hub 考试门禁 + UiButton 重复 size 清扫（2026-07-17）

### 本段已改码

| 域 | 路径 | 说明 |
|----|------|------|
| 门禁 | `marking-org-entry.vue` | 未选考试 `ExamSelectGateStrip`；无考试隐藏「创建」primary |
| 门禁 | `marking-org-session-hub.vue` | 未选考试钉条；空组织 Empty size=sm |
| CTA | `scan-live-monitor.vue` | 信号条动作 outline（避免与顶栏「查看异常」双 primary）；清理重复 size |
| hygiene | `absence-confirm` / `score-finalize` / `accreditation-cockpit` / `ai-four-assistants` / OCR·Eligibility·Outline 等 | 清扫 `UiButton` 重复 `size="sm"` 属性 |

### 验证

- `pnpm --dir edu-practice-mark-vue exec vue-tsc --noEmit` → **EXIT 0**（2026-07-17 §50）
- 产品路径 a-button/a-result/a-empty/a-alert = 0
- StageWorkbenchShell 教师/管理考试页 ExamSelectGateStrip 覆盖扫零（training-plan-workbench 用自有 B 钉条）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | 用户手审 |
| kiosk `notification` h(Button) | Ant API 宿主，保留 |
| 旧 #files 脚本 P0 表 | 索引非现网 |

### §50 续：归档复盘考试门禁（同段）

| 域 | 路径 | 说明 |
|----|------|------|
| 门禁 | `archive-volume-exam-progress.vue` | 无 `examId` 时 `ExamSelectGateStrip`；顶栏动作/信号仅有考试时展示 |

- 再跑 `vue-tsc --noEmit` → 见下条验证

### 验证（§50 含归档复盘）

- `pnpm --dir edu-practice-mark-vue exec vue-tsc --noEmit` → **EXIT 0**（2026-07-17 §50 终）

## 51. 多 primary 再收敛：导航降 outline + 年审 CTA 互斥（2026-07-17）

### 本段已改码

| 域 | 路径 | 说明 |
|----|------|------|
| CTA | `teacher-process-journal.vue` | 「打开关联档案」outline；「提交材料审核」保留 primary |
| CTA | `archive-volume-detail.vue` | 告警区「去某 Tab」导航 CTA 全 outline（4 处 setActiveTab） |
| CTA | `annual-review-scene.vue` | 存在未确认考核窗口时「生成年度报告」降 outline；空态紧凑 |
| 逻辑 | `hasPendingAnnualNotices` | 按 noticeStatus 判断待提交窗口 |

### 验证

- `pnpm --dir edu-practice-mark-vue exec vue-tsc --noEmit` → **EXIT 0**（2026-07-17 §51）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` | 用户手审 |
| kiosk 触控多 primary | 状态互斥/工位 md 保留 |
| 极低流量 admin 分节 primary | 不同 section 可接受 |

## 52. 完成度证据审计 + 职称条件模板 CTA + 看板结论同步（2026-07-17）

### 证据快照（代码侧）

| 指标 | 现网 |
|------|------|
| ExamSelectGateStrip 引用页 | 36 |
| QualityPlanGateStrip 引用页 | 13 |
| PortfolioTeacherPickGate 引用页 | 23 |
| usePortfolioProxyWriteGuard / confirmProxyWrite | 21 |
| a-button / a-result / a-empty / a-alert | 0 |
| Button.vue / Empty.vue | 唯一实现；Ui* re-export 4 行 |
| ScoreAnalyticsStatusFlow + Pipeline + SignalBand | finalize + publish 分责挂载 |
| AI 四助手 | UiSectionTabs 四 Tab + 单栏草稿 |

### 本段已改码

| 域 | 路径 | 说明 |
|----|------|------|
| CTA | `title-criteria-templates.vue` | 「查询」outline、「新建模板」唯一 primary |
| 看板 | `craft-board-hi-fi.html#review-confirm` | 结论草稿写入门禁/代理写/Ant 清退/三壳/四助手证据计数 |

### 验证

- `pnpm --dir edu-practice-mark-vue exec vue-tsc --noEmit` → **EXIT 0**（2026-07-17 §52）

### 仍后置（阻塞 goal complete）

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B 勾选 | **必须用户手审** |
| 旧 #files 脚本 P0 表 | 索引非现网，不阻塞投产 |
| kiosk notification h(Button) | Ant API 宿主保留 |

## 53. 清北 S2 清单状态列 + 看板 S1–S5 SHIP 对账（2026-07-17）

### 本段已改码

| 域 | 路径 | 说明 |
|----|------|------|
| S2 | `teacher-home.vue` | 六模块清单改为状态列 + 动作；状态来自 workbenchSummary/portrait；过程「记一课」outline，其余 ghost；唯一 primary 仍为「材料采集」 |
| 看板 | `craft-board-hi-fi.html#qingbei-gap` | S1/S2/S4–S5 徽章改 SHIP；落地顺序写现网真源 |
| 看板 | `#review-confirm` A/结论 | 增清北 S1–S5 审查行；结论草稿含 §53 |

### 证据（代码侧，续 §52）

| 指标 | 现网 |
|------|------|
| 清北 S1 | `teacher-masterpiece.vue` ①–⑥ 章 + PickGate |
| 清北 S2 | `teacher-home` moduleChecklist 状态列 |
| 清北 S3 | `teacher-process-journal` + PROCESS_SESSION |
| 清北 S4 | home/promotion 反堆砌文案 + 甄选钩子 |
| 清北 S5 | department-review / reviewer-browse「读整袋」 |
| 门禁/代理写/Ant 清退 | 同 §52 证据快照，本段无回退 |

### 验证

- `pnpm --dir edu-practice-mark-vue exec vue-tsc --noEmit` → **EXIT 0**（2026-07-17 §53）

### 仍后置（阻塞 goal complete）

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B 勾选 | **必须用户手审** |
| 旧 #files 脚本 P0 表 | 索引非现网，不阻塞投产 |
| kiosk 触控 md / 状态互斥 primary | 保留 |

## 54. 档案补门禁：gap/onboarding PickGate + 隐私禁代签 + 手审对账（2026-07-17）

### 本段已改码

| 域 | 路径 | 说明 |
|----|------|------|
| 门禁 | `teacher-gap.vue` | `PortfolioTeacherPickGate`；保存草稿 outline / 提交补采唯一 primary |
| 门禁 | `teacher-onboarding.vue` | 管理员未选教师钉条；隐藏旅程 rail 至选人后 |
| 边界 | `teacher-privacy-consent.vue` | 代办目标禁 grant/decline/withdraw；≤48px 钉条说明 |
| 看板 | `#hand-audit` / `#review-confirm` | ScopeHeader 与空态 REWORK → SHIP 对账 |

### 证据

| 指标 | 现网 |
|------|------|
| portfolio 教师办理页缺 PickGate | 仅隐私页刻意不走选人代签（本人边界） |
| 隐私代签 | 前端阻断 + 按钮隐藏 |
| vue-tsc | 见本段验证 |

### 验证

- `pnpm --dir edu-practice-mark-vue exec vue-tsc --noEmit` → **EXIT 0**（2026-07-17 §54）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | 用户手审 |
| 极低流量 admin CTA | 页级发现再改 |

## 55. 质量过程/间接评价补 QualityPlanGateStrip（2026-07-17）

### 本段已改码

| 域 | 路径 | 说明 |
|----|------|------|
| 门禁 | `process-evaluation.vue` | need-plan / need-confirm B 钉条；确认前不展示课程内容区 |
| 门禁 | `indirect-evaluation.vue` | 同上；内容包在 v-else |
| 续 §54 | gap/onboarding/privacy | 档案 PickGate + 隐私禁代签 |

### 验证

- `pnpm --dir edu-practice-mark-vue exec vue-tsc --noEmit` → **EXIT 0**（2026-07-17 §55）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | 用户手审 |
| external-pull 等配置型页是否强制 plan confirm | 按业务页级再定 |

## 56. 质量门禁 need-confirm 全链闭合 + 达成详情 CTA（2026-07-17）

### 本段已改码

| 域 | 路径 | 说明 |
|----|------|------|
| 门禁洞 | `dashboard.vue` | 未确认方案时不再展示 KPI/待办/图表（仅钉条） |
| 门禁 | `score-record.vue` / `score-batch.vue` | planGateMode need-plan + need-confirm |
| 门禁 | `improvement-workbench.vue` / `archive.vue` | 同上 |
| CTA | `achievement-detail.vue` | 流转态 ≤1 primary；重算在有流转时降 outline；空态文案 |

### 证据

| 指标 | 现网 |
|------|------|
| QualityPlanGateStrip 引用文件 | 15 |
| planGateMode 统一 need-confirm 页 | 8 |
| vue-tsc | EXIT 0 |

### 验证

- `pnpm --dir edu-practice-mark-vue exec vue-tsc --noEmit` → **EXIT 0**（2026-07-17 §56）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | 用户手审 |
| external-pull（无 qualityStore 方案依赖） | 配置型页，不强制 plan confirm |
| 认证 cockpit hasScope | 认证范围语义，非培养方案确认 |

## 57. 质量 need-confirm 二次全覆盖（矩阵/AI/审核/接入/认证）（2026-07-17）

### 本段已改码

| 域 | 路径 | 说明 |
|----|------|------|
| 门禁 | `quality-course-matrix.vue` | planGateMode need-plan + need-confirm |
| 门禁 | `ai-task.vue` | 同上 |
| 门禁 | `rationality-audit.vue` | 同上 |
| 门禁 | `quality-ingest-hub-layout.vue` | Hub 层统一门禁；子页未确认不挂载 |
| 门禁 | `accreditation-cockpit.vue` | planGateMode + workbenchReady；未确认禁 rail/signal/主区 |

### 证据

| 指标 | 现网 |
|------|------|
| QualityPlanGateStrip 文件 | 15 |
| planGateMode 文件 | 13 |
| vue-tsc | EXIT 0 |

### 验证

- `pnpm --dir edu-practice-mark-vue exec vue-tsc --noEmit` → **EXIT 0**（2026-07-17 §57）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | 用户手审 |
| external-pull 配置型页 | 无方案 store 依赖；经 ingest hub 门禁间接覆盖 |
| 页面穷举手审 P2 | 浏览器 |

## 58. 考试概览 densify：去同权卡片墙（2026-07-17）

### 本段已改码

| 域 | 路径 | 说明 |
|----|------|------|
| 概览 | `ExamWorkbenchOverviewDashboard.vue` | 去掉 analytics 同权卡；状态卡内嵌任务/一致性提示；无质量数据不渲染质量卡；侧栏仅非零办理统计；进度条与进度%去重 |
| 概览 | `marking-overview.vue` | SignalBand 去掉 tiles 墙；骨架 card-count 2；失败 Empty size=sm |
| 空态 | `exam-detail.vue` | 概览空态业务文案 + size=sm |

### 验证

- `pnpm --dir edu-practice-mark-vue exec vue-tsc --noEmit` → **EXIT 0**（2026-07-17 §58）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | 用户手审 |
| 旧 #files P1 脚本表 | 索引陈旧，以 #review-confirm / 台账为准 |

## 59. SignalBand 去 tiles 墙 + 给分器/个人资料 densify（2026-07-17）

### 本段已改码

| 域 | 路径 | 说明 |
|----|------|------|
| KPI | 全站 49 个业务页 | 移除 `SignalBand variant="tiles"`，回默认 panel，消除彩色 KPI 墙 |
| 给分 | `MarkingScorePanel.vue` | 主路径「确认给分并提交」唯一 primary；AI 采纳 outline；步长/满分提示；键盘提示强调下一未阅 |
| 资料 | `profile/index.vue` | 取消同权三卡；入口并入 ContextBar；信息+安全单栏 max-width |

### 验证

- `pnpm --dir edu-practice-mark-vue exec vue-tsc --noEmit` → **EXIT 0**（2026-07-17 §59）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | 用户手审 |
| ContextBar / Main / PortfolioLayoutContext / MarkChart 旧表 P1 | 多为壳/契约；页级问题再改 |

## 60. 壳组件 densify + MarkChart 空/失败态（2026-07-17）

### 本段已改码

| 域 | 路径 | 说明 |
|----|------|------|
| 布局 | `layout/components/Main.vue` | 主区底改为 `--ant-color-bg-layout`，白面留给 Surface/Card |
| 原语 | `ContextBar.vue` | workbench 标题 16px、下边距 densify；actions 调用方约束注释 |
| 挂载 | `PortfolioLayoutContext.vue` | 单行 Scope padding densify；禁扩 KPI 注释 |
| 图表 | `MarkChart.vue` | empty/error 紧凑 UiEmpty；caption 可访问摘要；loading 遮罩 token 化 |
| 色板 | `mark-echarts-options.ts` | primary 回落品牌 `#1677ff` |

### 验证

- `pnpm --dir edu-practice-mark-vue exec vue-tsc --noEmit` → **EXIT 0**（2026-07-17 §60）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | **用户手审**（阻塞 goal complete） |
| 调用方 ContextBar 超 1 主+2 次 | 页级发现再收敛 |

## 61. ContextBar 双 primary 收敛（制卷设计器）（2026-07-17）

### 本段已改码

| 域 | 路径 | 说明 |
|----|------|------|
| CTA | `views/teacher/exam-layout-designer.vue` | 旅程主 CTA（上传识别 / 进入校验预览）与「保存设计」并存时，保存降 `outline`；无旅程主 CTA 时保存为唯一 primary；「复核微调」降 `ghost`，顶栏满足 **1 主 + ≤2 次**（预览 outline + 保存） |
| 对账 | `archive-volume-remediation-detail.vue` | 双 primary 为状态互斥：`OPEN→开始处理` / `IN_PROGRESS→提交整改`，同时仅 1 个可见 → **OK 不改** |
| 对账 | `admin/marking-organization/index.vue` | 双 primary 为状态互斥：`!organization→新建组织` / `organization→进入详情` → **OK 不改** |

### 证据扫描（产品路径）

| 指标 | 现网 |
|------|------|
| ContextBar `#actions` 同时可见多 primary | **0**（仅 2 页状态互斥） |
| 产品 `<a-button` / `<a-empty` / `<a-result` / `<a-alert` | **0** |
| `SignalBand variant="tiles"` | **0** |
| Button/Empty 双实现 | 已 re-export 唯一真源（`Button.vue` / `Empty.vue`） |
| vue-tsc | EXIT 0 |

### 验证

- `pnpm --dir edu-practice-mark-vue exec vue-tsc --noEmit` → **EXIT 0**（2026-07-17 §61）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B 勾选 | **用户手审**（阻塞 goal complete） |
| 旧 `#files/#components` 脚本 REWORK 表 | 索引陈旧（含已删 UiSessionListPanel、已 SHIP ScopeHeader）；以 #review-confirm / 本台账为准 |

## 62. 品牌第二蓝清零 + ContextBar 过载分层（2026-07-17）

### 本段已改码

| 域 | 路径 | 说明 |
|----|------|------|
| 品牌 | `UiMetricCard` / `UiArrowTimeline` / `UiStateBlock` / `UiProgressBar` / `UiStatisticChartCard` | 第二蓝 `#2563eb/#3b82f6` → 品牌 `#1677ff`；浅蓝底 `#e6f4ff` |
| 品牌 | `mark-statistics-chart.ts` / `error-handler.ts` / `AuditTimelineDrawer.vue` | 图表 primary 与 AUTH 图标色对齐 `#1677ff` |
| 密度 | `UiStateBlock.vue` | 默认 min-height 120→88；compact/sm densify |
| 布局 | `CreatePageLayout.vue` | 底色改 `bg-layout`，白面留给业务 Surface |
| CTA | `org-admin.vue` | 1 主（新增）+ 2 次（校验/编辑）+ ghost 历史/删除 |
| CTA | `teacher-archive.vue` | 1 主（导出）+ 2 次（评分/填报）+ ghost 预览/纠错/刷新 |
| CTA | `archive-category-edit.vue` | 提交 primary + 草稿 outline + 返回/对比 ghost |
| CTA | `marking-organization/detail.vue` | 正评 primary + 编辑/试评 outline + 删除 ghost |

### 证据

| 指标 | 现网 |
|------|------|
| 产品路径 `#2563eb/#3b82f6/#1e40af` | **0** |
| ContextBar 同时可见多 primary（非互斥） | **0** |
| vue-tsc | EXIT 0 |

### 验证

- `pnpm --dir edu-practice-mark-vue exec vue-tsc --noEmit` → **EXIT 0**（2026-07-17 §62）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | **用户手审**（阻塞 goal complete） |
| 旧 `#components` 脚本 REWORK 表 | 索引陈旧；以 #hand-audit / #review-confirm / 台账为准 |

### §62 补记

| 域 | 路径 | 说明 |
|----|------|------|
| densify | `marking-overview.vue` | 空面板/洞察槽 min-height 收敛（360→240、240→120、260→180） |
| 看板 | `craft-board-hi-fi.html#components` | 16 条陈旧 REWORK（图表/壳/侧栏）改 SHIP 对账；现网 danger REWORK=0 |


## 63. 门禁钉条再压 + 成绩门禁去 KPI 卡（2026-07-17）

### 本段已改码

| 域 | 路径 | 说明 |
|----|------|------|
| 门禁 | `ExamSelectGateStrip` / `QualityPlanGateStrip` / `PortfolioTeacherPickGate` | margin densify；`max-height: 48px`；方案钉条文案单行省略并缩短 |
| densify | `ArchiveExamScoreGatePanel.vue` | 三格 22px KPI 卡 → 内联人数条（考生/已录入/缺失） |
| CTA | `review-batch-confirm.vue` | 批量确认唯一 primary；填入建议 outline；单题复核 ghost |
| densify | `scan-batch-detail-workbench.vue` | 预览空态 min-height 480→160，不占满舞台 |

### 证据

| 指标 | 现网 |
|------|------|
| a-button / a-empty / tiles / 第二蓝 | **0** |
| ContextBar 非互斥多 primary | **0** |
| vue-tsc | EXIT 0 |

### 验证

- `pnpm --dir edu-practice-mark-vue exec vue-tsc --noEmit` → **EXIT 0**（2026-07-17 §63）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | **用户手审**（阻塞 goal complete） |

## 64. Stat/Metric 默认 densify + #files 陈旧 P0 清零（2026-07-17）

### 本段已改码

| 域 | 路径 | 说明 |
|----|------|------|
| densify | `UiStatPanel.vue` | 默认 `compact: true`；列表 gap 12→8 |
| densify | `UiMetricCard.vue` | 默认 padding/图标 densify；compact 更紧 |
| densify | `major-group-portfolio` / `department-report` / `department-cockpit` | 显式 compact |
| densify | `PublishedExamInsightTable.vue` | 空表 min-height 220→120 |
| CTA | `teacher-home.vue` | 「更多」outline→ghost，顶栏仅材料采集 primary |
| 看板 | `craft-board-hi-fi.html#files` | 5 条陈旧 danger P0（Scope/侧栏/四助手/首页）→ SHIP；现网 danger P0=0 |

### 证据

| 指标 | 现网 |
|------|------|
| a-button / tiles / 第二蓝 / danger P0 | **0** |
| vue-tsc | EXIT 0 |

### 验证

- `pnpm --dir edu-practice-mark-vue exec vue-tsc --noEmit` → **EXIT 0**（2026-07-17 §64）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | **用户手审**（阻塞 goal complete） |

## 65. 空态文案域语义化 + Notice densify（2026-07-17）

### 本段已改码

| 域 | 路径 | 说明 |
|----|------|------|
| 空态 | `constants/empty-state.ts` | `EMPTY_DATA` →「暂无数据」 |
| 空态 | 质量/考试/学生/AI/导出/消息/图表 a11y 等多页 | 去除「当前没有可展示的内容」套话，改为任务域原因句 |
| densify | `WorkbenchNoticeBanner.vue` | min-height/padding 收紧至钉条密度 |
| densify | `score-record.vue` / `archive-volume-detail.vue` | 面板 min-height 320→200 |

### 证据

| 指标 | 现网 |
|------|------|
| 产品路径「当前没有可展示的内容」 | **0** |
| a-button / tiles / 第二蓝 / danger P0 | **0** |
| vue-tsc | EXIT 0 |

### 验证

- `pnpm --dir edu-practice-mark-vue exec vue-tsc --noEmit` → **EXIT 0**（2026-07-17 §65）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | **用户手审**（阻塞 goal complete） |

## 66. UiDialog/UiDrawer 壳 densify + 产品弹层全量收敛（2026-07-17）

### 本段已改码

| 域 | 路径 | 说明 |
|----|------|------|
| densify | `UiDrawer.vue` / `UiDialog.vue` | header/body/footer padding densify；标题 16px/600 |
| 迁移 | 档案袋全域 views + portfolio 组件 | 裸 `a-modal`/`a-drawer` → `UiDialog`/`UiDrawer` |
| 迁移 | 质量 / 阅卷 / 管理 / 消息 / 导出 / 学生申诉 / kiosk | 同上；`:footer="null"` → `hide-footer` |
| 保留 | `AjCaptcha/index.vue` | 验证码宿主保留 `a-modal`（第三方壳） |

### 证据

| 指标 | 现网 |
|------|------|
| 产品 `a-modal`（排除 AjCaptcha/ui-guide） | **0** |
| 产品 `a-drawer`（排除 ui-guide） | **0** |
| vue-tsc | EXIT 0 |

### 验证

- `pnpm --dir edu-practice-mark-vue exec vue-tsc --noEmit` → **EXIT 0**（2026-07-17 §66）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | **用户手审**（阻塞 goal complete） |

## 67. UiPagination 产品清零 + Card/Surface densify（2026-07-17）

### 本段已改码

| 域 | 路径 | 说明 |
|----|------|------|
| 分页 | `review-task-detail` / `review-workspace` / `ai-orchestration` / `achievement-detail` / `external-pull` | 裸 `a-pagination` → `UiPagination` |
| densify | `Card.vue` | header/body padding 收紧；compact 更紧 |
| densify | `WorkbenchSurfaceCard.vue` | head/toolbar/body 间距 densify |
| densify | `UiPageHeader.vue` | 标题 28→22；底边距收紧 |

### 证据

| 指标 | 现网 |
|------|------|
| 产品 `a-pagination`（排除 ui-guide Pagination 壳） | **0** |
| 产品 `a-modal`/`a-drawer`/`a-button`/tiles/第二蓝 | **0** |
| vue-tsc | EXIT 0 |

### 验证

- `pnpm --dir edu-practice-mark-vue exec vue-tsc --noEmit` → **EXIT 0**（2026-07-17 §67）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | **用户手审**（阻塞 goal complete） |

## 68. a-popconfirm→confirmAsync + 工作台壳 densify（2026-07-17）

### 本段已改码

| 域 | 路径 | 说明 |
|----|------|------|
| 确认 | `marking-organization/detail.vue` / `index.vue` | 删除组织：`a-popconfirm` → `confirmAsync` + `requestDeleteOrganization` |
| 确认 | `marking-quality-dashboard.vue` | 异常重处理：`confirmAsync` + `requestReprocess` |
| 确认 | `ExportTaskCenter.vue` | 删除导出任务：`confirmAsync` + `requestDeleteTask` |
| densify | `StageWorkbenchShell.vue` | 主区 gap space-5→space-4 |
| densify | `FilterBar.vue` | panel 内边距 densify |
| densify | `UiPanelHeader.vue` | 标题 18→16；底边距 densify |

### 证据

| 指标 | 现网 |
|------|------|
| 产品 `a-popconfirm` | **0** |
| 产品 `a-modal`/`a-drawer`/`a-pagination`/`a-button`/tiles/第二蓝 | **0** |
| vue-tsc | EXIT 0 |

### 验证

- `pnpm --dir edu-practice-mark-vue exec vue-tsc --noEmit` → **EXIT 0**（2026-07-17 §68）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | **用户手审**（阻塞 goal complete） |

## 69. 空态 densify + SignalBand 去 tiles（2026-07-17）

### 本段已改码

| 域 | 路径 | 说明 |
|----|------|------|
| 空态 densify | `AuditTimelineDrawer` / `MatrixWorkbench` / 阅卷组织 5 页 / `exam-detail` / `scan-batch-workbench` / `review-arbitration` / `audit-trail` / `score-detail` | 空态区 `padding: 48px 0` → `20px 0`；矩阵占位 `48×16` → `20×12` |
| 仪表盘 Empty | `OngoingExamCardGrid` / `PendingTodoFeed` | Empty `min-height` 200 → 120 |
| SignalBand | `SignalBand.vue` | **删除** `variant=tiles` 与 `__dot` 装饰；仅 `inline` / `panel`（默认 panel） |
| 命名 | `useMarkingOverviewSignals.ts` | 内部 `tiles` → `metricsList`，避免与禁 tiles 墙语义混淆 |

### 证据

| 指标 | 现网 |
|------|------|
| 产品 `variant="tiles"` 调用 | **0** |
| `SignalBand` API `tiles` | **0**（类型已删） |
| 空态 `padding: 48px 0`（上述工作台路径） | **0** |
| 产品 `a-modal`/`a-drawer`/`a-pagination`/`a-popconfirm`/`a-button`/第二蓝 | **0**（AjCaptcha 除外） |

### 验证

- `pnpm --dir edu-practice-mark-vue exec vue-tsc --noEmit` → **EXIT 0**（2026-07-17 §69）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | **用户手审**（阻塞 goal complete） |
| 产品路径大量 `a-select`/`a-input`/`a-spin` | 非本轮硬门禁；可继续 Ui* 收敛 |

## 70. UiMultiSelect 删除 + Scope UiSelect + Main layout 底（2026-07-17）

### 本段已改码

| 域 | 路径 | 说明 |
|----|------|------|
| 原语 | `UiMultiSelect.vue` | **物理删除**薄壳；`FilterBar` 多选内联 `UiSelect mode=multiple` |
| 档案 Scope | `PortfolioScopeHeader.vue` | 快速搜教师 `a-select` → `UiSelect` sm |
| 质量 Scope | `QualityScopeChrome.vue` | 学年/学期 → `UiSelect` sm |
| 名册 | `teacher-directory.vue` | 身份编辑 4 处 → `UiSelect` |
| 布局 | `Main.vue` | 滚动面 `bg-container` → `bg-layout`；padding 24→16 |
| d.ts | `components.d.ts` | 剥离 UiMultiSelect |
| 质量选择器 | `ProgramSelector` / `TrainingPlanSelector` / `CourseSelector` | 共享 Scope 选择器 → `UiSelect` sm + option 槽 |
| 档案页 | `alert-center` / `national-achievement-admin` | 筛选与表单 a-select → UiSelect |

### 证据

| 指标 | 现网 |
|------|------|
| `UiMultiSelect.vue` 磁盘 | **无** |
| 产品 `a-modal/drawer/pagination/popconfirm/button` | **0** |
| vue-tsc | EXIT 0 |

### 验证

- `pnpm --dir edu-practice-mark-vue exec vue-tsc --noEmit` → **EXIT 0**（2026-07-17 §70）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | **用户手审**（阻塞 goal complete） |
| 产品路径仍大量 `a-select`/`a-input`/`a-spin` | 可继续按页收敛 Ui* |

## 71. 质量选择器全量 + 高流量 UiSelect 收敛（2026-07-17）

### 本段已改码

| 域 | 路径 | 说明 |
|----|------|------|
| 质量 selectors | `src/components/quality/selectors/*.vue`（21） | 全部 `a-select` → `UiSelect` sm；远程搜保留 allow-search + filter-option false |
| 阅卷组织 | `marking-organization/detail.vue` | 17 处 options 表单 → UiSelect |
| 档案集成 | `integration-dashboard.vue` | 11 处 → UiSelect |
| 档案 admin | `development-plan-admin` / `template-admin` / `indicator-platform-admin` | options 筛选/表单 → UiSelect |
| 归档检索 | `archive-volume-search.vue` | 7 处 → UiSelect |
| 质量拉取 | `external-pull.vue` | options 型收敛；`mode=tags` 保留 a-select（UiSelect 无 tags 合同） |
| 认证 | `Accreditation*Panel` | 静态枚举 option 子节点 → UiSelect options 字面量 |

### 证据

| 指标 | 现网 |
|------|------|
| quality selectors 产品 `a-select` | **0** |
| 产品 `a-select` 约 | **304**（较 §69 前 ~459 显著下降） |
| vue-tsc | EXIT 0 |

### 验证

- `pnpm --dir edu-practice-mark-vue exec vue-tsc --noEmit` → **EXIT 0**（2026-07-17 §71）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | **用户手审**（阻塞 goal complete） |
| 剩余 a-select | 复杂 v-for option 槽 / tags 模式 / 部分页内表单，继续按页收敛 |

## 72. 产品路径 a-select 清零（tags 例外）（2026-07-17）

### 本段已改码

| 域 | 说明 |
|----|------|
| 全站 options 型 | 124 文件、238 处 options-only `a-select` → `UiSelect` |
| v-for OPTIONS / 列表 | 缺考/认证材料/算法画像/培养方案/评分录入/上报/评价任务等 → `UiSelect` + map options |
| 静态枚举 | 认证 onsite checklist 等 → options 字面量 |
| 保留 | `external-pull.vue` `mode="tags"` **1** 处（UiSelect 无 tags 合同） |

### 证据

| 指标 | 现网 |
|------|------|
| 产品裸 `a-select`（排除 UiSelect.vue） | **1**（tags） |
| quality selectors `a-select` | **0** |
| vue-tsc | EXIT 0 |

### 验证

- `pnpm --dir edu-practice-mark-vue exec vue-tsc --noEmit` → **EXIT 0**（2026-07-17 §72）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | **用户手审**（阻塞 goal complete） |
| `a-input` / `a-spin` / `a-form` | 非本轮硬门禁；可继续 Ui* 收敛 |
| UiSelect 支持 `mode=tags` | 可选增强后清零最后 1 处 |

## 73. UiSelect 修复 + tags + 表单原语清零（2026-07-17）

### 本段已改码

| 域 | 说明 |
|----|------|
| 修复 | `UiSelect.vue` 自引用损坏回滚真源（`a-select` 宿主 + 无自 import） |
| UiSelect | `mode` 支持 `multiple \| tags`；`options` 可空（tags 录入） |
| external-pull | 最后 1 处 tags `a-select` → UiSelect；单值 → UiInput |
| a-input | 产品裸 a-input **0**（447+ 收敛；addon-before 改 densify 标签行） |
| a-textarea | 产品裸 a-textarea **0**（≈179 处 → UiTextarea） |
| 保留壳 | `SearchBox`/`PasswordInput`/`UiSelect`/`Textarea`/`UiDialog`/`UiDrawer`/`Pagination` 内 ant 宿主 |

### 证据

| 指标 | 现网 |
|------|------|
| 产品裸 `a-select`（排除 UiSelect.vue） | **0** |
| 产品裸 `a-input`（排除 SearchBox/PasswordInput） | **0** |
| 产品裸 `a-textarea`（排除 Textarea.vue） | **0** |
| vue-tsc | EXIT 0 |

### 验证

- `pnpm --dir edu-practice-mark-vue exec vue-tsc --noEmit` → **EXIT 0**（2026-07-17 §73）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | **用户手审**（阻塞 goal complete） |
| `a-spin` / `a-input-number` / `a-form` | 非本轮硬门禁；可继续 |

## 74. UiInputNumber + UiSpin 产品清零（2026-07-17）

### 本段已改码

| 域 | 说明 |
|----|------|
| 新增 | `UiInputNumber.vue`：a-input-number 宿主 + `--dp-*` 边框/聚焦/尺寸；支持 min/max/step/precision/stringMode/addon |
| 新增 | `UiSpin.vue`：a-spin 宿主 + 品牌点色/字号 densify；size sm/md/lg |
| 迁移 | 产品路径 `a-input-number` **161→0** |
| 迁移 | 产品路径 `a-spin` **97→0**（`AjCaptcha` 保留 ant 宿主） |
| d.ts | `components.d.ts` 已含 UiInputNumber / UiSpin |

### 证据

| 指标 | 现网 |
|------|------|
| 产品 `a-input-number`（排除 UiInputNumber 壳） | **0** |
| 产品 `a-spin`（排除 UiSpin 壳 / AjCaptcha） | **0** |
| 产品裸 `a-select` / `a-input` / `a-textarea` | **0**（§73） |
| vue-tsc | EXIT 0 |

### 验证

- `pnpm --dir edu-practice-mark-vue exec vue-tsc --noEmit` → **EXIT 0**（2026-07-17 §74）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | **用户手审**（阻塞 goal complete） |
| `a-form` / `a-space` | 可继续 UiForm densify；非本轮硬门禁 |

## 75. UiForm 根壳清零 + a-space densify（2026-07-17）

### 本段已改码

| 域 | 说明 |
|----|------|
| UiForm | `ref` 透传 `validate/resetFields/clearValidate/...`；默认 gap **12** densify；bordered padding 16 |
| 迁移 | 产品路径 `a-form` 根壳 **179→0**（`a-form-item` 保留于 UiForm 宿主内，同 Select 模式） |
| 间距 | 全局 `.dp-space` 工具类；`a-space` **60→0** |
| 修复 | `ai-model-profile` 错误转换回滚手修 |

### 证据

| 指标 | 现网 |
|------|------|
| 产品裸 `a-form` 根（排除 UiForm 壳） | **0** |
| 产品 `a-space` | **0** |
| `a-form-item` | 保留（表单项宿主） |
| vue-tsc | EXIT 0 |

### 验证

- `pnpm --dir edu-practice-mark-vue exec vue-tsc --noEmit` → **EXIT 0**（2026-07-17 §75）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | **用户手审**（阻塞 goal complete） |
| `a-form-item` → UiFormField 语义表单项 | 可选；需逐页校验合同，非本轮硬门禁 |

## 76. 表单项 / 勾选 / 日期 / 单选清零（2026-07-17）

### 本段已改码

| 域 | 说明 |
|----|------|
| 真源修复 | 恢复 `UiCheckbox` 宿主为 `a-checkbox`（禁止自引用）；`UiButton`/`UiEmpty` re-export 改 `export default` |
| UiFormItem | 产品 `a-form-item` → UiFormItem densify |
| Checkbox | 产品 `a-checkbox-group` → UiCheckboxGroup；standalone UiCheckbox 已先行 |
| Date | `YearPicker`（年度考核）；`UiDatePicker` string + value-format（归档截止）；去掉 Dayjs 桥 |
| Radio | 产品 `a-radio*` → UiRadioGroup/UiRadio（分段 densify）约 18 文件 |
| 合同 | UiDialog `width: number\|string`；UiForm `model: object`；UiDataTable/UiSelect size 别名；UiInputNumber null 桥；Select change 归一化 UiOptionValue |
| Selectors | 修复 7 处 `SelectValue` 非法 import 破坏；Audit* 补 `UiOptionValue`；ClassSelector 选项过滤 |

### 证据

| 指标 | 现网 |
|------|------|
| 产品裸 `a-form-item` / `a-checkbox*` / `a-date-picker` / `a-radio*`（排除 ui-guide 宿主） | **0** |
| `pnpm typecheck`（`tsconfig.app.json`） | **EXIT 0** |

### 验证

- `pnpm --dir edu-practice-mark-vue typecheck` → **EXIT 0**（2026-07-17 §76）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | **用户手审**（阻塞 goal complete） |
| `a-row`/`a-col`/`a-descriptions`/`a-table` 残余 | 布局壳/表格，非本轮硬门禁；优先已有 UiDataTable |
| `a-upload` 等专业宿主 | 可后续 densify，非硬门禁 |

## 77. Tooltip / Password / RangePicker + Spin 闭合修复（2026-07-17）

### 本段已改码

| 域 | 说明 |
|----|------|
| Password | 产品 `a-input-password` → `PasswordInput`（改密 / OCR / AI 模型 / external-pull 等） |
| RangePicker | 新增 `ui-guide/ui/RangePicker.vue`；产品 `a-range-picker` → `UiRangePicker`（Export/ScanOps/absence/BasicSettings/batch/exam-list/IndirectTask） |
| Tooltip | 产品 `a-tooltip` → `UiTooltip`（含 MarkingTaskToolbar / LayoutEntryGateway×4 / exam-export / exam-prep / report / teaching-affairs-sync×2 与半完成文件 import 核对） |
| 表格 tip | 失败文案 `popup-mount="body"`，避免单元格裁剪 |
| Spin 闭合 | **57** 文件 `UiSpin…</a-spin>` 双写错配 → `</UiSpin>`；宿主 `UiSpin.vue` 仍用 `a-spin` |
| Select 闭合 | `MarkExamSelect` `</a-select>` → `</UiSelect>` |

### 证据

| 指标 | 现网 |
|------|------|
| 产品裸 `a-tooltip` / `a-input-password` / `a-range-picker` | **0**（仅 ui-guide 宿主） |
| 产品 `</a-spin>` 闭合错配 | **0** |
| `MarkExamSelect` 标签配对 | **UiSelect 开闭一致** |
| `pnpm typecheck` | **EXIT 0** |

### 验证

- `pnpm --dir edu-practice-mark-vue typecheck` → **EXIT 0**（2026-07-17 §77）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | **用户手审**（阻塞 goal complete） |
| `a-skeleton` / `a-progress` / `a-segmented` / `a-timeline` / `a-input-search` | 可选 densify；合同非 1:1 |
| `a-row`/`a-col`/`a-descriptions` 布局壳 | 非硬门禁 |

## 78. Progress / Skeleton 产品路径清零（2026-07-17）

### 本段已改码

| 域 | 说明 |
|----|------|
| Progress | 产品 `a-progress` → `UiProgressBar`（Export/BatchScore/review/教务/发布/会话进度/认证覆盖） |
| 状态映射 | ant status active/exception/success → `color` #1677ff/#ff4d4f/#52c41a |
| Skeleton | 产品 `a-skeleton*` → `UiSkeletonState` compact + rows（含 kiosk SetupStage CTA） |
| Chrome | ExamWorkspaceChrome / ExamJourneySidebarNav 骨架 densify |

### 证据

| 指标 | 现网 |
|------|------|
| 产品 `<a-progress` | **0** |
| 产品 `<a-skeleton*` | **0** |
| `pnpm typecheck` | **EXIT 0** |

### 验证

- `pnpm --dir edu-practice-mark-vue typecheck` → **EXIT 0**（2026-07-17 §78）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | **用户手审**（阻塞 goal complete） |
| `a-segmented` / `a-timeline` / `a-input-search` | 可选 densify |
| `a-row`/`a-col`/`a-descriptions` 布局壳 | 非硬门禁 |

## 79. Segmented / Search / Timeline 清零（2026-07-17）

### 本段已改码

| 域 | 说明 |
|----|------|
| 宿主 | 新增 `UiSegmented` · `UiTimeline` · `UiTimelineItem` densify 真源 |
| Segmented | 产品 4 处 a-segmented → UiSegmented（档案工作壳 / 考生范围 / 间接评价 / 阅卷影像） |
| Search | 产品 5 处 a-input-search → UiSearchBox |
| Timeline | 产品 6 处 a-timeline* → UiTimeline / UiTimelineItem |
| 类型 | Segmented size 仅 small|large（md 默认不传） |

### 证据

| 指标 | 现网 |
|------|------|
| 产品 `a-segmented` / `a-input-search` / `a-timeline*` | **0** |
| `pnpm typecheck` | **EXIT 0** |

### 验证

- `pnpm --dir edu-practice-mark-vue typecheck` → **EXIT 0**（2026-07-17 §79）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | **用户手审**（阻塞 goal complete） |
| `a-row`/`a-col`/`a-descriptions`/`a-divider` 布局壳 | 量大、非硬门禁；后续 densify 布局原语 |
| `a-steps` / `a-collapse` / `a-tree` 等专业壳 | 可选 |

## 80. 布局壳 densify 清零（2026-07-17）

### 本段已改码

| 域 | 说明 |
|----|------|
| 宿主 | 新增 `UiRow` · `UiCol` · `UiDescriptions` · `UiDescriptionsItem` · `UiDivider` · `UiSteps` · `UiStep` · `UiCollapse` · `UiCollapsePanel` |
| 迁移 | 产品路径 68 文件：栅格/描述列表/分隔线/步骤条/折叠 |
| densify | UiRow 默认 dense gutter=12；Descriptions 默认 size=sm；Steps compact |

### 证据

| 指标 | 现网 |
|------|------|
| 产品 `a-row` / `a-col` | **0**（UiRow×154 · UiCol×376） |
| 产品 `a-descriptions*` / `a-divider` / `a-steps*` / `a-collapse*` | **0** |
| `pnpm typecheck` | **EXIT 0** |

### 验证

- `pnpm --dir edu-practice-mark-vue typecheck` → **EXIT 0**（2026-07-17 §80）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | **用户手审**（阻塞 goal complete） |
| `a-list*` / `a-tree` / `a-menu*` / typography | 导航与列表壳；可选 densify |
| 业务页 densify 手审 | 看板远景 A/B 确认后定稿 |

## 81. 产品路径裸 a-* 清零（2026-07-17）

### 本段已改码

| 域 | 说明 |
|----|------|
| List | `UiList` · `UiListItem` · `UiListItemMeta` |
| Typography | `UiTypographyText` · `UiTypographyParagraph` · `UiTypographyLink` |
| Tree | `UiTree` · `UiTreeSelect` |
| Shell | `UiMenu*` · `UiSubMenu` · `UiLayout*` · `UiDropdown` · `UiPopover` · `UiUpload` · `UiWatermark` · `UiConfigProvider` |
| 其他 | `UiFlex` · `UiBreadcrumb*` · `UiCountBadge` · `UiAvatar` · `UiTableSummary*` |
| 迁移 | 产品路径全部业务/布局 vue → Ui*；**仅** `AjCaptcha` 保留 a-modal/a-spin 例外 |

### 证据

| 指标 | 现网 |
|------|------|
| 产品路径 `<a-*`（排除 ui-guide / AjCaptcha） | **0** |
| `pnpm typecheck` | **EXIT 0** |

### 验证

- `pnpm --dir edu-practice-mark-vue typecheck` → **EXIT 0**（2026-07-17 §81）

## 82. 产品路径 Modal.* → confirmAsync（2026-07-17）

### 本段已改码

| 域 | 说明 |
|----|------|
| 路由 | `router/index.ts` chunk 过期刷新：`Modal.confirm` → `confirmAsync`；取消后重置 `chunkReloadPrompted` |
| 阅卷 | `useMarkingSubmit` 多切片冲突 → 前往扫描监控 |
| 质量 | `report` 导出失败（hideCancel）；`process-evaluation` 已确认导入门禁 |
| 归档 | `archive-volume-search` 删除检索方案 |
| 认证 | `change-password` 成功后强制重新登录 |
| 建考 | `CandidateScopeStep` 切换纳入方式清空草稿 |
| 经验 | `grading-experience-hub` 废弃案例 |
| 申诉更正 | `BatchCorrectionPlansCard` 提交/审批/发布提示；`CorrectionsCard` 重发成绩 |
| 档案袋 | `development-plan-admin` 历史导入回滚；`dual-teacher-admin` 资格预览 |

### 证据

| 指标 | 现网 |
|------|------|
| 产品路径 `Modal.(confirm\|warning\|info\|success\|error)` | **0**（仅 useConfirmDialog / usePromptInputDialog 注释） |
| 真源 | `confirmAsync` + `GlobalConfirmDialog` / `UiConfirmDialog` |
| `okType: 'danger'` | 映射为 `type: 'error'`（confirmAsync 无 danger 字段） |

### 验证

- `pnpm --dir edu-practice-mark-vue typecheck` → 见本段结束后 exit 记录（§82c）

### 验证结果（§82 闭合）

- 首跑 §82c：`router.push` onOk 返回 `NavigationFailure` 导致 3 处 TS2322
- 修复：onOk 内 `void router.push(...)`（useMarkingSubmit / BatchCorrection / CorrectionsCard）
- `pnpm --dir edu-practice-mark-vue typecheck` → **EXIT 0**（2026-07-17 §82d）
- 附：`policy-library-admin` diff 行背景改 token（`--dp-green-50` / `--dp-red-50`）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | **用户手审**（阻塞 goal complete） |
| 业务页 densify 观感 | 看板远景 A/B 确认后定稿 |
| 页级硬编码色（如 `#fff2f0`） | 可选后续 densify |

## 83. 原语 token densify 闭环（2026-07-17）

### 本段已改码

| 域 | 说明 |
|----|------|
| UiSectionTabs | active-tab 色阶全量 `--dp-*` |
| UiSelect | multi tag 边/底 `--dp-blue-50/200` |
| UiStateBlock | 六态 icon 色与 densify 间距 token |
| UiStatisticChartCard | series 圆点 token |
| UiArrowTimeline | pending/running/completed 状态 token |
| Switch | 关闭态灰阶 token |
| Main | 滚动面 padding densify token；乱码注释修复 |
| PortfolioLayoutContext | 水平 padding densify；禁扩 KPI 注释保留 |
| policy-library-admin | diff 行背景 token（§82 附） |

### 证据

| 指标 | 现网 |
|------|------|
| §82 Modal.* 产品路径 | **0** |
| 核心原语硬编码 brand hex（本段触点） | 收敛到 `--dp-*` / fallback |
| `pnpm typecheck` §82d | **EXIT 0** |

### 验证

- `pnpm --dir edu-practice-mark-vue typecheck` → **EXIT 0**（§83d / §83e）

### P1 页 densify 续

| 文件 | 改动 |
|------|------|
| `MarkChart.vue` | 默认高 300→240；空态 padding densify |
| `profile/index.vue` | ContextBar 去「返回首页」；security-list 网格 densify；死样式清理 |
| `marking-overview.vue` | filter Select 缩进；signal skeleton card-count 1 |
| `UiAlertStrip.vue` | 默认/sm/dense/inline 间距 token |

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | **用户手审**（阻塞 goal complete） |
| 业务页 densify 观感 | 看板远景 A/B 确认后定稿 |
| #files 表 P1–P3 历史行 | 多数已与现网 densify 对齐；以 #review-confirm / 台账为准，不盲改 |

## 84. 原语残余 hex 清零 + Empty densify（2026-07-17）

### 本段已改码

| 域 | 说明 |
|----|------|
| UiArrowTimeline | 默认/warning/error 与 progress 全量 token |
| UiActivityTimeline | 轴/底边/间距 densify token |
| UiBatchActionBar | surface + densify padding |
| UiCheckbox / UiRadio / DatePicker / Button | inverse/surface token |
| UiTooltip / UiEllipsisText | 浮层 densify padding + inverse text |
| Empty | sm/md padding densify token |
| workbench SCSS | `#fff` 文案 → `--dp-text-inverse`（print 除外） |

### 证据

| 指标 | 现网 |
|------|------|
| ui-guide `background/color/fill/stroke: #hex` | **0**（白/品牌收敛 token） |
| Modal 产品路径 | **0** |
| typecheck | 见验证段 |

### 验证

- `pnpm --dir edu-practice-mark-vue typecheck` → **EXIT 0**（§84）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | **用户手审**（阻塞 goal complete） |
| 业务页 densify 观感 | 看板远景 A/B 确认后定稿 |

## 85. 指标原语 densify + Skeleton/DataTable（2026-07-17）

### 本段已改码

| 域 | 说明 |
|----|------|
| UiMetricCard | tone 色阶与 densify padding/gap 全量 token |
| UiStatPanel | list/strip gap densify token |
| UiSkeletonState | padding/gap densify；shimmer 灰阶 token |
| UiDataTable flat | toolbar/empty densify；sorter primary token |
| Tag | sm/lg 水平 padding densify |
| DEAD 表 | 手审：`FilterPills/FormModal/StatItem/StatusBadge` 等多数 **磁盘已不存在**（历史 board 索引，非现网债） |

### 验证

- `pnpm --dir edu-practice-mark-vue typecheck` → **EXIT 0**（§85）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | **用户手审**（阻塞 goal complete） |
| 业务页 densify 观感 | 看板远景 A/B 确认后定稿 |
| #files DEAD 行 | 多数为已删文件索引；不盲改业务代码 |

## 86. 壳层 densify 全量 token（2026-07-17）

### 本段已改码

| 域 | 说明 |
|----|------|
| Card / UiDialog / UiDrawer | header/body/footer densify padding token |
| Pagination / UiPageHeader / UiPanelHeader | gap densify token |
| TaskResultPanel | 空态 32→20 densify；列表间距 token |
| ScoreAnalyticsStatusFlow / ExamSwitcher | gap densify |
| ArchiveVolumeSubSidebar | header/nav densify |

### 验证

- `pnpm --dir edu-practice-mark-vue typecheck` → **EXIT 0**（§86）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | **用户手审**（阻塞 goal complete） |
| 业务页 densify 观感 | 看板远景 A/B 确认后定稿 |

## 87. 表单/控件 densify 全量 token（2026-07-17）

### 本段已改码

| 域 | 说明 |
|----|------|
| UiForm | `--ui-form-gap` / bordered padding / inline gap → `--dp-space-*`；默认 gap 由 CSS token 承担 |
| UiFormSection | 区块 gap 16→12；divided 24→16；标题 15px densify |
| UiSegmented | 外框 padding 3→2；item padding-inline token |
| UiTableActions | 行操作 gap 12→8 token |
| UiProgressBar | 默认色/track 去硬编码 hex，CSS `--dp-blue-500` / `--dp-gray-200`；right 布局 gap densify |
| Input | wrap gap / 内边距 / affix / clear 间距 token |
| Textarea | sm/md/lg min-height 与 padding densify token |
| StageWorkbenchShell | 主 gap space-4→3；分区底边 token |

### 验证

- `pnpm --dir edu-practice-mark-vue typecheck` → **EXIT 0**（§87）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | **用户手审**（阻塞 goal complete） |
| 业务页 densify 观感 | 看板远景 A/B 确认后定稿 |
| 调用方显式 `#1677ff` 进度色 | 可选后续收敛 status→token（不阻塞） |

## 88. 原语 + 工作台 densify 续扫（2026-07-17）

### 本段已改码

| 域 | 说明 |
|----|------|
| UiConfirmDialog | gap 16→12；图标 40→36 densify |
| UiCheckboxGroup | 横/纵 gap token densify |
| UiDescriptionGrid | 项 padding/gap densify token |
| UiStatisticChartCard | 卡/侧栏/stat densify token |
| UiPopoverPanel | header/body/footer densify |
| UiDataTable | top/toolbar/pagination densify |
| UiArrowTimeline / UiActivityTimeline | metrics/groups/bordered densify |
| HeaderRightBar / AiTaskRunningBar | gap/padding + primary token |
| ExamSubSidebar / ExamPrepInfoPanels / TaskResultPanel / ArchiveVolume footer | 侧栏与面板 densify |
| PrepStepPipelineRow | head/track/step densify + brand token |

### 验证

- `pnpm --dir edu-practice-mark-vue typecheck` → **EXIT 0**（§88）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | **用户手审**（阻塞 goal complete） |
| 业务页 densify 观感 | 看板远景 A/B 确认后定稿 |
| DualDomain 菜单 indent 深度 | 层级语义保留，不机械压缩 |

## 89. 高流量页 + 共享壳 densify（2026-07-17）

### 本段已改码

| 域 | 说明 |
|----|------|
| QualityObeJourneyStrip | 条高/padding densify；surface token |
| ExportTaskCenter | 主 gap densify；空态图标 48→28 |
| FilePreviewDialog | body min-height 480→320；空态图标 densify |
| AuditTimelineDrawer / ScorePublishRelatedLinksCard | item/list densify |
| ApplyScoreToRemainingModal / GradingImmersionSection | 面板 densify |
| ScanDeviceCardGrid / ScanBatchPageRail | 空态 densify |
| LedgerSummaryCard / MatrixWorkbench | hero/header densify |
| score-finalize / quality/dashboard / EvaluationWorkgroupPage | 业务面 densify |
| UiPlatformExcelImportModal / LayoutEntryGateway / LayoutDesignReviewPhase | 导入与制卷 densify |
| score-record / achievement-detail / score-batch / student score | 质量·学生业务面 densify |
| profession/program profile | 面板 padding densify |
| AccreditationSupportPanel / SelfAssessmentReportPanel | 认证支持 densify；自评 min-height 420→280 |
| ClassStudentTreeSelectorDrawer | 树选择抽屉 gap densify |

### 验证

- `pnpm --dir edu-practice-mark-vue typecheck` → **EXIT 0**（§89）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | **用户手审**（阻塞 goal complete） |
| 低流量 auth/public 页 densify | 页级渐进 |
| DualDomain 菜单 indent | 层级语义保留 |












## 129. 代码侧 craft 终验 · 阻塞浏览器手审（2026-07-17）

| 项 | 内容 |
|----|------|
| 复验 | 硬门禁 ALL_GREEN（见 CRAFT_IMPLEMENTATION_AUDIT §129） |
| 看板 | §129 · OK **238** · TUNE **0** |
| 阻塞 | **用户**浏览器 `#review-confirm` A/B 勾选 |
| 说明 | 无用户手审时 agent 不得 complete goal；代码侧无可再闭合的 craft 硬债 |

## 128. 产品路径 rgba 扫尾清零（2026-07-17）

| 项 | 内容 |
|----|------|
| 范围 | exam-workspace overlay · scan-live paper shadow · ant modal overrides · create-form 底栏 · prototype text-shadow · ConfirmDialog icon 宽 |
| 边界 | login / survey / kiosk / AuthLayout / ui-tokens 字面量保留 |
| residual | 产品路径硬 rgba → **0** |
| 看板 | §128 · OK **238** · TUNE **0** |
| typecheck | **EXIT 0**（`/tmp/mark-vue-tsc-128`） |
| 阻塞 | 浏览器 `#review-confirm` 手审 |

## 127. Matrix/阴影/主色 rgba 收口（2026-07-17）

| 项 | 内容 |
|----|------|
| MatrixWorkbench | cell/tone 硬 rgba → `color-mix(... var(--dp-*) ...)` |
| 阴影 | 产品路径 `var(--dp-shadow-*, 0 … rgba)` → 纯 token（9 处） |
| 制卷 | LayoutBlockLayer / QuestionLedger / Canvas marquee 主色 token 化 |
| 认证 | AccreditationCyclePanel 边框 token |
| Button | icon-only md 宽 → `--dp-control-height-md` |
| 看板 | §127 · OK **238** · TUNE **0** |
| typecheck | **EXIT 0**（`/tmp/mark-vue-tsc-127`） |
| 阻塞 | 浏览器 `#review-confirm` 手审 |

## 126. 全局 SCSS hex fallback 清零（2026-07-17）

| 项 | 内容 |
|----|------|
| 触发 | 产品全局 SCSS 仍有 `var(--dp-*, #hex)` 双写 |
| 范围 | create-form-page · grading-shell · exam-workspace · analysis-center · workbench-surface · prototype-workbench · 26 处 |
| 边界 | `ui-tokens.scss` ant 桥 rgba/# 字面量保留 |
| 看板 | §126 · OK **238** · TUNE **0** |
| 阻塞 | 浏览器 `#review-confirm` 手审 |

## 125. 旧表脚本 TUNE 全量对齐 + UiEmpty 扫尾（2026-07-17）

| 项 | 内容 |
|----|------|
| 触发 | #components 仍有 ~65 条脚本 TUNE（假阳性），干扰审查 |
| 动作 | componentTable 内 data-level/status TUNE→OK；硬编码色文案标 §123–§124 已闭合 |
| 代码 | `teacher-lifecycle-admin` UiEmpty 补 `size="sm"` |
| 边界 | 真源仍是 #hand-audit / #review-confirm / 本台账；旧表仅路径索引 |
| 看板 | §125 · OK **238** · TUNE **0** |
| typecheck | **EXIT 0**（`/tmp/mark-vue-tsc-125`） |
| 阻塞 | 浏览器 `#review-confirm` 手审 |

## 124. 代码侧硬门禁全绿复验（2026-07-17）

| 项 | 内容 |
|----|------|
| 触发 | §123 后统计 TUNE 2 多为文档假阳性；需源码不变量复验 |
| 复验 | CRAFT_IMPLEMENTATION_AUDIT §12 · 20 项全绿 |
| 看板对齐 | OK **238** · TUNE **0**；UiDataTable/Tag/ContextBar/Surface/SignalBand 旧表 TUNE 翻 OK |
| typecheck | **EXIT 0**（`/tmp/mark-vue-tsc-124`） |
| 阻塞 | **仅**浏览器 `#review-confirm` A/B 手审 |
| 禁止 | 无手审时 `update_goal complete` |

## 123. Ui* 原语 rgba/阴影 token 化（2026-07-17）

| 项 | 内容 |
|----|------|
| 触发 | 旧表 UiDataTable「硬编码色」TUNE；ui-guide 多处硬 rgba 阴影 |
| 范围 | DataTable · Segmented · Radio · ActivityTimeline · AlertStrip · SectionTabs · ArrowTimeline · Switch/Select/Tooltip/Ellipsis/Dialog · MetricCard |
| 手法 | `--dp-shadow-*` / `color-mix(... var(--dp-*) ...)` |
| 看板 | §123 · OK **236** · TUNE **2** |
| typecheck | **EXIT 0**（`/tmp/mark-vue-tsc-123`） |
| 阻塞 | 浏览器 `#review-confirm` 手审 |

## 122. ContextBar 动作墙收口（2026-07-17）

| 项 | 内容 |
|----|------|
| 触发 | `achievement-detail` v-for 流转按钮墙；`scan-batch-detail` topActions 全量直出 |
| 规则 | 1 主 + ≤1 次 +「更多」；对齐 absence-confirm / archive 模式 |
| 文件 | `views/quality/achievement-detail.vue` · `views/teacher/scan-batch-detail-workbench.vue` |
| 看板 | §122 · OK **234** · TUNE **4** |
| typecheck | **EXIT 0**（`/tmp/mark-vue-tsc-122c`） |
| 阻塞 | 浏览器 `#review-confirm` 手审 |

## 121. ant rgba 文本色 → --dp-text-*（2026-07-17）

| 项 | 内容 |
|----|------|
| 触发 | 产品/质量组件仍写 `rgba(0,0,0,0.45/65/85)` ant 文本色 |
| 范围 | 20 文件 · 42+ 处 → `--dp-text-primary/secondary/tertiary/muted` |
| 边界 | `ui-tokens` ant 桥保持 rgba 字面量（禁循环引用） |
| 顺手 | accreditation-cockpit 空区 margin densify；task-pool primary-50 |
| 看板 | §121 · OK **232** · TUNE **6** |
| typecheck | **EXIT 0**（`/tmp/mark-vue-tsc-121`） |
| 阻塞 | 浏览器 `#review-confirm` 手审 |

## 120. hex fallback 清零 + control-height 真源（2026-07-17）

| 项 | 内容 |
|----|------|
| 触发 | 产品路径与 Ui* 大量 `var(--dp-*, #hex)` 双写；控件硬编码 36/32 |
| 范围 | 78 Vue · 251 处 hex fallback 剥离（AjCaptcha 除外） |
| 控件 | UiSelect / UiInputNumber / UiRadioGroup / UiConfirmDialog / AuthLayout / UiMetricCard / SearchBox / FilterBar / DropdownAction |
| 顺手 | ocr-settings `--color-text-2` → `--dp-text-secondary` |
| 看板 | §120 · OK **230** · TUNE **8** |
| typecheck | **EXIT 0**（`/tmp/mark-vue-tsc-120b`）；顺带修 lifecycle `variant=link` |
| 阻塞 | 浏览器 `#review-confirm` 手审 |

## 119. nybc token 清零 + FilterBar control token（2026-07-17）

| 项 | 内容 |
|----|------|
| 触发 | §118 后残余 craft：产品路径仍用历史 `--nybc-*` 色名；FilterBar 硬编码 36px |
| token | 12 文件 `--nybc-*` → `--dp-*`（text/border/primary/danger/bg-subtle） |
| 覆盖 | portfolio×7 · archive-volume 组件×5 · student/exam-history |
| FilterBar | 控件/按钮高度 → `var(--dp-control-height-md)`；按钮 padding densify 6×12 |
| 顺手 | `compliance-threshold-admin` `--color-text-secondary` → `--dp-text-secondary` |
| 看板 | §119 · OK **228** · TUNE **10** |
| typecheck | §118 基线 EXIT 0；本段 token-only 无 TS 面 |
| 阻塞 | 浏览器 `#review-confirm` 手审 |

| 边界（不改） | 原因 |
|--------------|------|
| login / survey / kiosk 触控与宽 padding | 刻意边界 |
| 学生成绩 36px KPI | 读分语义 |
| 成绩分析三壳 | 看板否决合并 |
| 旧 #components 脚本 TUNE | 假阳性文档债 |

## 118. 产品路径 space-5/6 全量 densify（2026-07-17）

### 本段已改码

| 范围 | 变更 |
|------|------|
| 48 个 views/components | 空态 `padding: space-5 0` → space-3；section margin/gap space-5/6 → space-3/4 |
| 典型页 | marking-overview / score-finalize / score-publish / exam-export / portfolio archive / quality 多页 |
| 边界 | login / survey-fill / scanner-kiosk **未压** |
| 看板 | §118 · OK 226 · TUNE 12 |

### 验证

- 产品路径（excl login/survey/kiosk）`--dp-space-5/6` → ≈0
- `vue-tsc` → 见命令

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` | **用户手审** |

## 117. 高流量壳 densify（SignalBand / DataTable / TaskResult）（2026-07-17）

### 本段已改码

| 文件 | 变更 |
|------|------|
| `SignalBand.vue` | gap 6→4 / compact 4→3；panel item padding densify；value 20→18 |
| `TaskResultPanel.vue` | 空态 padding 20→12 |
| `UiDataTable.vue` | flat 空态 padding 20→12 |
| `UiArrowTimeline.vue` | 横向 space-6→4 |
| 看板 | §117 · OK 224 · TUNE 14 |

### 验证

- `vue-tsc` → **EXIT 0**（`/tmp/mark-vue-tsc-117.exit`）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` | **用户手审** |

## 116. 全站 WorkbenchSurface 全局 densify 真源（2026-07-17）

### 本段已改码

| 文件 | 变更 |
|------|------|
| `styles/global/_prototype-workbench.scss` | Surface head/toolbar/body densify；嵌套 Surface 去双阴影；exam-status-card / flow-ctx densify |
| `styles/workbench/_workbench-surface.scss` | 与 prototype 对齐（同源合同） |
| `WorkbenchSurfaceCard.vue` | body padding 对齐全局 densify |
| 看板 | §116 · OK 222 · TUNE 16 |

### 验证

- 全局 Surface 松 padding（space-5 body）已压到 space-3/4
- `vue-tsc` → **EXIT 0**（`/tmp/mark-vue-tsc-116.exit`）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` | **用户手审** |

## 115. 代码不变量审计 + 嵌套 Surface densify（2026-07-17）

### 本段已改码

| 文件 | 变更 |
|------|------|
| `marking-quality-dashboard.vue` | 嵌套 inner Surface 去双阴影、压 head/body/toolbar padding |
| `archive-volume-remediation-detail.vue` | 嵌套 Surface densify |
| `SelfAssessmentReportPanel.vue` | layout min-height 160→120 |
| `cas-first-login-completion.vue` | 标题 22/800 → 20/700 |
| `CRAFT_IMPLEMENTATION_AUDIT_2026-07-17.md` | 17/17 硬不变量审计 |
| 看板 | §115 · OK 220 · TUNE 18 · **代码落地完成** |

### 验证

- craft 硬不变量扫描 → **17/17**
- `vue-tsc` → **EXIT 0**（`/tmp/mark-vue-tsc-115.exit`）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` | **用户手审（唯一阻塞 goal complete）** |

## 114. Taste 第二蓝清零 + 营销阴影 token 化（2026-07-17）

### 本段已改码

| 文件 | 变更 |
|------|------|
| `views/public/survey-fill-desktop.vue` | rgba(102,126,234) → 品牌 22,119,255 / focus-ring / --dp-shadow* |
| `views/public/survey-fill-mobile.vue` | 重阴影 → --dp-shadow-sm / focus-ring |
| `views/login/pwdExpired/index.vue` | `white` → `--dp-surface` |
| `OngoingExamCardGrid.vue` | padding densify；hover 阴影 token |
| `ArchiveVolumeNextStepsPanel.vue` | hover 阴影 token |
| `ApplyScoreToRemainingModal.vue` | 面板阴影 → --dp-shadow-md |
| `MarkingAiAssistDrawer.vue` | 紫高亮 → --dp-purple color-mix |
| `ExamSidebarExamSwitch.vue` / `ArchiveLifecyclePipeTrack.vue` | focus 环 token |
| `UiTooltip` / `UiSelect` / `UiEllipsisText` / `Switch` | 重阴影收口 |
| 看板 | §114 · OK 218 · TUNE 20 |

### 验证

- survey 路径 `102,126,234` / `667eea` → **0**
- `vue-tsc` → **EXIT 0**（`/tmp/mark-vue-tsc-114.exit`）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` | **用户手审** |
| 旧表 TUNE 20 | 假阳性/文档债 |

## 113. 原语全局 densify（2026-07-17）

### 本段已改码

| 文件 | 变更 |
|------|------|
| `UiStateBlock.vue` | 图标区 72/30 → 48/22；非 compact min-height 120→96 |
| `UiMetricCard.vue` | 默认 `compact: true`；value 24→20 / compact 22→18 |
| `UiStatisticChartCard.vue` | 统计 value 26/800 → 20/700 |
| `AuthLayout/index.vue` | 产品名 23→20；主区 padding 72/132 → 40/48（移动 32/40） |
| `ManualSupplementWizardDrawer.vue` | panel min-height 200→120 |
| `UiPlatformExcelImportModal.vue` | dropzone 图标 22→18 |
| 看板 | §113 · OK 215 · TUNE 23 · REWORK 0 |

### 验证

- `./node_modules/.bin/vue-tsc -p tsconfig.app.json --noEmit` → **EXIT 0**（`/tmp/mark-vue-tsc-113.exit`）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` | **用户手审** |
| 旧表 TUNE 23 假阳性 | 文档债 |

## 112. 残余 densify + REWORK 清零（2026-07-17）

### 本段已改码

| 文件 | 变更 |
|------|------|
| `views/login/index.vue` | `--login-bg` → `var(--dp-surface)`；品牌字 28/800 → 22/700 |
| `views/login/components/cas/index.vue` | 容器 min-height 180→120 |
| `views/auth/forgot-password.vue` | h2 24→20 |
| `views/portfolio/teacher-home.vue` | 完整度 KPI 28→22 |
| `views/teacher/scan-live-monitor.vue` | 面板 200→120；身份图空区 160→120 |
| `views/teacher/review-workspace.vue` | slice-viewer 220→140 |
| `views/teacher/print-package.vue` | preview-frame 200→140 |
| `views/error/components/ErrorPage.vue` | embedded 180→120 |
| `components/export/ExportTaskCenter.vue` | 空图标 28→20 |
| `components/FilePreviewDialog.vue` | 状态图标 28→20 |
| 看板 | §112 · OK 212 · TUNE 26 · **REWORK 0** |

### 未改（边界）

| 项 | 原因 |
|----|------|
| 学生成绩页 36px 分数 | 业务 KPI 读分语义，非空态浪费 |
| 公开问卷 survey-fill 大标题 | 公开填写页，非工作台 densify 主路径 |
| Kiosk 触控 min-height | 禁止压触控按钮 |

### 验证

- 产品路径 style raw hex（无 var 回退）≈ 0
- `./node_modules/.bin/vue-tsc -p tsconfig.app.json --noEmit` → **EXIT 0**（`/tmp/mark-vue-tsc-112.exit`，空日志）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | **用户手审**（阻塞 goal complete） |
| 旧 `#components` 脚本 TUNE 26 | 假阳性/文档债，不按脚本改码 |

## 111. 笔记本空态 densify + CreatePageLayout REWORK 闭合（2026-07-17）

### 本段已改码

| 文件 | 变更 |
|------|------|
| `views/teacher/marking-overview.vue` | 面板/空态 min-height 180→120、空区 120→88 |
| `components/mark/dashboard/PublishedExamInsightTable.vue` | 根/空态 min-height → 88 |
| `views/teacher/archive-volume/archive-volume-detail.vue` | panel-surface 200→120 |
| `views/teacher/scan-batch-detail-workbench.vue` | 空态预览 160→96 |
| `views/quality/score-record.vue` | 空区 160→96 |
| `components/quality/accreditation/SelfAssessmentReportPanel.vue` | 布局 min-height 220→160 |
| 看板 | `#review-confirm` §111；CreatePageLayout 薄壳 REWORK 闭合；OK 210 / TUNE 28 / REWORK 1 |

### 未改（边界）

| 项 | 原因 |
|----|------|
| Kiosk 触控 min-height | 禁止压触控按钮 |
| 制卷 canvas / 影像预览 | 内容舞台非空态浪费 |
| SignalBand tiles | 产品路径 0；kiosk paper-tiles 为选择格非 SignalBand |

### 验证

- 产品路径：UiEmpty 缺 size=0 · 裸 ant 表单 0 · a-alert/a-button 0 · Modal.confirm 0
- `./node_modules/.bin/vue-tsc -p tsconfig.app.json --noEmit` → **EXIT 0**（`/tmp/mark-vue-tsc-111b.exit`，空日志）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | **用户手审**（阻塞 goal complete） |
| 侧栏 IA 持续投影 | P1 SHIP，可继续手审 |
| 旧 `#components` 脚本 TUNE 假阳性瘦身 | 文档债 |

## 110. 手审 TUNE 对齐源码 + 看板统计刷新（2026-07-17）

### 本段改动（看板/台账，无业务 Vue 改码）

| 项 | 说明 |
|----|------|
| `#hand-audit` 高优先 8 条 | 源码核对后 **6 → OK**、**2 → GONE** |
| OK 提升 | UiPageHeader · ContextBar · MarkingScorePanel · PortfolioMaterialIntakePanel · UiBatchActionBar · QualityObeJourneyStrip |
| GONE | UiMessageThread · UiSidePanelCard（已在 COMPONENT_ZERO_REF_DELETED，随 Conversation/Inbox 链删除） |
| 统计口径 | 存活 252 · **OK 209** · **TUNE 29** · REWORK ≤2 · SHELL 6 · 已删 105 |
| `#review-confirm` | 增补 §99–110 已落地勾选项；`data-craft-progress` → §110 |
| 旧 `#components` | 标注「硬编码色」多为 `var(--dp-*, fallback)` **假阳性**；不按脚本表改码 |

### 源码核对要点（手读，非脚本模板）

| 组件 | 事实 |
|------|------|
| UiPageHeader | title 20px + `--dp-*`；独立办理页；非工作台顶栏 |
| ContextBar | 禁功能罗列 subtitle；§101–107 调用方 1 主+≤2 次+更多，actions wall≥4=0 |
| MarkingScorePanel | 下一未阅导航/文案；UiEmpty sm；AI 须填入/采纳 |
| PortfolioMaterialIntakePanel | 单表面 densify；无三层嵌套 Card；AI 不自动入库 |
| UiBatchActionBar | `--dp-surface`；selectedCount===0 隐藏 |
| QualityObeJourneyStrip | min-height 28；全 token；无 KPI% |
| MessageThread / SidePanelCard | 磁盘无文件；DELETED 登记 |

### 验证

- 看板手审区 `status warning">TUNE` → **0**
- 业务 Vue 本段 **0 改码**
- 浏览器 `#review-confirm` 手审 → **仍阻塞 goal complete**

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B 勾选 | **用户手审** |
| 全量 TUNE 29 残余（页级 / IA / CreatePageLayout 等） | 有真源缺口再改码 |
| 旧 `#components` 脚本表作废/瘦身 | 可选文档债 |

## 109. 档案域表单全量 Ui* 收口（2026-07-17）

### 本段已改码

| 域 | 说明 |
|----|------|
| 教师办理 | teacher-profile / course-archive / teaching-philosophy / materials / evaluation / annual-review → UiForm/Input/Select/DatePicker/Checkbox/Textarea/SearchBox |
| 院系办理 | department-review / department-objection / department-gap 表单与筛选项 Ui* 化 |
| 管理配置 | title-criteria-templates / title-promotion-admin / ethics-sanction-admin / compliance-threshold / school-evaluation 弹层与表格开关 Ui* 化 |
| token/文案 | ContextBar 去功能罗列 description；nybc/text 旧 token → `--dp-*`；ethics 日期改 string 合同对齐 RangePicker |
| 扫描结果 | `views/portfolio` 裸 ant 表单标签（Form/Input/Select/DatePicker/InputNumber/Checkbox/Radio/Textarea/Switch）→ **0** |

### 验证

- portfolio 裸 ant 表单标签 → **0**
- `pnpm --dir edu-practice-mark-vue exec vue-tsc -p tsconfig.app.json --noEmit` → **EXIT 0**

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | **用户手审**（阻塞 goal complete） |
| DualDomain 菜单 indent | 层级语义保留 |
| mark/quality 域残余裸 ant（若有） | 页级渐进 |

## 108. 档案表单 Ui* 收口 + 职称申报门禁 densify（2026-07-17）

### 本段已改码

| 域 | 说明 |
|----|------|
| promotion-scene | 裸 ant Select/Radio/Checkbox → UiSelect/UiRadioGroup/UiCheckbox/UiTextarea；ContextBar 去功能罗列 subtitle；未选任务 → WorkbenchContextGateStrip；提示 densify |
| teacher-honor | 弹层 Form/Input/DatePicker/TextArea → UiForm/UiFormItem/UiInput/UiDatePicker/UiTextarea |
| teacher-extension-activity | 同上 + UiInputNumber；分类弹层同步收口 |
| Message 抽屉 | 空态 padding 40 → densify token 间距 |
| teacher-directory | 附修：`fileNodeId` String 化；UiButton `type=primary` → `variant=primary`（解 typecheck） |

### 验证

- 上述三页产品表单裸 ant 控件标签 → **0**
- `pnpm --dir edu-practice-mark-vue exec vue-tsc -p tsconfig.app.json --noEmit` → **EXIT 0**

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | **用户手审**（阻塞 goal complete） |
| DualDomain 菜单 indent | 层级语义保留 |
| 其他低流量页裸 ant 表单 | 页级渐进 |

## 107. ContextBar 末两墙收敛 + Progress 收口复核（2026-07-17）

### 本段已改码

| 域 | 说明 |
|----|------|
| archive-volume-exam-progress | ContextBar：主 CTA「创建归档包」+ 次「重新打包」；「成绩发布/关考」入更多 |
| absence-confirm | ContextBar：主「核对并新建」+ 次「出勤核对」；派生补考/补齐计零入更多 |
| score-publish | bulk Progress `#ff4d4f/#52c41a` → `var(--dp-error|success)` |
| 扫描 | 全库 ContextBar actions/toolbar ≥4 按钮 wall → **0** |

### 验证

- ContextBar actions wall（≥4 UiButton 且无更多）→ **0**
- `pnpm --dir edu-practice-mark-vue exec vue-tsc -p tsconfig.app.json --noEmit` → **EXIT 0**

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | **用户手审**（阻塞 goal complete） |
| DualDomain 菜单 indent | 层级语义保留 |
| 低流量页 densify/TUNE | 页级渐进 |

## 106. Token 短名别名补全 + 进度条/原语色收口（2026-07-17）

### 本段已改码

| 域 | 说明 |
|----|------|
| ui-tokens.scss | 补 `--dp-primary*` 历史短名；补全高频缺失别名（`border-light` / `surface-sunken` / `font-mono|hint|body` / `radius-sm|md` / `color-warning|error|success` 等）；扫尾 amber/error-hover/space-gap；**产品路径 `var(--dp-*)` 未定义 → 0** |
| Progress 硬编码 | ExportTaskCenter / MarkingBatchScoreDrawer / teaching-affairs-sync / review-workspace 的 `#1677ff/#ff4d4f/#52c41a` → `var(--dp-color-primary|error|success)` |
| UiProgressBar | 默认 fill 走 `--dp-color-primary` |
| UiActivityTimeline | 纯 hex 边 → `--dp-border-subtle` |
| 制卷 densify | LayoutQuestionLedgerPanel 320→240；LayoutCanvas 520→440 |

### 验证

- 未定义 `--dp-*` 引用 → **0**
- `pnpm --dir edu-practice-mark-vue exec vue-tsc -p tsconfig.app.json --noEmit` → **EXIT 0**

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | **用户手审**（阻塞 goal complete） |
| DualDomain 菜单 indent | 层级语义保留 |
| 低流量 ContextBar 再瘦 | 页级渐进 |

## 105. 全量 ant-color → --dp-* 语义别名扫尾（2026-07-17）

### 本段已改码

| 域 | 说明 |
|----|------|
| ui-tokens.scss | 扩展语义别名：primary-bg/border、success/warning/error/info 族、text/fill/bg-container 等；桥接仍落在 token 真源 |
| 全局壳层 SCSS | `_button` / `_card` / `_ant-component-guards` / `_prototype-workbench` / `_overrides` / `editor` / `mixin` / `create-form-page` / workbench shell / analysis-center 等 ant→`--dp-*` |
| 布局/原语/业务页 | Header/MenuFold、UiAlertStrip、Empty、Workbench 壳、考试/档案/质量/登录/学生端等 **198 文件 / ~822 处** CSS 变量替换 |
| 残留清理 | `ant-padding`→`--dp-space-4`；control-item hover/active→fill；`ant-color-split`/`bg-elevated`/`font-family-code` 对齐 |
| 刻意保留 | `ui-tokens.scss` ant 桥；`AjCaptcha` 例外宿主（产品路径允许） |

### 验证

- 产品路径 `var(--ant-color|padding|control-item|font-family-code)`（排除 ui-tokens + AjCaptcha）→ **0**
- `pnpm --dir edu-practice-mark-vue exec vue-tsc -p tsconfig.app.json --noEmit` → **EXIT 0**

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | **用户手审**（阻塞 goal complete） |
| DualDomain 菜单 indent | 层级语义保留 |
| AjCaptcha 内 ant 色 | 例外宿主，不迁 |

## 104. 原语 token 清理 + PageHeader + 归档动作再收敛（2026-07-17）

### 本段已改码

| 域 | 说明 |
|----|------|
| archive-volume-detail | 驳回收材并入更多；ContextBar 级动作再瘦 |
| UiPageHeader | 仅独立办理页；title 20/700 densify + 禁工作台双标题注释 |
| ExportTaskCenter | ant-color 全量 → `--dp-*` |
| AuthLayout / Breadcrumb | primary/surface token 对齐 |
| ArchiveLifecyclePipeTrack / ScoreGate | white → `--dp-text-inverse` |
| UiPlatformExcelImportModal | surface/primary/success/error → `--dp-*` |
| craft-board | MessageThread/SidePanel 改为 HOLD（树内无源文件）；PageHeader 文案更新 |

### 验证

- `pnpm --dir edu-practice-mark-vue exec vue-tsc -p tsconfig.app.json --noEmit` → **EXIT 0**（§104）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | **用户手审**（阻塞 goal complete） |
| DualDomain 菜单 indent | 层级语义保留 |
| 低流量组件 ant-color 残留（GiCell/AiEditor 等） | 页级渐进 |

## 103. 阅卷给分下一未阅 + ScorePanel/材料采集 TUNE（2026-07-17）

### 本段已改码

| 域 | 说明 |
|----|------|
| useMarkingTaskNavigation | 新增 `nextUnreadTaskId` / `nextNavTaskId`；标签「下一未阅」 |
| useMarkingSubmit / keyboard / footer / toolbar | 提交与导航去向优先未阅（ALLOCATED/IN_PROGRESS） |
| MarkingScorePanel | CTA/快捷提示强化下一未阅；显式「AI 分不自动写入」；ant-color→`--dp-*` |
| PortfolioMaterialIntakePanel | 四层 UiCard 嵌套改为 section 面，减卡壳 |
| 附修 | evaluation-task-admin 冻结 Tag tone success/neutral → green/gray |

### 验证

- `pnpm --dir edu-practice-mark-vue exec vue-tsc -p tsconfig.app.json --noEmit` → **EXIT 0**（§103）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | **用户手审**（阻塞 goal complete） |
| DualDomain 菜单 indent | 层级语义保留 |
| UiPageHeader 工作台误用排查 | 页级渐进 |

## 102. ContextBar 动作墙第二波收敛（2026-07-17）

### 本段已改码

| 域 | 说明 |
|----|------|
| archive-volume-detail | 阶段主动作 + 自查/驳回；任务设置/检索/自检/导出入更多 |
| quality/archive | 补登台帐主 + 导出次；刷新/销毁清册入更多 |
| accreditation-cockpit | 新建周期主 + 专业/矩阵次；刷新入更多 |
| archive-category-edit | 提交主 + 草稿次；返回/版本对比入更多 |
| marking-org detail | 正评主 + 编辑/试评次；删除入更多 |
| exam-layout-designer | 阶段主/保存/预览；复核微调入更多 |

### 验证

- `pnpm --dir edu-practice-mark-vue exec vue-tsc -p tsconfig.app.json --noEmit` → **EXIT 0**（§102）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | **用户手审**（阻塞 goal complete） |
| MarkingScorePanel 下一未阅精调 | board TUNE |
| DualDomain 菜单 indent | 层级语义保留 |

## 101. ContextBar 动作收敛 + Batch 无选隐藏 + 原语 token（2026-07-17）

### 本段已改码

| 域 | 说明 |
|----|------|
| teacher-archive ContextBar | 7 钮 → 1 主（导出材料包）+2 次 + UiDropdownAction 更多 |
| org-admin ContextBar | 5 钮 → 1 主（新增）+2 次 + 更多（历史名称/删除） |
| teacher-home ContextBar | 去掉「更多/刷新」墙；1 主 +2 次；分组 ghost 列表常显 + 刷新入维护组 |
| UiBatchActionBar | `selectedCount===0` 自动隐藏（board：无选中不常驻） |
| UiList/Collapse/Radio/Segmented/Timeline/ActivityTimeline | `#fff` 硬编码 → `--dp-surface` / elevated |

### 验证

- `pnpm --dir edu-practice-mark-vue exec vue-tsc -p tsconfig.app.json --noEmit` → **EXIT 0**（§101）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | **用户手审**（阻塞 goal complete） |
| 其余 ContextBar ≥4 调用方（归档详情/quality archive 等） | 页级渐进 |
| MarkingScorePanel 下一未阅精调 | board TUNE |
| DualDomain 菜单 indent | 层级语义保留 |

## 100. 档案配置列表门禁钉条 + token 对齐（2026-07-17）

### 本段已改码

| 域 | 说明 |
|----|------|
| 档案计分规则 | 列表空 → B 钉条 CTA 新增规则 |
| 外部专家授权 | 表 empty → B 钉条 CTA 新建授权 |
| 职称申报任务 | 无任务 → B 钉条 CTA 新建任务 |
| 评价任务管理 | 无任务 → B 钉条 CTA 创建任务 |
| 发展规划 | 无规划 → hideCta 钉条（同页上方新建） |
| 上级报送 | 无任务 → B 钉条 CTA 新建报送 |
| 校级评价 | 无任务 → B 钉条 CTA 新建任务（修正原 Empty v-else） |
| 双高任务 | 表 empty → B 钉条 CTA 发布任务 |
| 外聘教师 | 无记录 → B 钉条 CTA 新增 |
| QualityObeJourneyStrip | ant-color → `--dp-surface/border/color-primary/success` |
| UiBatchActionBar | `background` 去掉 `#fff` fallback，仅 `--dp-surface` |
| PortfolioMaterialIntakePanel | space-4 → space-3 densify（减嵌套卡间距） |

### 验证

- `pnpm --dir edu-practice-mark-vue exec vue-tsc -p tsconfig.app.json --noEmit` → **EXIT 0**（§100）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | **用户手审**（阻塞 goal complete） |
| DualDomain 菜单 indent | 层级语义保留 |
| ContextBar 调用方动作墙 / MarkingScorePanel 精调 | board TUNE 页级渐进 |

## 99. 全量 UiEmpty densify + 高价值门禁钉条（2026-07-17）

### 本段已改码

| 域 | 说明 |
|----|------|
| 师德处分 | 列表空 → B 钉条 CTA 登记处分；复核记录真无数据 Empty size=sm |
| 阅卷质量看板 | 无进度快照 → B 钉条 CTA 立即快照；质量概览/维度/一致性 Empty size=sm |
| 租户阅卷策略 | 无权限 → hideCta warning 钉条；试评考试真无数据 Empty size=sm |
| 档案模板管理 | 无分类 → B 钉条 CTA 初始化默认模板 |
| 全量 densify | 产品路径全部 `<UiEmpty>` 显式 `size="sm"`（297/297，0 缺 size，0 重复 size） |
| 附修 | score-detail OCR 空态文案纠为「本题暂无 OCR 识别作答」 |

### 验证

- `pnpm --dir edu-practice-mark-vue exec vue-tsc -p tsconfig.app.json --noEmit` → **EXIT 0**（§99）
- UiEmpty 开标签 `size=` 计数：with=297 · without=0 · dup=0

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | **用户手审**（阻塞 goal complete） |
| DualDomain 菜单 indent | 层级语义保留 |
| 低流量列表「可创建」门禁是否再钉条化 | 页级按业务价值渐进 |

## 98. 质量配置列表门禁钉条 + 合规/外部拉取（2026-07-17）

### 本段已改码

| 域 | 说明 |
|----|------|
| 专业算法模板/实例 | 列表空 → B 钉条 CTA 新建 |
| 量表换算规则 | 列表空 → B 钉条 CTA 新建 |
| 结构合规阈值 | 无阈值 → 新建；无结果 → 重算全校 |
| 外部拉取任务 | 无任务 → 新建拔取任务 |
| densify | 合理性审核/改进工作台/量规空/教师首页 space-6→4 |

### 验证

- `pnpm --dir edu-practice-mark-vue typecheck` → **EXIT 0**（§98）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | **用户手审**（阻塞 goal complete） |
| DualDomain 菜单 indent | 层级语义保留 |

## 97. 配置门禁钉条 · 阅卷组织/OCR/AI/质量口径（2026-07-17）

### 本段已改码

| 域 | 说明 |
|----|------|
| 阅卷组织 entry/index | 未创建组织 → B 钉条；主考可 emit 创建，非主考 hideCta |
| 阅卷进度 dashboard | 组织未配置 → 钉条 CTA 前往阅卷设置 |
| OCR 设置 | 未配渠道 → hideCta 钉条（同页下方配置） |
| AI 模型档案 | 未启用文本模型 → 钉条 CTA 新建配置 |
| 认证标准 / 专业评价口径 | 列表空 → 钉条 CTA 新建 |
| 真无数据 Empty | 档案/归档/画像/合规/目录等 size=sm densify |

### 验证

- `pnpm --dir edu-practice-mark-vue typecheck` → **EXIT 0**（§97）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | **用户手审**（阻塞 goal complete） |
| DualDomain 菜单 indent | 层级语义保留 |

## 96. 权限/配置门禁钉条扩展（2026-07-17）

### 本段已改码

| 域 | 说明 |
|----|------|
| WorkbenchContextGateStrip | 支持 `hideCta`、无导航时 `emit(cta)` 页内动作 |
| 混扫复核 | 无院系职责 → 权限钉条 + 回归档列表 |
| 自查清单 | 未配置模板 → 钉条 CTA 打开归档设置 |
| 外部拉取 | 无数据源 → 钉条 CTA 新建数据源 |
| 集成看板 | 未选消息数据源 → hideCta 钉条；有源无数据紧凑 Empty |
| 真无数据 densify | 院审未进入 / 达成度明细 / 定标绑定 Empty size=sm |

### 验证

- `pnpm --dir edu-practice-mark-vue typecheck` → **EXIT 0**（§96）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | **用户手审**（阻塞 goal complete） |
| DualDomain 菜单 indent | 层级语义保留 |

## 95. 缺上下文门禁 B 钉条真源（2026-07-17）

### 本段已改码

| 域 | 说明 |
|----|------|
| WorkbenchContextGateStrip | 新增：Tag + 唯一 CTA ≤48px；工作台路由透传 examId，无 examId 回退 TeacherExamList |
| ExamSelectGateStrip | 委托 WorkbenchContextGateStrip，避免双实现 |
| 归档/复核/阅卷/达成度 | 缺 id/上下文大 Empty → B 钉条 + 返回列表 CTA |
| 阅卷组织 detail/session-hub | 未找到组织 / 未配置组织 → B 钉条 |

### 验证

- `pnpm --dir edu-practice-mark-vue typecheck` → **EXIT 0**（§95）
- 门禁禁止大 Empty 英雄区（缺上下文路径）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | **用户手审**（阻塞 goal complete） |
| DualDomain 菜单 indent | 层级语义保留 |

## 94. 空态 margin + Empty 原语 + 壳 densify 扫尾（2026-07-17）

### 本段已改码

| 域 | 说明 |
|----|------|
| Empty.vue | 默认 sm 再压：base/sm/md padding densify |
| WorkflowPrerequisiteEmpty | size md→sm |
| empty margin-top | 48/32/24 收敛 → 20/16（progress-dash / 质量多页 / appeal / AuthLayout / NoticePopup / 物理位置） |
| UiPageHeader | gap densify |
| Main.vue | 主滚动 padding 16→12 |
| LayoutQuestionLedgerPanel | min-height 420→320 |
| login / survey-mobile | brand/field densify |

### 验证

- `pnpm --dir edu-practice-mark-vue typecheck` → **EXIT 0**（§94）
- 产品路径 `padding: 60px 0` / `margin-top: 80|48|32` → **0**（survey 公开页除外适度）
- 产品路径裸 `a-*` 仅 AjCaptcha + ui-guide 宿主

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | **用户手审**（阻塞 goal complete） |
| DualDomain 菜单 indent | 层级语义保留 |

## 93. 创建表单壳 + 超管壳 + 残余页 densify（2026-07-17）

### 本段已改码

| 域 | 说明 |
|----|------|
| create-form-page.scss | header/body/footer/section/summary densify；form-section 40/32→24/20；mobile bottom 60→40 |
| super-admin.scss | sa-page/workspace/panel/side-card gap/padding/radius → --dp-space / radius-panel |
| global/_overrides.scss | drawer/popover/notification padding densify |
| global/_assign.scss | assign section/actions densify |
| candidate-roster / score-detail | gap 16→12 token |
| ScanBatchPageRail / FilePreview / SelfAssessment / print-package / ManualSupplement / WholePaperGallery | min-height densify |
| login brand / forgot-password / NoticePopup | gap/margin densify |
| survey-fill desktop+mobile | banner/status/cover densify（公开页适度收紧） |
| empty margin-top 80 | print-package / experience-hub / quality-dashboard / teaching-affairs-sync / exam-export-tasks → 20 |
| FilePreviewDialog audio | margin 220→32 |

### 验证

- `pnpm --dir edu-practice-mark-vue typecheck` → **EXIT 0**（§93）
- 产品路径 `padding: 60px 0` → **仍 0**

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | **用户手审**（阻塞 goal complete） |
| 极低流量 residual densify | 页级渐进 |
| DualDomain 菜单 indent | 层级语义保留 |

## 92. 空态 60→20 全清 + 复核/kiosk/消息 densify（2026-07-17）

### 本段已改码

| 域 | 说明 |
|----|------|
| empty 60px | score-finalize/publish、review-workspace、export-tasks、roster、experience-hub、archive-volume、image-ledger、exam-workspace 等 **0 残留** |
| empty 40px | review-batch-confirm / review-task-hub → 20 |
| review-workspace | 主 gap/队列条/切片区 densify；slice min-height 300→220 |
| kiosk | portfolio/archive session、dispatch landing/queue、exam pick/supplement min-height densify（不压触控按钮） |
| message / marking-task-pool / org-admin / analytics / ocr / print-package | 主间距 densify |
| AI analysis tabs + cards | gap/padding densify |
| appeal / ErrorPage / AiEditor / change-password / LayoutBlockLayer | densify |

### 验证

- `pnpm --dir edu-practice-mark-vue typecheck` → **EXIT 0**（§92，与 §93 同批确认）
- 产品路径 `padding: 60px 0` → **0**

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | **用户手审**（阻塞 goal complete） |
| 更低流量 residual densify | 页级渐进 |
| DualDomain 菜单 indent | 层级语义保留 |

## 91. scan-live + 阅卷组织/admin + 质量面板 densify（2026-07-17）

### 本段已改码

| 域 | 说明 |
|----|------|
| scan-live-monitor | 面板/空态/身份证据/批次行 densify；min-height 收敛 |
| marking-org-entry/index/detail | 面板/空态 densify |
| MarkingOrgGroupProgressList | meta gap densify |
| teaching-affairs-sync | 空态 60→20 |
| marking-quality-dashboard | charts densify |
| printer-management | 激活码弹层 densify |
| quality 业务面板 | achievement/archive/report/ai-task/external-pull/scale/ai-model/ai-mask/accreditation/pat/process-evaluation densify |
| ImportResponseDocumentModal | 上传区/处理态 densify |

### 验证

- `pnpm --dir edu-practice-mark-vue typecheck` → **EXIT 0**（§91）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | **用户手审**（阻塞 goal complete） |
| 更低流量页 residual densify | 页级渐进 |
| DualDomain 菜单 indent | 层级语义保留 |

## 90. auth/public + 教师/档案袋 densify（2026-07-17）

### 本段已改码

| 域 | 说明 |
|----|------|
| auth | forgot-password / change-password / cas-first-login densify |
| login | index 壳 + account/student/cas 表单 densify |
| public | portfolio-expert-review / survey-fill desktop+mobile densify |
| teacher | marking-overview / review-progress / statistics / task-detail densify；空态 60→20 |
| portfolio | teacher-profile / pk / template-admin / development-plan / dept-one-table / evaluation-fill / dual-teacher* / indicator / recommendation / external / portrait densify |

### 验证

- `pnpm --dir edu-practice-mark-vue typecheck` → **EXIT 0**（§90）
- 附修：`PortfolioEvaluationMaterialPreviewVO.taskStatus` → `PortfolioEvaluationTaskStatusCode`（解除 includes TS2345）

### 仍后置

| 项 | 状态 |
|----|------|
| 浏览器 `#review-confirm` A/B | **用户手审**（阻塞 goal complete） |
| 余量页 densify（scan-live / admin 等） | 页级渐进 |
| DualDomain 菜单 indent | 层级语义保留 |
