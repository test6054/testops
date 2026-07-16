# Taste Skills · mark-vue 前端审查

- **Date**: 2026-07-15
- **Target**: `edu-practice-mark-vue`（剔 `ui-guide` ≈589 Vue）
- **Skills used**（用户明确要求）:
  - `design-taste-frontend`（`.cursor/vendor/taste-skill/skills/taste-skill`）
  - `redesign-existing-projects`（同 vendor `redesign-skill`）
- **Hard-gate overlay（不可被 taste 覆盖）**: `frontend-design-mark`  
  浅色工作台 · 主色 `#1677ff` · `--dp-*` / `Ui*` / Stage shells · 禁 Tailwind 皮肤 · 禁营销 hero

---

## Design Read

> Reading this as: **高校阅卷 / 质量 / 档案袋多域 product workbench** for 主考与助教，with a **trust-first / regulated EduTech** language, leaning toward **existing nybc mark design system** (`StageWorkbenchShell` + Ant Design Vue 4 + `--dp-*`), **not** a SaaS landing / portfolio / Awwwards surface.

**Taste skill 自述边界**: `design-taste-frontend` 明确 *Not dashboards, not data tables, not multi-step product UI*。本次仅借用其 **anti-slop / redesign audit** 诊断轴，不套用 landing 默认三档拨盘。

| Dial (adapted) | Value | Why |
|----------------|------:|-----|
| DESIGN_VARIANCE | **3** | 工作台秩序优先，禁止艺术化打破栅格 |
| MOTION_INTENSITY | **2** | 仅 hover / 进度 transform；禁 cinematic |
| VISUAL_DENSITY | **8** | Cockpit / 表格 / 闸门为主 |

---

## Verdict

**Taste Anti-Slop：轻度通过（工作台语境）** — 没有紫渐变营销、三列 hero、Lorem、Inter 全站；品牌与壳层已产品化。  
**Redesign 诊断主问题：认知密度与状态层级** — 与此前 impeccable 27/40 同源；不是「不够花」，而是运营页仍偏告警堆叠 / 仪表盘并行。

**不得按 taste 默认处方改动的项**（会与 `frontend-design-mark` 冲突）:

| Taste 常见处方 | mark-vue 处置 |
|----------------|---------------|
| 换 Geist / Satoshi / 编辑衬线 | **拒绝** — 锁定系统中文栈（PingFang / Noto） |
| 加背景摄影 / 纹理 / 暗色段 | **拒绝** — 永久浅色工作台 |
| 拆掉左侧栏改顶栏 / command menu | **拒绝** — 三域侧栏是产品 IA |
| 扩 VISUAL_DENSITY↓ 到 gallery | **拒绝** — 阅卷需要高密度表格 |
| Tailwind 重写皮肤 | **拒绝** |

---

## Redesign Audit（按 skill 表 · 适配结论）

### Typography — 通过 / 轻改

| Check | Result |
|-------|--------|
| Inter everywhere | **Pass** — `--dp-font-family` 系统中文栈 |
| 字重阶梯 400/500/600 | **Pass** — token 已分层 |
| 表格数字 | **Pass** — 大量 `tabular-nums` |
| 大标题 presence | **N/A** — 产品壳用 ContextBar，非 marketing H1 |

### Color and Surfaces — 通过

| Check | Result |
|-------|--------|
| AI purple/blue gradient | **Pass** — 无紫渐变指纹；主色锁定 `#1677ff` |
| 多 accent 打架 | **基本 Pass** — 状态色走枚举 tone；kpi 用 SignalBand |
| Glass / flat sterile | **局部** — glass/backdrop **6**（login / kiosk preview）；工作台主体无 glassmorphism |

### Layout — 适应通过 · 认知峰值仍在

| Check | Result |
|-------|--------|
| 三列等卡 feature row | **Pass** — KPI 已 SignalBand 化；`repeat(3)` 命中 13 多为业务矩阵非营销卡 |
| nested / card 泛滥 | **中** — `UiCard`/`a-card` 命中 **122**；档案袋首页 / 部分运营页仍偏卡堆 |
| Dashboard sidebar | **有意保留** — DualDomainSideNav 三域 |

### Interactivity / States — 改善后仍有残

