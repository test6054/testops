# edu-practice-mark-vue 全量 Impeccable 分析报告

| 字段 | 值 |
|------|-----|
| 命令 | `/impeccable critique` + `/impeccable audit`（全量合并） |
| 目标 | `edu-practice-mark-vue`（阅卷中心 + 质量评价 + 教学档案袋） |
| 设计寄存器 | **product**（设计服务任务，非营销 brand） |
| 技能版本 | impeccable **3.9.1**（`pbakaus/impeccable`） |
| 分析日期 | 2026-07-14 |
| 方法 | PRODUCT.md / DESIGN.md + 源码抽样 + `detect.mjs --json src` + 静态模式扫描 |
| 浏览器实机 | **未执行**（本报告为代码态全量分析；实机 LCP/键盘路径未验证） |
| 实现驱动边界 | 本报告 **只评价不改造**；落地须遵循 `frontend-design-mark`，不得覆盖 `--dp-*` / `Ui*` / 工作台壳 / 品牌主色 `#1677ff` / 永久浅色 |

---

## 0. 产品与约束摘要（评价基线）

**产品定位**（PRODUCT.md）：

- 多租户高校阅卷 SaaS 前端，三域侧栏：`/teacher`（阅卷）、`/quality`（OBE/认证）、`/portfolio`（教学档案袋）。
- 气质：严谨、秩序、可追溯；证据链优先；禁止营销 hero / 深色监控屏 / 假空状态。

**硬锁定**（DESIGN.md + 用户记忆）：

- 品牌主色全站 `#1677ff`；永久浅色；禁止 B6/护眼暗色、全站 dark toggle。
- Token 真源：`src/styles/ui-tokens.scss`（`--ant-color-*` 语义色 + `--dp-*` 间距/圆角/色阶）。
- 工作台壳：`StageWorkbenchShell` + `ContextBar` + 可选 `SignalBand` / `StageRail`；基础控件优先 `components/ui-guide/ui` 的 `Ui*`。

**工程体量（静态）**：

| 指标 | 数量 |
|------|------|
| `.vue` 总计 | 632 |
| `views/` | 351 |
| `components/` | 262 |
| `Ui*` 组件（ui-guide） | ~62 |
| 路由域文件 | teacher / quality / portfolio / exam-workspace / student / kiosk… |
| portfolio 路由 path 数 | ~110 |
| quality 路由 path 数 | ~30 |
| teacher 顶层 path 数 | ~25 |
| detect 命中 | 19（全部 warning） |
| 源码 hex 字面量匹配 | ~570（含 token 定义文件） |
| `StageWorkbenchShell` 引用文件 | 203 |
| views 内使用 shell | 170 / 351 |
| `UiDataTable` 使用文件 | 190 |
| 直接 `<a-table` 文件 | 6 |

---

## 1. Critique · Design Health Score

### 1.1 Nielsen 可用性启发式（0–4，满分 40）

| # | Heuristic | Score | Key Issue |
|---|-----------|------:|-----------|
| 1 | Visibility of System Status | 3 | 考试工作台 / 扫描 kiosk 状态较清晰；跨域长任务（导入、AI、档案生成）反馈密度不均 |
| 2 | Match Between System and Real World | 3 | 中文阅卷业务词整体合格；quality/portfolio 仍有部分抽象术语门槛 |
| 3 | User Control and Freedom | 3 | 抽屉/确认框/批量条齐全；深树路由后退与上下文恢复不足 |
| 4 | Consistency and Standards | 2 | Ui* + shell 主路径强；hex 散落、kiosk 独立 token、部分页绕过 shell |
| 5 | Error Prevention | 3 | 危险操作有确认组件；未知枚举/合同缺字段是否被“暂无数据”掩盖需按页审计 |
| 6 | Recognition Rather Than Recall | 2 | portfolio ~110 路径、quality 矩阵/算法配置树，首访认知负担高 |
| 7 | Flexibility and Efficiency of Use | 3 | 表格批处理、ContextBar actions、考试六步旅程对高频用户友好 |
| 8 | Aesthetic and Minimalist Design | 3 | 浅色工作台克制；side-tab 强调条、登录渐变、分析中心装饰渐变有残留 |
| 9 | Help Users Recognize, Diagnose, Recover from Errors | 3 | `UiErrorBoundary`、失败态文案体系存在；影像/OCR 失败路径需更强“下一步” |
| 10 | Help and Documentation | 2 | quality 有 help 子树；阅卷主链多为内联文案，缺少情境式短帮助 |

**Design Health Score: 27 / 40**（诚实区间：多数真实工作台约 20–32）

