# edu-practice-mark-vue Design Context

## Design Register

product

## System Baseline

`edu-practice-mark-vue` 使用 Vue 3、TypeScript、Vite、Pinia、Vue Router 5 和 Ant Design Vue 4.x。它是阅卷中心，不是营销页。设计应优先支持扫描识别、异常处理、批阅分派、成绩发布和复核处理等高频工作流。

## Existing Tokens

项目设计令牌真源为 `src/styles/ui-tokens.scss`。**Ant Design `--ant-color-*`** 为语义色权威源（primary / success / warning / error）；**`--dp-*`** 为间距、圆角、阴影及色阶别名（如 `--dp-blue-500` → `--ant-color-primary`）。组件内语义态（成功/警告/错误/主色）优先用 `--ant-color-*`；需要色阶时用 `--dp-{hue}-{step}`，禁止 hardcoded hex。

`gi_*` legacy 工具类已淘汰；布局工具保留 `w-full` / `flex-1` 等无前缀原子类。

- 主色：`--ant-color-primary: #1677ff`（品牌锁定；禁止紫/靛 chrome 与 `#2563eb` 第二主色）
- 成功：`--ant-color-success: #52c41a`
- 警告：`--ant-color-warning: #faad14`
- 错误：`--ant-color-error: #ff4d4f`
- 页面背景：`--ant-color-bg-layout: #f5f5f5`
- 容器背景：`--ant-color-bg-container: #ffffff`
- 正文：`--ant-color-text: rgba(0, 0, 0, 0.88)`
- 次级文字：`--ant-color-text-secondary: rgba(0, 0, 0, 0.65)`
- 字体：系统中文字体栈，优先 `PingFang SC`、`Noto Sans SC`、`Microsoft YaHei`
- 基础字号：12、13、14、16、18、20、24
- 间距：4、8、12、16、20、24、28、32、40
- 圆角：4、6、8、10；工作台面板默认不超过 8px
- 控件高度：32、36、44

## Layout Principles

- 教师端菜单按考试管理、扫描与识别、批阅流程、成绩与发布组织，页面结构应强化这四条工作流。
- 扫描、异常、批阅和成绩页优先使用队列、表格、分栏详情、影像预览、步骤状态和抽屉。
- 首页和统计页可以使用概览指标，但必须连接到具体考试、任务队列、异常项或待处理动作。
- 学生端保持轻量，只呈现成绩、考试历史、题目维度和复核入口。
- 管理员端强调监管、审计和跨考试分析，避免把所有图表做成无业务锚点的装饰。

## Component Rules

- 教师阅卷页外层使用 `StageWorkbenchShell` + `ContextBar`（`#status` / `#actions`）+ 可选 `SignalBand`；考试详情使用 `exam-workspace-layout.vue` + `ExamSubSidebar`。基础控件优先 `components/ui-guide/ui` 的 `Ui*`，Ant Design Vue 仅补缺口。
- 表格状态必须明确区分加载中、真实空结果、接口失败、权限不足、未知枚举、合同缺字段和待人工处理。
- 批量操作要靠近表格选择状态，危险动作要有明确确认和结果反馈。
- OCR、影像、评分、仲裁和复核相关信息应保留证据入口、时间、操作人和业务锚点。
- 评分与发布相关按钮必须表达实际动作，例如“确认成绩”“发布成绩”“提交复核处理”“进入仲裁”。

## Visual Constraints

- 不使用渐变文字、玻璃拟态、装饰性粗侧边条、重复图标卡片网格或营销式 hero。
- 不新增纯黑 `#000` 或纯白 `#fff` 大面积色块；新增颜色优先从现有 Ant Design Vue 和 `--dp-*` 令牌派生。
- 不把阅卷端做成纯深色监控屏。阅卷工作需要长时间阅读表格、影像和评分详情，默认保持浅色高对比。
- 卡片只用于实体摘要、统计概览或真实信息分组，不做嵌套卡片。
- 不用页面说明文字解释功能，应通过标题、状态、字段和动作本身表达业务。

## Motion And Feedback

- 动效服务于队列刷新、抽屉展开、扫描识别进度、保存发布反馈和错误定位。
- 不动画化布局属性，不使用弹跳或夸张过渡。
- 高频工作流优先使用内联反馈和右侧抽屉，模态框只用于必须阻断的确认或表单。
