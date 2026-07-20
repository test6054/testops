# edu-practice-mark-vue Design Context

## Design Register

分层注册表：`brand` / `product` / `cockpit` / `trust`。默认产品工作台为 `product`；登录与公开面为 `brand`；概览/分析为 `cockpit`；批阅沉浸为 `trust`。

## System Baseline

`edu-practice-mark-vue` 使用 Vue 3、TypeScript、Vite、Pinia、Vue Router 5 和 Ant Design Vue 4.x。目标气质是**营销感现代教学 SaaS**，不是 2018 灰底裸 CRUD 后台，也不是把落地页塞进批阅表。

## Existing Tokens

项目设计令牌真源为 `src/styles/ui-tokens.scss`。**Ant Design `--ant-color-*`** 为语义色权威源（primary / success / warning / error）；**`--dp-*`** 为间距、圆角、阴影及色阶别名（如 `--dp-blue-500` → `--ant-color-primary`）。组件内语义态（成功/警告/错误/主色）优先用 `--ant-color-*`；需要色阶时用 `--dp-{hue}-{step}`，禁止 hardcoded hex。

`gi_*` legacy 工具类已淘汰；布局工具保留 `w-full` / `flex-1` 等无前缀原子类。

- 主色：`--ant-color-primary: #1677ff`（品牌锁定；禁止紫/靛 chrome 与 `#2563eb` 第二主色）
- 成功：`--ant-color-success: #52c41a`
- 警告：`--ant-color-warning: #faad14`
- 错误：`--ant-color-error: #ff4d4f`
- 页面背景：`--dp-bg-layout`（略冷灰画布，与白 panel 形成层级）
- 容器背景：`--ant-color-bg-container: #ffffff`
- 正文：`--ant-color-text: rgba(0, 0, 0, 0.88)`
- 次级文字：`--ant-color-text-secondary: rgba(0, 0, 0, 0.65)`
- 字体：系统中文字体栈，优先 `PingFang SC`、`Noto Sans SC`、`Microsoft YaHei`
- 基础字号：12、13、14、16、18、20、24、28
- 间距：4、8、12、16、20、24、28、32、40
- 圆角：控件 4px、面板 8px
- 控件高度：32、36、44
- Brand 氛围：`--dp-brand-glow-*`（仅 Brand 面；禁止在 Trust 沉浸滥用）

## Visual Layers

| 层 | 页面 | 视觉目标 | 禁止 |
|----|------|----------|------|
| Brand | 登录、公开、关键空态 | 品牌英雄级、氛围背景、单焦点表单 | 表格页堆 Hero |
| Product | Layout、考试列表、名册/组织表 | 现代 SaaS：材质差、图标 KPI、精致表 | 灰底裸 CRUD、裸大数字四格 |
| Cockpit | 阅卷概览、AI L0、质量 cockpit | 顶 KPI + 中叙事/图表 + 右快捷动作（Live 字段） | 不可钻取假图表、假活动流 |
| Trust | GradingWorkspace、仲裁/复核 | 现代 SaaS 沉浸壳（材质/分隔/面板抬升）+ 证据优先 | 落地页 Hero、营销长文、假 KPI |

## Layout Principles

- 页面 canvas 使用 `--dp-bg-layout`；白 panel 由 `WorkbenchSurfaceCard` / 工作台 Surface 承载。
- 教师端菜单按考试管理、扫描与识别、批阅流程、成绩与发布组织。
- 扫描、异常、批阅和成绩页优先使用队列、表格、分栏详情、影像预览、步骤状态和抽屉。
- 首页和统计页可以使用概览指标，但必须连接到具体考试、任务队列、异常项或待处理动作；KPI 默认可钻取。
- SignalBand 默认呈现「图标区 + 主值 + helper 副文案」（`iconTone` 仅为 UI 装饰映射，不发明业务数）。
- 学生端保持轻量。
- 列表加载失败必须 `:load-error`；表格失败态禁止内置或空态「重试」。
- 主路径按钮须显式 `variant="primary"`；`UiButton` 缺省为 `outline`。

## Component Rules

- 教师阅卷页外层使用 `StageWorkbenchShell` + `ContextBar` + 可选 `SignalBand`；考试详情使用 `exam-workspace-layout.vue` + `ExamSubSidebar`。
- 表格状态必须明确区分加载中、真实空结果、接口失败、权限不足、未知枚举、合同缺字段和待人工处理。
- 批量操作靠近表格选择状态；危险动作有明确确认。
- OCR、影像、评分、仲裁和复核保留证据入口、时间、操作人和业务锚点。

## Visual Constraints

- Brand 面允许克制氛围光与品牌主视觉；Product/Cockpit 禁止紫靛渐变、玻璃拟态、渐变文字、装饰性粗侧边条。
- 不新增纯黑 `#000` 大面积色块；颜色从 Ant / `--dp-*` 派生。
- 不把阅卷端做成纯深色监控屏；永久浅色。
- 卡片只用于实体摘要、统计概览或真实信息分组，不做嵌套卡片。
- 无 Live 活动流字段时，Cockpit 右栏用快捷动作+待办，禁止假动态。

## Motion And Feedback

- 动效服务于队列刷新、抽屉展开、扫描识别进度、保存发布反馈和错误定位。
- 微交互 200–300ms；禁止弹跳/闪烁；尊重 `prefers-reduced-motion`。

## Live Visual Facts（2026-07-19）

- Canvas：`--dp-bg-layout` ≈ `#f0f2f5`；panel 用 `--dp-shadow-xs/sm`。
- SignalBand panel：图标区 + 主值 + helper；`iconTone` 为 UI 装饰。
- Brand 样板：`views/login/index.vue`；Product：`exam-list.vue`；Cockpit：`marking-overview.vue`（快捷动作绑 Live metrics，无假活动流）。
- Scope 壳（Quality/Portfolio）无粗左侧色条，统一细边框 + 轻阴影。
- ContextBar workbench：标题左 / `#toolbar`+`#actions` 右；筛选与操作在顶栏内垂直居中。
- 考试编辑：`ExamEditDrawer`（含院系 `referenceDepartmentId`）；考试概览 ContextBar「编辑考试」。
- Trust：`grading-workspace` 队列/主区/给分面板使用 SaaS 材质（细边、轻阴影、分隔高亮）。