**评级解读**：结构与设计系统已过“能用且有纪律”的门槛；主要扣分在 **一致性漏出** 与 **信息架构复杂度**（portfolio/quality），而非整体 AI 营销风。

### 1.2 Anti-Patterns Verdict（Critique）

| 结论 | 说明 |
|------|------|
| **AI Slop** | **轻度–中度局部**，非整站“模板仪表盘” |
| Detector | 19 hits：`side-tab`×10、`layout-transition`×9，无 error 级 |
| 与 DESIGN 冲突点 | 粗左边框强调、布局属性 transition、登录/分析页装饰渐变、kiosk glass blur |

**Verdict 一句话**：主体是 **可信的高校阅卷工作台**；局部仍有 detector 可识别的“AI 痕迹”与 token 漂移，但不是 purple-chrome 营销页。

### 1.3 Overall Impression

`edu-practice-mark-vue` 已具备产品级骨架：Token + `Ui*` + `StageWorkbenchShell` 三件套把教师阅卷主链压进了可预期的工作台语法。三域并行（阅卷 / 质量 / 档案袋）导致 **IA 表面积巨大**，新用户会先被导航树淹没，再被单页业务密度压垮。视觉上默认浅色 + `#1677ff` 锁定正确；真正要打的仗是 **收敛漏出的硬编码与旁路壳**，以及 **按角色压缩决策面**。

### 1.4 What's Working

1. **设计系统有真源**：`ui-tokens.scss` 明确 `--ant-color-primary: #1677ff`，`App.vue` 锁定 `defaultAlgorithm`、禁止 dark algorithm；与产品硬约束一致。  
2. **工作台语法已产品化**：`StageWorkbenchShell`（context / rail / signal / surface）在 200+ 文件复用；考试详情独立 layout + 子侧栏，符合“证据+阶段”模型。  
3. **控件收敛有效**：`UiDataTable` 覆盖远高于裸 `a-table`；`UiBatchActionBar` / `UiEmpty` / `UiConfirmDialog` 等为批处理与状态分层提供了标准件。  

### 1.5 Priority Issues（Critique）

#### [P1] What: 三域导航与 portfolio 路由树造成“记忆桥”过载

- **Why it matters**：校级教师/管理员在档案袋与质量评价中找不到“当前该处理什么”；Recognition 失败会拖垮主链效率。  
- **Fix**：按角色默认着陆页 + 每域 Top-5 任务入口；portfolio 二级菜单按任务状态分组（待采 / 待审 / 缺口 / 归档），折叠低频配置。  
- **Suggested command**：`/impeccable clarify` + `/impeccable distill`（仅评价后的实现走 `frontend-design-mark`）

#### [P1] What: Token 纪律在页面层泄漏（~570 hex；业务页 top 污染）

- **Why it matters**：破坏主题一致性，后续无法安全改色阶；与 DESIGN「禁止 hardcoded hex」冲突。  
- **Fix 优先文件**（业务层，非 token 定义本身）：  
  - `views/public/survey-fill-desktop.vue` / `survey-fill-mobile.vue`  
  - `views/scanner-kiosk/**`（另有独立 `tokens.css`）  
  - `components/ui-guide/ui/UiArrowTimeline.vue`、`UiAlertStrip.vue`  
  - `components/FilePreviewDialog.vue`、`utils/mark-echarts-options.ts`  
- **Suggested command**：`/impeccable colorize`（映射到 `--ant-color-*` / `--dp-*`）

#### [P1] What: 工作台壳覆盖不均（views 仅约 48% 使用 shell 引用统计口径）

- **Why it matters**：同角色不同页的状态区/动作区位置漂移，破坏 Consistency。  
- **Fix**：新建列表/详情模板强制 `StageWorkbenchShell`；存量按域分批补齐 ContextBar `#status`/`#actions`。  
- **Suggested command**：`/impeccable layout` / `/impeccable polish`

#### [P2] What: Detector 命中的 side-tab 与 layout-transition

- **Why it matters**：粗左边框是典型 AI 痕迹；`transition: width` 在侧栏/进度条上造成 layout thrash。  
- **Fix**：侧强调改为顶部分割或轻背景；宽度动画改 `transform` 或去掉。  
- **Suggested command**：`/impeccable quieter` + `/impeccable optimize`

#### [P2] What: 登录/分析中心仍有装饰渐变与 glass

- **Why it matters**：与“禁止营销 hero / 玻璃拟态”产品禁令摩擦。  
- **Fix**：登录背景降为克制色块；分析中心去掉无信息增益的 gradient header。  
- **Suggested command**：`/impeccable quieter`

#### [P3] What: `menuDark` 类名与分支仍残留

