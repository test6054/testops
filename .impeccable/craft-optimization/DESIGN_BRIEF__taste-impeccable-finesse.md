# Design Brief · mark-vue Craft Direction

> `/impeccable shape` · **Taste**（adapted anti-slop）× **Impeccable product** × **Finesse product**  
> 落地闸门：**frontend-design-mark**（浅色 · `#1677ff` · Stage/Grading 壳 · DTO）  
> Date: 2026-07-15 · Companion UI: `craft-board-hi-fi.html`

## Design Read

> Reading this as: **regulated EduTech exam-marking product workbench** for 主考 / 评卷教师 in long daylight grading sessions, with a **trust-first / high-density / evidence-chain** language, leaning toward **finesse product substrate (Cool Slate + Cobalt `#1677ff`)** under **mark shells**, **not** brand landing / Awwwards / dark ops theater.

| Dial | Value | Source |
|------|------:|--------|
| Taste DESIGN_VARIANCE | **3** | 秩序 > 艺术 |
| Taste MOTION_INTENSITY | **2** | feedback only |
| Taste VISUAL_DENSITY | **8** | cockpit / tables |
| Finesse SPECTACLE | **2** | product floor |
| Finesse DENSITY | **8** | operate + read |
| Color strategy | **Restrained** | accent ≤10% pixels |
| Theme | **Light** | 日间教研室荧光灯下连片给分 |

**Anchors:** Linear（密度/侧栏）· 智学网给分板（宫格节奏）· Gradescope（纸面 \| 给分 \| Next）· 现网 `StageWorkbenchShell` / `GradingWorkspaceLayout`.

**Image probes:** 当前 harness 无原生 image_gen，已跳过 Phase 1.5，以高保真 HTML 四幕对照代替。

## Scope（已按多轮对话断言；可覆写）

| Axis | Value |
|------|-------|
| Fidelity | High-fi interactive craft board |
| Breadth | L0 概览 · 考试壳 · 正评沉浸 · 发布预检 |
| Next | 确认 O* 后 `/impeccable craft` 改 Vue |

Anti-goals: 营销 hero · 紫渐变 · Geist/Inter 全站 · 暗色沉浸 · 假 Rubric · 拆三域侧栏 · **默认**不采用 finesse 16–22 圆角（见 Stretch）。

## Finesse 吸收矩阵（理念如何真用上）

| Rule | Absorb | Landing |
|------|--------|---------|
| 双层白 page ≠ card | YES（默认 layout 灰） | Main → `bg-layout #f5f5f5`；Cool Slate 可选 O1b |
| hairline `rgba(ink,.07)` | YES | 取代硬 `#d9d9d9` 卡边 |
| whisper tinted shadow | YES | 忌 list 区重影 |
| KPI anatomy（chip+label+tabular+delta+spark） | YES | SignalBand **panel** |
| 一 accent · 禁蓝绿橙身份三联 | PARTIAL | 锁 `#1677ff`；收敛 tiles 彩点 |
| card radius 16–22 | NO default | mark 4/8；幕 07 Stretch 可选 |
| brand grain / dark grading | NO | PRODUCT + mark Theme Mode |
| scorepad + Next Ungraded | YES | MarkingScorePanel / footer |
| workflow pre-submit check | YES | 发布预检 O8 |

## Success criteria

1. 教师 L0 → 沉浸「下一未阅」路径 ≤ 3 步  
2. 第一屏可读：待我处理 / 阻断 / 主 CTA  
3. 给分主交互为宫格，表单为辅  
4. 像素可追溯 token 或现网组件名  
5. Taste / impeccable 黑名单零命中（侧条、渐变字、三列 hero、eyebrow 脚手架）

## 现状证据（摘要）

- `Main.vue`：`background: var(--ant-color-bg-container)` → page=card 白塌陷  
- `marking-overview.vue`：`SignalBand variant="tiles"` + 彩点  
- `MarkingScorePanel.vue`：`a-input-number` + 小 outline 快选  
- `GradingWorkspaceLayout`：queue / main / aside(380) / footer 已具备左卷右分  

Craft 只增强同壳，不另起暗色台。


