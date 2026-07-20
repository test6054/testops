# edu-practice-mark-vue Product Context

## Register

product（工作台）+ brand（登录/公开面）分层；驾驶舱页走 cockpit 叙事。

## Product Purpose

`edu-practice-mark-vue` 是 nybc-practice 的阅卷中心独立前端，与 `edu-practice-web-vue` 平行部署。它面向纸质试卷扫描、身份绑定、OCR 识别、批阅分派、匿名批阅、仲裁、成绩确认、发布、复核和校级质量分析等阅卷主链。

阅卷端主要对接 `edu-mark`，并通过 `edu-gateway` 统一使用平台登录、租户、文件和消息能力。它不是主前端的子模块，也不重复实现租户管理、用户管理、系统公告、存储统计等通用管理能力。

## Users

- 超级管理员：查看阅卷概览、批改审计和 AI 分析，关注监管、质量和异常。
- 校级教师：组织考试、配置模板、录入扫描影像、处理异常、分派批阅、确认成绩和处理复核。
- 学生：查看成绩、历次考试和复核申请。

## Brand And Tone

界面气质是**营销感现代教学 SaaS 平台**：登录与公开面传达品牌专业；进入工作台后利落高效，摆脱「老旧后台管理」观感。阅卷场景涉及成绩、身份、评分和复核，责任链、状态、证据和下一步动作必须清楚可查。

视觉分层：

- **Brand**：登录、公开查询、关键空态 — 品牌名英雄级、氛围构图、少表。
- **Product**：壳层、列表、组织/名册 — Linear/Stripe 式现代 SaaS（层级、轻材质、双行 KPI）。
- **Cockpit**：阅卷概览、AI 分析 L0、质量驾驶舱 — 对齐 web-vue 作答管理式多栏叙事。
- **Trust**：批阅/仲裁沉浸 — 证据优先，禁止 Hero 与营销文案。

文案使用中文阅卷业务语言。状态名、操作名和异常提示贴近考试、答题卡、扫描影像、OCR、批阅、仲裁、成绩发布和复核语境。

## Strategic Principles

- 试卷主链清晰：考试管理、扫描识别、批阅流程、成绩发布四类工作区必须保持稳定分组。
- 证据优先：扫描影像、识别结果、评分记录、仲裁结论和发布状态要可定位、可追踪。
- 风险显性：身份绑定失败、OCR 异常、评分冲突、发布前缺项和复核争议不能被空状态掩盖。
- 高频批处理友好：教师需要快速筛选、批量处理、回到任务队列和查看详情。
- 学生视角克制：学生端重点是成绩、题目维度回看和复核申请，不展示管理端噪声。
- 前后端合同一致：所有请求遵守 GET / POST、`ResultInfo<T>` 自动解包、`Long` ID 字符串语义和分页合同。
- 营销感落在 Brand/Product/Cockpit 分层，不得把落地页堆进批阅表与沉浸评分。

## Anti References

- 不要把表格/批阅页做成多卖点长滚动落地页。
- 不要用炫技视觉表现替代阅卷证据链。
- 不要用大面积深色监控风格掩盖表格、队列和影像处理效率。
- 不要在未知枚举、缺少影像、缺少评分记录时显示成“暂无数据”。
- 不要把 AI 分析写成确定性裁决；阅卷责任链和人工复核边界必须清楚。
- 不要紫靛渐变、玻璃拟态、渐变字、粗左侧色条、不可点装饰 KPI。

## Core Surfaces

- `src/router/routes/teacher.ts`：教师阅卷工作台四大菜单组。
- `src/router/routes/student.ts`：学生成绩、历次考试和复核申请。
- `src/router/routes/admin.ts`：管理员概览、监管和 AI 分析。
- `src/apis/mark/exam.ts`：考试主链 API。
- `src/apis/mark/exam-mark-scanner.ts`：扫描录入与识别 API。
- `src/apis/mark/grade-review.ts`：评分批阅与仲裁 API。
- `src/components/ui-guide/ui`：阅卷端统一设计语言组件。
- `src/views/login/index.vue`：Brand 登录面。
- `src/views/teacher/marking-overview.vue`：Cockpit 样板。
- `src/views/teacher/exam-list.vue`：Product 列表样板。
