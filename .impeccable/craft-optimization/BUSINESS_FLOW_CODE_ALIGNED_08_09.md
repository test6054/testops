# 业务流 × 源码对齐 · 08 档案袋 / 09 带队

> 2026-07-16 · 用户要求：所有页面设计必须根据前后端逻辑与高校真实场景；禁止「域/工作壳」黑话。

## 1. 教学档案袋 · 教师本人（源码真源）

### 1.1 进入与门禁

| 步骤 | 实现 | 用户感知 |
|------|------|----------|
| 侧栏进入 | 路由前缀 `/portfolio`，菜单组 portfolio-teacher | 「教学档案袋」 |
| 模板就绪 | `portfolio-teacher-readiness` → `getTeacherReadiness` | 模板未发布则认识档案页阻断 |
| 隐私 | `portfolio-privacy-consent` | 须本人同意处理个人信息 |
| 认识档案 | onboarding `getState` 未完成 → `/teacher/onboarding` | 引导，可 dismiss |
| 首页 | `/portfolio/teacher/home` · `teacher-home.vue` | **我的工作台** |

### 1.2 教师首页要完成的事

| 能力 | API / 动作 | 路由 |
|------|------------|------|
| 完整度与摘要 | `workbenchSummary` | 首页 KPI/摘要 |
| 待办 | `portfolioTodoApi` | 行内「去办理」 |
| 画像摘要 | `portfolioAnalysisApi` portrait | 画像区 |
| 采集材料 | `goIntake` | `/teacher/intake` |
| 审核进度 | `goReviewStatus` | `/teacher/review-status` |
| 我的档案 | `goArchive` | `/teacher/archive` |
| 资料维护 | profile / philosophy / course-archive / honor / extension | 各 teacher/* 页 |
| 有期限场景 | 职称 / 双师 / 年审 | `/scene/*` |

**产品句：** 老师进入自己的工作台，看缺什么、办待办、维护材料与资料，再提交审核或用于考核场景。

### 1.3 「工作壳」是什么（工程，不是 UI 文案）

后端 `PortfolioWorkShellEnum`：

| code | 默认路由 | **产品应显示的白话** |
|------|----------|----------------------|
| TEACHER | `/portfolio/teacher/home` | 维护我的档案 |
| DEPARTMENT_REVIEW | `/portfolio/department/review` | 审核本院材料 |
| SCHOOL_GOVERNANCE | `/portfolio/school/cockpit` | 查看全校进度 |
| CONFIGURATION | `/portfolio/admin/configuration` | 系统配置 |

- 服务端 `getAccessScope` 决定 availableWorkShells / defaultRoute / 可选教师。  
- 前端 `PortfolioScopeHeader` 现文案：`工作台` + Segmented「教师办理」等 —— **属产品债**，远景改为白话；普通人仅 `UiTag`「当前教师：本人」。  
- **禁止**在 mock/产品 UI 写「域 / 工作壳 / TEACHER」。

### 1.4 管理员帮填

- `canPickTeachers`：租户管理员等可选教师（`usePortfolioTeacherAccess`）。  
- 范围条：选教师 + 代办标 + 回本人（远景）；写操作审计目标教师。  
- 页内禁止第二套选人 + 大卡说教。


### 1.5 入口 IA（2026-07-16 续 · 用户质疑）

完整合同见 **`PORTFOLIO_ENTRY_IA_08.md`**。摘要：

| 角色 | 主入口 | 禁 |
|------|--------|-----|
| 普通教师 | 侧栏 → **我的工作台**（锁本人） | 先选自己 |
| 租户管理员/超管 | **教师名册** → 行「进入工作台」+ 代办钉条 | 顶栏 Select 当唯一发现路径 |
| 院审 | 审核任务队列 | 顶栏切成「教师办理」逛袋 |
| 首建 | 模板就绪 → 隐私 → 认识档案 = **启用档案袋** | IDE 式 Create 空项目 |

现网名册：`teacher-directory.vue`（「档案袋教师名册」）已支持跳转 home/archive/intake + `teacherId`。


---

## 2. 本场带队 · 09（源码合同已齐 · 待用户确认）

### 2.1 用户口径

- 主考带领一部分教师完成扫描/阅卷任务。  
- 教师要知况（进度、我的任务、阻塞点）。  
- 超管 OCR/渠道配置不在考试工作台本幕。

### 2.2 合同真源

完整裁决见 **`TEAM_LEAD_CONTRACT_09.md`**（权限 · 扫描 · 阅卷 · 学情 · 验收勾选 §7）。

| 项 | 裁决 |
|----|------|
| 主考 | `exam.createUser`，`requireExamOwnerPermission` **无管理员豁免** |
| 扫描 | 共享 attention 队列，**无** assignee；CTA=处理/绑定/进批次/监控 |
| 阅卷 | 题组+教师+allocation 策略 → 任务池 claim；进度=题组 total/finalized |
| 工单 | ScanWorkOrder=设备入站，不是派人 |
| 看板 | `#scene-09` **已按合同重画**（否决区保留假派单作反例）· 待用户确认 |

### 2.3 代码锚点（合同已引用）

| 锚点 | 含义 |
|------|------|
| `ExamMarkPermissionService` | 主考写边界 / 读权限 |
| `MarkingOrganizationChiefExaminerMembershipRepairService` | 主考补入首个题组 |
| `AllocationPlanCalculator` | 切片 → reviewerUserId |
| `exam-scan-ops` / `scan-live-monitor` | 扫描运营与异常 |
| `marking-task-pool` | 教师领取/批阅 |
| `ExamSubSidebar` + 六程 | 本场旅程壳 |


---

## 3. 质量评价（与 08 隔离 · 菜单分页）

完整合同见 **`QUALITY_ENTRY_IA.md`**。

- **入口**：侧栏「质量评价」下**多条菜单** → 各路由主页面。**禁止**「换域 → 学期任务链 / 治理壳」。  
- **页内范围**：需要时挂 `QualityScopeChrome`；方案未确认用 B 钉条。  
- 无 teacherId；不与档案袋 Scope/workShell 文案混用。  
- 现网路由已是菜单分页；设计稿不得回退成单壳 StageRail。

---

## 4. 看板状态

| 幕 | 状态 |
|----|------|
| 08 | **A+B+C 全要 · 用户确认 SHIP**（本人 · 名册 · 首建）· 改码波次 B · 见 PORTFOLIO_ENTRY_IA_08 |
| 09 | **源码合同版** mock 已上板 · **待用户确认**（合同 §7） |
| layout 18 | `LAYOUT_TRI_SKILL_BATCH_28.md` 全表已出 · 待勾选 |
| 业务 Vue | 仍 0 改动；Scope 白话文案 / Empty→钉条 待批 |