## 场景句 → UI 对照（Design Read 可验证）

| 场景轴 | 需求 | NOW 失效 | CRAFT | 落地 |
|--------|------|----------|-------|------|
| 人物 | 我是评卷员 | 多 KPI 等权 | 待我处理 + 继续批改 | O2/O3 |
| 环境光 | 荧光灯降眩光 | page=白 container | Cool Slate page | O1 |
| 动作 | 看图→给分→下一份 | InputNumber 填表 | 宫格 + 下一未阅 | O4/O5 |
| 赶进度 | 剩余量 + 默认下一件 | 深链弱 | 任务直达 | O3 |
| 怕误分 | 快且可校准 | 满分弱 / 建议弱 | x/满分 + AI 采用写入 | O4 |
| 怕证据 | 后果与阻断可行动 | 确认分散 | 预检清单 | O8 |

高保真可见：`craft-board-hi-fi.html` → **00a 场景心态对照**。


## 白底与边框裁决（修正）

| 问题 | 结论 |
|------|------|
| 白底更合适吗？ | **工作面（表/卡/答卷）宜白**；**整页纯白不合适**（Main 现用 container 导致塌陷） |
| Cool Slate 必须吗？ | **否**。默认 **O1a**：启用已有 `--ant-color-bg-layout #f5f5f5`。O1b Cool Slate 可选 |
| 灰色边框不合适吗？ | **硬 `#d9d9d9` 墙不合适**；浅 `#f0f0f0` / hairline / 行分割合适；控件边可略深 |
| 主题色？ | 本轮锁定 `#1677ff`，与基板正交 |

落地：优先改 `Main.vue` background → `bg-layout`，收敛面板边与阴影叠用。详见 craft-board **01b**。


## 方案确认进度

**唯一 HTML：** [`craft-board-hi-fi.html`](./craft-board-hi-fi.html)（分幕对照 + 已并入全部分析报告；确认组合在页脚）。
勾选后点「生成并复制确认摘要」→ 贴回对话 → 再写入本 BRIEF。对照图另开看板/全景页。


| 幕 | 状态 |
|----|------|
| 02 L0 阅卷概览 | **已确认**（暂不改码，等全案） |
| 04 正评沉浸给分 | **已确认** |
| 05 发布预检 | **已确认** |
| 06b 表格与多 Tab | **待确认** · 推荐默认 T1+T2+T3 |
| 07 全景工作台 | **待确认** · 推荐 P-KPI(无左条)+P-CHART+P-FILTER+P-ACTION+P-CREATE |
| 08 档案袋·质量流程 | **待确认** · F-FLOW-TEACHER+SHELL+QUALITY+DOMAIN-FOCUS（**禁更多**）· 2026-07-16 看板已补 `#proxy-interaction` `#component-vision` 与竞品审计差分 |

### 档案袋 / 质量（业务流程重构 · 禁「更多」）

**硬禁令**：禁止用「更多 / secondary 折叠」当方案。「更多」只是给菜单超市加盖，业务流仍错。

- **问题**：功能目录模型（角色×页面清单），不是阶段×任务模型。portfolio ~86 菜单；quality 五组平铺；三域并陈。
- **F-FLOW-TEACHER**：本人四阶段——着陆「我」→ 办待办（任务壳）→ 单一档案工作台内分节 → 场景为有期限任务实例。侧栏只表阶段，不表功能叶。
- **F-FLOW-SHELL**：身份切换 = 互斥旅程（本人 / 院审 / 治理 / 配置），换着陆与阶段模型；不是给原树加一组菜单。
- **F-FLOW-QUALITY**：学期任务链（工作台待办→钻取→结果面）；治理（方案/认证/AI）为独立治理旅程，与授课执行隔离。
- **F-DOMAIN-FOCUS**：顶层仅域切换；域内只渲染当前旅程。
| 09 AI·扫描·OCR 流程 | **待你勾选** · 方法已定：竞品+高校场景；总壳推荐 A3；S/O 另审 |

### AI 分析 / 扫描运营 / OCR（全景流程）