- **Why it matters**：永久浅色策略下，残留开关会误导后续开发者恢复暗色菜单。  
- **Fix**：删除 `app-menu-dark` 分支或冻结为永远 false 并清理样式。  
- **Suggested command**：`/impeccable harden`

### 1.6 Persona Red Flags

**林老师（校级阅卷组织者 · Power User）**

- 考试工作台六步 + 批量表格符合预期。  
- 红旗：从“考试列表”跳到“归档卷 / 档案袋 / 质量”时上下文丢失；需记忆多套菜单树。  
- 红旗：部分异常队列若把未知状态显示成空表，会误判“没问题”。

**陈助教（首访批阅员 · First-Timer）**

- 红旗：侧栏折叠后图标语义依赖记忆（Recognition）。  
- 红旗：OCR/身份绑定失败若只有错误码没有“下一步（重扫 / 手工绑定）”，会卡死。  
- 红旗：quality 算法配置/矩阵页术语过载，与阅卷主业无关时不应默认展开。

**王同学（学生查分 · Occasional）**

- 学生路径短（score / history / appeal）方向正确。  
- 红旗：若复核申请页字段多、状态枚举不解释，会放弃；需状态时间线而非后台表格。

### 1.7 Cognitive Load（摘要）

| 类型 | 判断 |
|------|------|
| Intrinsic | 阅卷/认证业务本身高复杂度 — **可接受** |
| Extraneous | portfolio 深树、多套壳、hex 风格漂移、kiosk 独立视觉 — **需降** |
| Germane | StageRail / 六步旅程有助于建立心智模型 — **保留并强化** |

**Checklist 失败项（代表性）**：

- Wall of Options：portfolio / quality 侧栏一次暴露过多入口  
- Hidden Navigation：考试详情子侧栏与全局侧栏双系统，关系需学习  
- Inconsistent Pattern：kiosk / survey / 主工作台三套密度与 token  
- Visual Noise Floor：side-tab + 指标卡片过多的分析页  

### 1.8 Minor Observations

- `UiSkeletonState` 使用 slate hex 渐变骨架，可改 token。  
- ECharts 配色在 `mark-echarts-options.ts` 硬编码，应引用 brand/semantic 色阶。  
- 直接 `a-table` 仅 6 处，适合作为“最后迁完”清单。  
- 响应式：survey 有 mobile 变体；主工作台明显 desktop-first（符合考务机场景，但平板断点需抽检）。  
- aria 信号约 180 处、`aria-label` 约 75 — 有基础但未系统化。  

### 1.9 Questions to Consider

1. 若教师默认只打开“本周待处理”一页，三域侧栏是否应降级为二级入口？  
2. kiosk 是否应共享 `--dp-*` 而不是平行 `tokens.css`？  
3. “未知枚举”在表格里的标准呈现是否已组件化（而非各页自写）？  
4. AI 分析页的主按钮是“打开证据”还是“生成更多图表”？哪一个才符合责任链？  

---

## 2. Audit · Technical Health Score

### 2.1 五维评分（0–4，满分 20）

| # | Dimension | Score | Key Finding |
|---|-----------|------:|-------------|
| 1 | Accessibility | 2 | 有 aria 与部分 label；无系统化焦点序/键盘操作审计；图片 alt 基本具备 |
| 2 | Performance | 2 | 9 处 layout-transition；632 SFC 体量大；依赖路由懒加载但缺实机性能证据 |
| 3 | Theming | 3 | Token + 永久浅色锁定优秀；业务 hex 与 kiosk 平行 token 拉低一致性 |
| 4 | Responsive Design | 3 | 工作台面向桌面合理；survey/kiosk 有专门布局；主列表平板体验未验证 |
| 5 | Anti-Patterns | 3 | Detector 仅 19 warning；无大面积 purple/indigo chrome；局部 side-tab/gradient |

**Audit Health Score: 13 / 20** → 评级带 **Acceptable（10–13）上沿 / 逼近 Good**

### 2.2 Detector 明细（全量）

运行：`node .cursor/skills/impeccable/scripts/detect.mjs --json src`  
结果：`total=19`，`severity=warning` only。

| Antipattern | Count | 代表路径 |
|-------------|------:|----------|
| side-tab | 10 | `LayoutQuestionOutlinePanel.vue`、`_analysis-center.scss`、`survey-fill-*.vue`、`scanner-kiosk/.../ReviewStage.vue`、`student/appeal.vue`、`user/message/index.vue` |
| layout-transition | 9 | `StageRail.vue`、`Asider/index.vue`、`ArchiveReadinessRateBar.vue`、`OngoingExamCardGrid.vue`、`MarkingOrgGroupProgressList.vue`、`ScanningStage.vue` |

