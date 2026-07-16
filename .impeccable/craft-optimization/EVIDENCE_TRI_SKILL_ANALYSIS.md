# 证据驱动：三 Skill 共设 · mark-vue 现状与优化对照

> 本文只写 **现场代码证据** + 三 Skill 条款冲突/吸收点。  
> 不基于「猜竞品长什么样」空想一套新壳。竞品只作效率参照，落地映射回现有组件。

## 0. 三 Skill 分工（共同设计时的优先级）

| Skill | 作用域 | 对本任务的职责 |
|-------|--------|----------------|
| **frontend-design-mark** | `edu-practice-mark-vue` **实现真源** | 壳矩阵、浅色锁、`#1677ff`、DTO/枚举、Stage/Grading 槽位 |
| **frontend-design** | `edu-practice-web-vue` 姐妹工程 | 借 **教师工作台 archetype**（UiStatPanel + 主栏/侧栏密度节奏），**不复制路由/不跨工程引用** |
| **finesse-ui (product)** | 工艺与形态语言 | tinted substrate、KPI 解剖、workflow 预检、反廉价；**禁 brand hero / 全站暗色**（与 mark Theme Mode 一致） |

冲突裁决：**mark Hard Gates > finesse 炫技处方 > web-vue 视觉习惯**。  
例：Gradescope 深色批改台 **不得**原样搬入（mark 明文永久浅色沉浸）；可吸收其「卷面 | 给分 | 底栏」信息架构，仍用浅色 `GradingWorkspaceLayout`。

---

## 1. 现网真实布局（读代码，非猜测）

### 1.1 全局壳

```
LayoutDefault.vue
├─ Asider (230px / 折叠 80px) → Logo + Menu（三域由 Menu/DualDomain 配置）
├─ Header
├─ PortfolioLayoutContext（档案袋 scope 挂载）
└─ Main.vue
   └─ background: var(--ant-color-bg-container)   ← 白底，与侧栏同色层
```

证据：
- `layout/LayoutDefault.vue`：Asider + Header + Main
- `layout/components/Asider/index.vue`：宽度 230/80
- `layout/components/Main.vue` L80：`background: var(--ant-color-bg-container)`

**现状判断（工艺）**：page 与 card 同为白容器层，finesse 要求的 page≠card 未成立。  
**现状判断（业务）**：三域侧栏已存在，符合 mark「三域一壳」。

### 1.2 L0 教师工作台（`marking-overview.vue`）

真实槽位顺序（`StageWorkbenchShell`）：

```
#context → ContextBar(title=阅卷概览 + 学年/学期/状态 a-select)
#rail    → StageRail(考试旅程 panel compact)
#signal  → SignalBand(variant=tiles, compact)  ← 点状 tiles，非 panel 条带
default  → .marking-overview__content-grid
           ├─ main: WorkbenchSurfaceCard「进行中的考试」+ 待办等
           └─ aside 360px (≤某断点 300px): 侧栏卡
```

证据：`marking-overview.vue` L1–81、L581 `grid-template-columns: minmax(0,1fr) 360px`。

对比 **frontend-design** 教师工作台：`UiStatPanel columns=4 compact` + `dashboard-body` 主栏列表/侧栏待办。  
mark 概览 **已更接近**「可操作工作台」（SignalBand 可点、旅程轨），但 Signal 用 **tiles+彩点**，skill 更倡导 **panel 条带 + 可钻取、少彩虹 tone**。

### 1.3 考试工作台（`exam-workspace-layout.vue`）

```
独立顶栏（非 LayoutDefault Header）
├─ logo + ExamSwitcher + HeaderRightBar
└─ body
   ├─ ExamSubSidebar（旅程 6 步 + 菜单；layoutWide 时隐藏）
   └─ main
      ├─ UiAlertStrip（准备阻断，非 closable）
      └─ router-view → 页内再套 StageWorkbenchShell 或沉浸
```