**可视对照页（按现网 Vue 还原）：** `edu-practice-mark-vue/.impeccable/craft-optimization/`panorama-ops-real-vs-craft.html`；AI 完整：`panorama-ai-analysis-full.html`；场景竞品：`AI_ANALYSIS_COMPETITOR_AND_UNIV_SCENARIOS.md`

- **A-FLOW（待勾选）**：选型依据已定（竞品+高校，见 `AI_ANALYSIS_COMPETITOR_AND_UNIV_SCENARIOS.md` 勾选表）。推荐总壳 **A3**；共通规则建议：同页直出、禁主发现 CTA、砍当前视图、页头唯一范围、聚类单层 KPI、P-CHART。**等你回复勾选编号后再锁定，未锁定前不改产品码。**
- **S-FLOW**：扫描运营默认=待处置队列；日志/派单/体检为任务钻取或子旅程；三域同阶段模型；砍复杂 returnDispatch URL 迷宫。
- **O-FLOW**：教师「找内容」检索旅程 ∥ 超管 OCR 配置旅程物理隔离；命中→打开页图强制下一拍。
| 01b 白底与边框 | 推荐 O1a，待最终勾选 |
| 03 考试内旅程+概览 | **待确认** · E-FLOW + E-OVERVIEW（**禁功能叶/更多**） |

### 考试工作台内（E-*）

真源：`ExamSubSidebar` 双层（旅程 + ExamSubSidebarNav ~34 叶）· `exam-detail` + overview dashboard。

- **E-FLOW**：保留概览+六程；**废除**程下功能目录（含任何「更多」收纳）。每程一个工作台，次要工具工作台内钻取。
- **E-OVERVIEW**：单一权威 KPI 带；待办队列；砍重复 analytics 卡；质量空不占雷达；CTA 与下一步同源。
- **E-SIGNAL-ONLY**：可选，与 E-OVERVIEW 互斥。


### 全景推荐默认（P-*）

- **P-KPI**：SignalBand panel · label 上 / 值+delta · 圆角 8 · **选中禁左边彩条**（淡底+边升+蓝字）· **不要**格内「筛选中」口号；说明走 AlertStrip/Tips
- **P-CHART**：`MARK_ECHARTS_PALETTE.primary` 收拢为 `#1677ff`（禁 `#2563eb`）· 蓝阶 ≤4 系列 · 仅 MarkChart
- **P-FILTER**：搜索 240–320 · 芯片主筛 · 折叠次要 · 空态区分无数据/条件过窄
- **P-ACTION**：列表每屏 ≤1 主 CTA（创建考试）
- **P-CREATE**：创建考试全页 · Tips 统一（字段 `tooltip` / 页级 `UiAlertStrip`；禁灰字旁注与黄框 DIY）· **控宽栅格**（主考一人非通栏；短字段双列；长文本才通栏）· 壳 layout 灰+表白 · 去掉段标题蓝条改序标 · 侧栏态 · 底栏还差 N · 成功下一拍保留
- 可选：P-SPARK（KPI 旁微趋势）、P-DONUT（完成率环 ≤1）

#### Anti-AI：左边彩条

skill「Components」明文禁止 decorative colored left stripe。错误草案里 KPI 选中曾用 `inset` 左蓝条；现网创建页 `.section-title::before` 同类问题，CRAFT 一并清除。

图表色相漂移证据：`mark-echarts-options.ts` 当前 `primary = #2563eb` + multi-hue；CRAFT 必须修复。

截图参考：`craft-optimization/ref-signalband-panel.png`

### 表格推荐默认（T1+T2）

- 对齐：短中 / 长左 / 数右 + `tabular-nums`
- 标题禁 `UiBadge` 条数；「共 N 条」仅分页
- 行操作：一 primary，其余 op-link
- 边：`--dp-table-border`（secondary），无卡重影套表

### 多 Tab 推荐默认（T3）

- 列表过滤：`UiSectionTabs` 单层 + 次级 count
- 新页禁用 `a-tabs type=card` 作页面过滤
- 时间/学期进 `UiFilterBar`；考试旅程留侧栏，不进 Tab

确认入口：`craft-board-hi-fi.html` → **06b**（表/Tab）· **07**（全景 KPI/图/筛/创建）。