| Check | Result |
|-------|--------|
| layout property animation | **残 8** 文件仍有 `transition: width`（进度条族）；`exam-list`/`ScanningStage` 已改 `scaleX` |
| empty / error clarity | **改善** — 申诉空态已按 stats 分级；UiEmpty 默认「暂无数据」字面仍可能出现在未写 title 的空壳（taste Content 表：禁止空洞 empty） |
| z-index 999/9999 | **3** 处（`LayoutDefault` / `pwdExpired` / `GiPageLayout`）— 应收成语义 z 阶 |

### Content — 通过

| Check | Result |
|-------|--------|
| Lorem / Elevate / Unleash | **Pass** — 0 |
| Ops「暂无数据」掩盖风险 | **纪律要求已声明**；扫描仍见若干空态字面需抽样核是否为业务真空 |

### Component Patterns — 产品化通过

| Check | Result |
|-------|--------|
| 装饰卡 + 阴影 | **Pass** — heavy shadow 仅 kiosk BottomBar **1** |
| 圆角胶囊 | **34** 处 `999px/50%` — 多为 radio/LED/进度 pill；工作台可继续压到 `var(--dp-radius-*)` |
| raw a-table | **1**（业务侧，`MarkingOrgAssignmentTable` 摘要格） |

---

## Priority Issues（taste × 产品约束 · 仅可落地项）

### P1 — 运营页「卡堆 + 信号带」同屏 — **已落地（两首页）**
- `portfolio/teacher-home`：4×UiCard → ContextBar 主入口 + 单卡「档案状态」+ 待办主区；去掉嵌套 SignalBand
- `quality/accreditation-cockpit`：CEEAA 检查默认只看待完善，摘要 `已覆盖 x/n`；`UiCard` → `WorkbenchSurfaceCard`
- 其余归档治理卡堆未本轮扩改

### P1 — 圆角胶囊与系统不一致 — **已落地（产品路径）**
- 工作台 Vue / `_prototype-workbench` / `_grading-shell`：`999px` → `var(--dp-radius-full)`
- `ui-guide` 组件库 pill 仍可用字面 `999px`（设计 demo，未改）

### P2 — z-index 魔数 — **已落地**
- LayoutDefault / GiPageLayout / pwdExpired → `--dp-z-*`（sticky / fixed / modal+20）

### P2 — 进度条 width transition — **已落地（产品路径）**
- exam overview / StageRail 进度 / ExamSubSidebar / auth 强度条 / org roster / quality dashboard / review-arbitration 分数条 → `scaleX`
- 有意保留：`Asider` 侧栏折叠 `transition: width`；`MatrixWorkbench` 列宽；`ui-guide` Progress*；AjCaptcha 滑块

### P2 — 侧边色条（hook side-tab）— **已落地**
- `_prototype-workbench`：approval / submit-task / archive snippet → 全框边 + 浅 tint（对齐 OutlinePanel 模式）

### P2 — glass 表面局部 — **已落地**
- `ScanImageStage` / kiosk Scanning·Review 浮层 / `GiPageLayout` mask / survey 底栏：去掉 `backdrop-filter`
- 工具条与预览浮层改 `--scan-toolbar-bg`（实色 surface）/ `--kiosk-canvas-soft`
- `login` 保持 `backdrop-filter: none` + 实色面板

### Out of scope for taste fix
- 换字体、暗色、拆侧栏、营销 hero、GSAP scroll pin — **明确不做**

---

## Scorecard（taste-adapted · 2026-07-15 quieter 后）

| Axis | /5 | Note |
|------|----:|------|
| Anti-slop fingerprint | 5 | glass / 重阴影浮层已收敛 |
| System consistency | 5 | 产品路径胶囊 / z-index / 进度条已收 |
| Cognitive hierarchy | 4 | teacher-home / 认证驾驶舱已压卡堆 |
| Motion discipline | 5 | 产品进度条 scaleX；侧栏折叠除外 |
| Brand lock compliance | 5 | `#1677ff` 浅色未破 |

**Composite: 24/25** — quieter + distill + glass 闭合；余浏览器冒烟。

---

## Recommended next commands

1. 浏览器冒烟：teacher-home 入口、CEEAA 折叠、kiosk 画布工具条实色
2. **不要**对 mark-vue 跑 taste `craft` / landing 重设计

---

## Method notes

- 扫描：产品 Vue（剔 ui-guide）静态 anti-slop 指纹
- 对照：既有 impeccable 全量报告 + PRODUCT.md register=`product`
- 浏览器：SKIPPED