证据：`exam-workspace-layout.vue` L1–100。  
**业务流程真源**：`exam-journey.ts` 六程 + `MarkStageKey` 九段；页面必须 `meta.journeyKey` + `meta.markStageKey`。

### 1.4 正评沉浸（`marking-task-detail.vue` + `GradingWorkspaceLayout`）

真实槽位：

```
GradingWorkspaceLayout（浅色；涉密时水印）
├─ #queue  → MarkingTaskToolbar / 批次提示
├─ #main   → 卷面/整卷画廊/题目材料
├─ separator（可拖 280–520，默认 380，localStorage）
├─ #aside  → MarkingScorePanel（UiCard + a-input-number step=0.5 + 快捷数字按钮）
└─ #footer → 批次 prev/next
```

证据：`GradingWorkspaceLayout.vue` L156–204；`MarkingScorePanel.vue` L1–93；`marking-task-detail.vue` 使用上述槽位。

**已有能力（勿装作没有）**：左卷右分、侧栏拖宽、0.5 步长、整卷多题 collapse、快捷数字、AI 建议分区。  
**相对智学/好分数/高阶 Gradescope 的缺口（对组件证据）**：
- 无「大号打分板宫格」主交互（仍是 InputNumber + 一排 outline 小按钮）
- 无「量表单元格一键累加」Rubric 心智（aside 是表单卡，不是评分准则矩阵）
- 无固定底栏「下一未阅」作为沉浸一级节奏（footer 有批次导航，但非正式 Next-Ungraded 产品语言）
- 左缘工具轨（标优/标错/问题卷）未做成常驻 icon rail（能力可能散落工具栏）

### 1.5 Token / 样式现状

`ui-tokens.scss`：`--ant-color-primary:#1677ff`，`--ant-color-bg-layout:#f5f5f5`，`--ant-color-border:#d9d9d9`，`Main` 却用 **bg-container 白**。  
圆角：`--dp-radius-control:4px` / `panel:8px`（符合 mark，**不符合** finesse product 16–22 卡圆角 → **以 mark 为准，不吸收大圆角**）。

---

## 2. 业务流程现状（代码契约）

| 环节 | 现网入口/壳 | 合同要点 |
|------|-------------|----------|
| 考前准备 | exam-workspace prep + PrepStepCard | snapshot 阶段完成度，禁前端假完成 |
| 扫描绑定 | scan batches / kiosk / scan-ops | 身份绑定质量、异常批次 |
| 阅卷组织 | marking-org | 派题包，非页面内假裁决 |
| 试评/正评 | task pool → marking-task-detail 沉浸 | 正评/复核 **两套 UI 合同分离** |
| 质控 | arbitration / spot-check / review-workspace | 仲裁走 confirm/reject API |
| 成绩发布 | score summary / release | 后果型操作需确认 |
| 考后 | archive package + AI analysis 双入口 | L0 与考试内 tab 逻辑不分叉 |
| 质量/档案袋 | /quality、/portfolio 独立 Scope | 禁混 ContextBar 旅程标签 |

优化不得推翻上述合同，只能 **压缩路径、加强主交互、补预检与作战信息**。

---

## 3. 差距矩阵（现状 → 三 Skill + 竞品效率）