### 2.3 Detailed Findings by Severity

#### P0 Blocking

- **本代码态扫描未发现“完全无法完成主任务”的单一 UI 阻塞**（无登录死链级静态证据）。  
- **保留风险**：若运行时将失败/未知状态显示为“暂无数据”，会构成业务级 P0 — 需联调页级状态机（本报告未做接口回放）。

#### P1 Major

1. **Token 泄漏（业务文件 hex）** — 见 Critique P1。  
2. **IA 过载（portfolio 路由表面积）** — 首访任务完成时间被导航消耗。  
3. **A11y 未达标 AA 信心不足** — 复杂表格/影像区键盘路径未证明；`layout-transition` 可能引发前庭不适偏好问题。  
4. **壳一致性缺口** — 近半数 views 未纳入统一 shell 统计口径，动作与状态位置漂移。

#### P2 Moderate

1. side-tab 粗左边框（detector）。  
2. `transition: width` 侧栏/进度。  
3. 登录渐变背景、分析中心 gradient、kiosk/survey `backdrop-filter`。  
4. `menuDark` 残留分支。  
5. ECharts / 骨架屏硬编码色。

#### P3 Minor

1. 少量裸 `a-table`。  
2. Logo `alt` 文案不统一（“logo” / “实训坊” / “教学质量中心”）。  
3. 帮助体系仅部分域覆盖。

### 2.4 Patterns & Systemic Issues

| 模式 | 表现 | 系统含义 |
|------|------|----------|
| 双轨 Token | 主站 `--dp-*` vs kiosk `tokens.css` | 视觉方言分裂 |
| 双轨表格 | UiDataTable 主流 + 少量 a-table | 收敛已完成大半 |
| 多壳并存 | StageWorkbenchShell / Exam layout / Archive layout / Kiosk | 有业务理由，但缺“何时用哪个壳”一页纸规范 |
| 三域一张皮 | teacher/quality/portfolio 共享 layout | 导航与权限模型需角色默认视图 |

### 2.5 Positive Findings（Audit）

- 品牌主色与浅色算法在 `App.vue` 代码级锁定。  
- `Ui*` 目录完整（Button/Table/Form/Empty/Drawer…），具备设计系统落地条件。  
- Detector 未扫出大面积 gradient-text / 彩虹边 / 紫靛 chrome。  
- 工作台 SCSS 分域（`styles/workbench`、`styles/admin`）结构清晰。  

---

## 3. 分域快评

### 3.1 `/teacher` 阅卷主链

- **强项**：考试工作台、扫描识别、批阅分派、成绩发布四段在路由与 shell 上可辨识；证据向组件（影像、布局设计器）投入明显。  
- **弱项**：归档卷子树过长，与 portfolio 概念边界需在 IA 层持续强调（mark 归档卷 ≠ quality portfolio）。  
- **建议优先级**：异常队列状态机文案与空态规范 > 视觉 polish。

### 3.2 `/quality` 质量评价 / OBE

- **强项**：矩阵、认证 cockpit、导入中心等专业信息架构存在；help 子树加分。  
- **弱项**：算法模板/画像配置对非质量专员噪声大；与阅卷侧栏并列时易误入。  
- **建议**：角色菜单裁剪 + 着陆“待审队列”。

### 3.3 `/portfolio` 教学档案袋

- **强项**：覆盖采录、缺口、归档、隐私同意等完整教务闭环。  
- **弱项**：**路由数量级最大（~110 path）**，是全站认知负荷主因。  
- **建议**：任务仪表盘优先，配置后置；统一 StageWorkbenchShell。

### 3.4 Scanner Kiosk

- **强项**：阶段机（setup / scanning / review）清晰，现场考务向。  
- **弱项**：独立 token + glass/blur + side-tab + layout-transition 集中；与主站设计语言距离最远。  
- **建议**：保留大触控目标，但色板并入 `--dp-*`。

### 3.5 Student / Public Survey

- **强项**：学生路径短；survey 有 desktop/mobile 拆分。  
- **弱项**：survey hex 污染 top 名单；side-tab 命中。  

---

## 4. 推荐行动（按优先级，仍为评价输出）