| 维度 | 现状证据 | mark skill | finesse product | web-vue 姐妹 | 竞品效率参照 | 优化动作（绑现有组件） |
|------|----------|------------|-----------------|--------------|--------------|------------------------|
| 全局底 | Main=白 container | 白工作台面 OK；忌灰壳当页基 | page 应 tinted，卡浮起 | `--dp-bg-muted` 页底更常见 | 清爽运营台 | **O1** token：layout tint + Main 用 bg-layout；卡仍白 |
| 主色 | #1677ff | **锁定** | 忌未审视默认蓝 | 同 #1677ff | 多蓝但非 Ant 皮 | **O1b** 可保留 hex，靠 substrate 去皮；换色另立项 |
| L0 KPI | SignalBand **tiles**+tone | 偏好 panel、可钻取、少装饰 | KPI anatomy | UiStatPanel grid | 智学数据概览 | **O2** overview 改 panel；tone 收敛 |
| L0 布局 | 主 1fr + 360 侧栏 | 非对称 OK | 密度高 | dashboard-body 2 列 | — | **O2b** 待办聚焦布局已有，强化「继续批改」主 CTA |
| 考试 IA | 六程+侧栏菜单 | 必保留 | workflow 壳 | — | 智学任务列表更短 | **O3** marking-overview/任务池置顶「我的任务」深链沉浸，六程仍给主考 |
| 给分器 | InputNumber+小按钮 | 沉浸浅色、MarkingScorePanel | — | — | 智学打分板/好分数步长宫格 | **O4** 增强 MarkingScorePanel：大宫格快选+全对/全错（浅色），不换壳 |
| 批改节奏 | footer 批次 | 双链合同 | — | — | Gradescope Next Ungraded | **O5** footer 产品化「下一未阅」文案+快捷键（已有 J/K 则对齐展示） |
| 量表 | 无独立 Rubric 矩阵 | 有 AI 分/表单 | — | — | Gradescope rubric | **O6** 若后端有评分点结构再做；否则 **STOP_AND_ASK**，禁假字段 |
| 进度协同 | review-progress 页 | SignalBand | 作战密度 | — | 他人进度/科组长 | **O7** 用现网进度 API 做可钻取条，不造假人 |
| 发布 | 多页 | 确认框 | workflow-ui 预检 | — | 好分数开关/统分 | **O8** WorkflowReadinessPanel/预检条挂发布页 |
| 考后 | AI/归档分入口 | 双入口不分叉 | — | — | 智学学情主价值 | **O9** 发布成功态 → 行动摘要页（指标来自现有 analysis API） |
| 圆角/暗色 | 4/8；浅色沉浸 | **硬锁** | 16–22 / 可暗色批改台 | 8px | Gradescope 暗 | **不吸收** |

---

## 4. 优化包（全部映射回文件）

| ID | 名称 | 改哪些现网文件/组件 | 验收 |
|----|------|---------------------|------|
| O1 | Substrate | `ui-tokens.scss` `Main.vue` `App.vue` ConfigProvider | 页底≠卡面；border hairline；主色仍 #1677ff |
| O2 | overview 信号 | `marking-overview.vue` SignalBand variant | panel + 点击过滤列表 |
| O3 | 任务直达 | `marking-overview` + task pool 深链 | 一键进 marking-task-detail |
| O4 | 给分器升级 | `MarkingScorePanel.vue` + 样式 | 大宫格快选；仍在 #aside |
| O5 | 沉浸底栏节奏 | `marking-task-detail` #footer | 「下一未阅」主按钮 |
| O6 | Rubric（可选） | 仅当 API 有评分点 | 否则不做 |
| O7 | 进度作战 | `review-progress.vue` | 本人/队列/异常可钻取 |
| O8 | 发布预检 | 成绩发布页 + WorkflowReadiness | 阻断原因列表 |
| O9 | 考后行动 | 发布成功路由 + ai-analysis 组件复用 | 非孤岛 Tab |
| O10 | 域识别 | `Main.vue` domain class + nav | 三域 tint，不换品牌色 |

---

## 5. 与前序色板/线框画廊的关系

- `gallery-full.html` / 纯色板：降级为 **O1 附属选项**，不再当主决策。  
- `ux-morphology-gallery.html` 中深色 Gradescope 示意：与 mark **冲突**，以本文 O4/O5 **浅色增强现壳** 为准。  
- 完整文件穷举：`FRONTEND_FILE_INVENTORY.txt`（1752）在改 O* 时按表反查。