| 优先级 | 行动 | 对应命令（评价侧） | 实现 Skill |
|--------|------|-------------------|------------|
| 1 | 定义“未知/失败/无权限/真·空”四态表格规范并扫主链页 | `/impeccable harden` | `frontend-design-mark` |
| 2 | 收敛 survey / kiosk / Ui 组件 hex → token | `/impeccable colorize` | `frontend-design-mark` |
| 3 | portfolio IA 蒸馏：默认任务面 + 折叠配置 | `/impeccable distill` + `clarify` | `frontend-design-mark` |
| 4 | 清除 side-tab / width transition / 无用 gradient | `/impeccable quieter` + `optimize` | `frontend-design-mark` |
| 5 | 补齐 views 壳覆盖与 ContextBar 动作位 | `/impeccable layout` | `frontend-design-mark` |
| 6 | 删除或冻结 menuDark 暗色菜单分支 | `/impeccable harden` | `frontend-design-mark` |
| 7 | 键盘与焦点审计（批阅/表格/影像） | `/impeccable audit`（a11y 深潜） | `a11y` 卫星（可选） |
| 8 | 实机性能与核心页截图复核 | `/impeccable audit` + 浏览器 | — |

> 修复后请重跑：`/impeccable critique` 与 `/impeccable audit`，对比本报告分数。

---

## 5. 评分总表（一页纸）

| 评分板 | 分数 | 区间 |
|--------|------|------|
| Critique · Nielsen Design Health | **27 / 40** | 诚实可用，一致性与 IA 拖后腿 |
| Audit · Technical Health | **13 / 20** | Acceptable 上沿 |
| Detector hits | **19 warning** | side-tab 10 + layout-transition 9 |
| AI Slop 总判 | **局部轻度** | 非全站 slop |

**综合一句话**：  
设计系统与阅卷工作台语法已经立住；全量质量瓶颈是 **三域 IA 表面积 + Token/壳漏出 + kiosk/survey 方言**，不是“再画一个更炫的仪表盘”。

---

## 6. 方法与限制

**已做**：

- 读取 PRODUCT.md / DESIGN.md / ui-tokens / StageWorkbenchShell  
- 路由域统计、组件与 shell 覆盖统计  
- `detect.mjs` 全量 JSON  
- hex / gradient / glass / dark / a11y / table 静态扫描  

**未做（明确）**：

- 浏览器实机点击、键盘通路径、屏幕阅读器  
- Lighthouse / 网络性能  
- 后端状态机联调（“暂无数据”假空态需运行时证明）  
- 逐页截图对照  

**趋势**：本目标全量 critique 首次落盘 → **First run for `edu-practice-mark-vue-full`, no trend yet.**

---

## 7. 附录 A · Detector 原始命中文件清单

### side-tab

- `src/components/mark/layout-designer/LayoutQuestionOutlinePanel.vue`
- `src/styles/workbench/_analysis-center.scss`
- `src/views/public/survey-fill-desktop.vue`
- `src/views/scanner-kiosk/stages/ReviewStage.vue`（多处）
- `src/views/scanner-kiosk/stages/SetupStage.vue`
- `src/views/student/appeal.vue`
- `src/views/user/message/index.vue`
- （其余见 `/tmp` 运行快照或重跑 detect）

### layout-transition

- `src/components/archive-volume/ArchiveReadinessRateBar.vue`
- `src/components/mark/dashboard/OngoingExamCardGrid.vue`
- `src/components/workbench/StageRail.vue`
- `src/layout/components/Asider/index.vue`
- `src/views/admin/marking-organization/components/MarkingOrgGroupProgressList.vue`
- `src/views/public/survey-fill-desktop.vue`
- `src/views/public/survey-fill-mobile.vue`
- `src/views/scanner-kiosk/stages/ScanningStage.vue`

### hex 污染 Top（业务向，供 colorize 排队）

1. `views/public/survey-fill-desktop.vue`  
2. `views/public/survey-fill-mobile.vue`  
3. `views/scanner-kiosk/styles/tokens.css`  
4. `components/ui-guide/ui/UiArrowTimeline.vue`  
5. `components/FilePreviewDialog.vue`  
6. `views/scanner-kiosk/stages/SetupStage.vue`  
7. `components/ui-guide/ui/UiAlertStrip.vue`  
8. `utils/mark-echarts-options.ts`  

（`styles/ui-tokens.scss` 含 hex 为定义文件，**不作为污染**。）

---

## 8. 附录 B · 与 frontend-design-mark 对齐说明

本报告所有修复建议在落地时必须：

1. 只改 `edu-practice-mark-vue`（+ 对应后端若合同需要，另开任务）。  
2. 不引入第二主色、暗色主题、营销组件库。  
3. 优先复用 `Ui*` 与 `StageWorkbenchShell`，禁止平行发明第三套按钮/表格。  
4. mark 归档卷（archive-volume）与 portfolio 组件契约不得混用。  

---

*Generated by Codex using impeccable 3.9.1 · 2026-07-14*
