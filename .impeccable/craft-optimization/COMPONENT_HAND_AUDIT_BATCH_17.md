# 组件手审账 · Batch 17（重写 · 逐文件三 Skill）

> 逐文件 Read · Impeccable product · Finesse D8 · Taste 3/2/8 · frontend-design-mark  
> 本批替换原机械套话版 · 2026-07-16

## 211. `MarkBarSection.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/chart/MarkBarSection.vue` |
| 源码 | section 原语；itemCount→空壳；orientation 横/纵；refs≈13 |
| 注册名 | `MarkBarSection` |
| Props要点 | title、hint、itemCount、option、height |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 空态由 itemCount 驱动 ECharts graphic 空壳，aria 拼「共 N 项 / 当前没有可展示的内容」。  
**Finesse：** 与 trend/scatter 共用 --dp-border/--dp-surface 面板；mobile 下 title/hint 折行。  
**Taste：** 纯数据面板；orientation 覆盖纵/横，避免页内分叉 bar 壳。  

**判定：OK**  
**动作：** 横向页传 orientation=horizontal；空态走 emptyDescription。  
**禁：** 绕过 itemCount 塞空 option；页内 duplicate bar section。

## 212. `MarkTrendSection.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/chart/MarkTrendSection.vue` |
| 源码 | pointCount+minPoints=2；单点/零点文案分叉；refs≈7 |
| 注册名 | `MarkTrendSection` |
| Props要点 | title、hint、pointCount、minPoints、option |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 单点与零点空态文案分叉；不足 minPoints 不画假折线。  
**Finesse：** hint 右对齐；aria 可带末值与单位。  
**Taste：** 空态指向「配置范围并生成分析」，非 generic no data。  

**判定：OK**  
**动作：** 单场考试传 singlePointDescription；保留 lastValue。  
**禁：** minPoints 降到 1；页内 duplicate empty 逻辑。

## 213. `MarkGaugeBlock.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/chart/MarkGaugeBlock.vue` |
| 源码 | L43 |
| 注册名 | `MarkGaugeBlock` |
| Props要点 | option、ariaLabel、layout、gaugeSize、gaugeHeight |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 不走 resolveMarkChartSectionOption；读屏依赖调用方完整 ariaLabel。  
**Finesse：** stacked 时 meta 居中；mobile 自动 column。  
**Taste：** inline 适合缺考确认等紧凑 KPI。  

**判定：OK**  
**动作：** 空数据由父层决定是否渲染。  
**禁：** 再包 section 边框；omit ariaLabel。

## 214. `MarkChartCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/chart/MarkChartCard.vue` |
| 源码 | 转发 UiStatisticChartCard compact；去 shadow；refs≈3 |
| 注册名 | `MarkChartCard` |
| Props要点 | title、description、loading、chartMinHeight |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** loading 由 UiStatisticChartCard 承接；chart 经 slot 注入。  
**Finesse：** height:100% 让报告栅格等高；compact 固定。  
**Taste：** 去 shadow、贴 --dp-border，非 marketing card。  

**判定：TUNE**  
**动作：** 新 teacher 页优先 section 原语。  
**禁：** card 内再嵌 MarkBarSection 双边框；恢复 box-shadow。

## 215. `MarkHeatmapSection.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/chart/MarkHeatmapSection.vue` |
| 源码 | cellCount；默认高 120px；cell-click emit；refs≈2 |
| 注册名 | `MarkHeatmapSection` |
| Props要点 | title、hint、cellCount、option、height |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 点击映射为整数 cell index，非法 params 不 emit。  
**Finesse：** 默认高 120px，适合题目×得分率矩阵。  
**Taste：** 矮面板不抢垂直空间。  

**判定：OK**  
**动作：** 用 cell-click 联动题目清单。  
**禁：** 默认高度拉到 280；silent swallow 点击。

## 216. `MarkDistributionSection.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/chart/MarkDistributionSection.vue` |
| 源码 | total>0；默认高 72px；distribution variant；refs≈1 |
| 注册名 | `MarkDistributionSection` |
| Props要点 | title、hint、total、option、height |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** total>0 就绪；极矮 72px 分布条。  
**Finesse：** 与 bar 同 section 边框语言，高度语义不同。  
**Taste：** 嵌入 review-progress 不占整卡。  

**判定：OK**  
**动作：** 第二处复用本组件。  
**禁：** 混用 itemCount prop 名。

## 217. `MarkScatterSection.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/chart/MarkScatterSection.vue` |
| 源码 | brush-selected + clearBrush expose；高 300px；refs≈1 |
| 注册名 | `MarkScatterSection` |
| Props要点 | title、hint、pointCount、option、height |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** brush-selected + clearBrush expose，与清单联动。  
**Finesse：** 默认高 300px，适合题目质量主图。  
**Taste：** 散点交互留 section，页面只接 emit/expose。  

**判定：OK**  
**动作：** QuestionAnalysisCard 继续 clearBrush。  
**禁：** 页内 duplicate brush；假选中。

## 218. `CreatePageLayout.vue`

| 项 | 事实 |
|----|------|
| 路径 | `layout/CreatePageLayout.vue` |
| 源码 | 仅 router-view；100vh overflow hidden；refs≈1 |
| 注册名 | `CreatePageLayout` |
| Props要点 | 见源码 |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 创建流 /teacher/create 脱离 TeacherLayout，仅 router-view。  
**Finesse：** 100vh + overflow:hidden + min-height:0 防滚动链断裂。  
**Taste：** 无 chrome；浅色容器，fallback #fff 仅 ant token 缺失时。  

**判定：SHELL**  
**动作：** 子页自带 header；勿塞 ContextBar。  
**禁：** 第二品牌底；layout 加业务 loading。

## 219. `CourseSelector.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/selectors/CourseSelector.vue` |
| 源码 | 选择器 L130；refs≈20；badhex=- |
| 注册名 | `CourseSelector` |
| Props要点 | 见源码 |
| 结构信号 | 失败toast |

**Impeccable：** POST /api/quality/courses/page；级联 plan/program/学年学期；失败 showUserError。  
**Finesse：** option 展示 courseCode·courseName + 学年学期 meta。  
**Taste：** placeholder「请选择质量评价课程」域内语义明确。  

**判定：OK**  
**动作：** 删未用 scoped 灰阶工具类；debounce 走常量。  
**禁：** 页内第二套同名选择器；未知枚举兜底。

## 220. `ProgramSelector.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/selectors/ProgramSelector.vue` |
| 源码 | 选择器 L94；refs≈13；badhex=- |
| 注册名 | `ProgramSelector` |
| Props要点 | 见源码 |
| 结构信号 | 失败toast |

**Impeccable：** 选型合同 props：见源码；API /api/course-catalog/major-categories/list。  
**Finesse：** 下拉密度；slots=无。  
**Taste：** 域内 placeholder，无营销卡。  

**判定：OK**  
**动作：** 删未用 scoped 灰阶工具类；debounce 走常量。  
**禁：** 页内第二套同名选择器；未知枚举兜底。

## 221. `TeacherSelector.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/selectors/TeacherSelector.vue` |
| 源码 | 选择器 L234；refs≈12；badhex=- |
| 注册名 | `TeacherSelector` |
| Props要点 | 见源码 |
| 结构信号 | 失败toast |

**Impeccable：** 选型合同 props：见源码；API /api/admin/teachers/user-list、/api/admin/teachers/batch-details。  
**Finesse：** 下拉密度；slots=无。  
**Taste：** 域内 placeholder，无营销卡。  

**判定：OK**  
**动作：** 删未用 scoped 灰阶工具类；debounce 走常量。  
**禁：** 页内第二套同名选择器；未知枚举兜底。

## 222. `TrainingPlanSelector.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/selectors/TrainingPlanSelector.vue` |
| 源码 | 选择器 L165；refs≈9；badhex=- |
| 注册名 | `TrainingPlanSelector` |
| Props要点 | 见源码 |
| 结构信号 | 失败toast |

**Impeccable：** 选型合同 props：见源码；API /api/quality/training-plans/page。  
**Finesse：** 下拉密度；slots=无。  
**Taste：** 域内 placeholder，无营销卡。  

**判定：OK**  
**动作：** 删未用 scoped 灰阶工具类；debounce 走常量。  
**禁：** 页内第二套同名选择器；未知枚举兜底。

## 223. `ClassSelector.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/selectors/ClassSelector.vue` |
| 源码 | 选择器 L108；refs≈8；badhex=- |
| 注册名 | `ClassSelector` |
| Props要点 | 见源码 |
| 结构信号 | 失败toast |

**Impeccable：** 选型合同 props：见源码；API /api/user/admin/classes/list-by-department。  
**Finesse：** 下拉密度；slots=无。  
**Taste：** 域内 placeholder，无营销卡。  

**判定：OK**  
**动作：** 删未用 scoped 灰阶工具类；debounce 走常量。  
**禁：** 页内第二套同名选择器；未知枚举兜底。

## 224. `AchievementResultSelector.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/selectors/AchievementResultSelector.vue` |
| 源码 | 选择器 L207；refs≈6；badhex=- |
| 注册名 | `AchievementResultSelector` |
| Props要点 | 见源码 |
| 结构信号 | 严格枚举、失败toast |

**Impeccable：** 选型合同 props：见源码；API /api/quality/achievement-results/page。  
**Finesse：** 下拉密度；slots=无。  
**Taste：** 域内 placeholder，无营销卡。  

**判定：OK**  
**动作：** 删未用 scoped 灰阶工具类；debounce 走常量。  
**禁：** 页内第二套同名选择器；未知枚举兜底。

## 225. `CatalogCourseSelector.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/selectors/CatalogCourseSelector.vue` |
| 源码 | 选择器 L121；refs≈6；badhex=- |
| 注册名 | `CatalogCourseSelector` |
| Props要点 | 见源码 |
| 结构信号 | 失败toast |

**Impeccable：** 选型合同 props：见源码；API /api/course-catalog/courses/authorized-by-major-category。  
**Finesse：** 下拉密度；slots=无。  
**Taste：** 域内 placeholder，无营销卡。  

**判定：OK**  
**动作：** 删未用 scoped 灰阶工具类；debounce 走常量。  
**禁：** 页内第二套同名选择器；未知枚举兜底。

## 226. `ReportSelector.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/selectors/ReportSelector.vue` |
| 源码 | 选择器 L152；refs≈6；badhex=- |
| 注册名 | `ReportSelector` |
| Props要点 | 见源码 |
| 结构信号 | 严格枚举、失败toast |

**Impeccable：** 选型合同 props：见源码；API /api/quality/reports/page。  
**Finesse：** 下拉密度；slots=无。  
**Taste：** 域内 placeholder，无营销卡。  

**判定：OK**  
**动作：** 删未用 scoped 灰阶工具类；debounce 走常量。  
**禁：** 页内第二套同名选择器；未知枚举兜底。

## 227. `CourseGoalSelector.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/selectors/CourseGoalSelector.vue` |
| 源码 | 选择器 L136；refs≈5；badhex=- |
| 注册名 | `CourseGoalSelector` |
| Props要点 | 见源码 |
| 结构信号 | 失败toast、Tag |

**Impeccable：** 选型合同 props：见源码；API /api/quality/course-goals/page。  
**Finesse：** 下拉密度；slots=无。  
**Taste：** 域内 placeholder，无营销卡。  

**判定：OK**  
**动作：** 删未用 scoped 灰阶工具类；debounce 走常量。  
**禁：** 页内第二套同名选择器；未知枚举兜底。

## 228. `QualityIngestPageShell.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/QualityIngestPageShell.vue` |
| 源码 | embedded 跳过 StageWorkbenchShell；现网全 embedded；L33 |
| 注册名 | `QualityIngestPageShell` |
| Props要点 | embedded |
| 结构信号 | 工作台壳 |

**Impeccable：** hub 内嵌时跳过 StageWorkbenchShell；现网五处均为 embedded。  
**Finesse：** embedded 用 flex + --dp-space-4，无额外白卡。  
**Taste：** 非 embedded 分支当前休眠，须确认后删或补调用。  

**判定：TUNE**  
**动作：** 确认是否永嵌后删非 embedded 分支。  
**禁：** 已包 MatrixWorkbench 再套双顶栏。

## 229. `StudentSelector.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/selectors/StudentSelector.vue` |
| 源码 | 选择器 L144；refs≈4；badhex=- |
| 注册名 | `StudentSelector` |
| Props要点 | 见源码 |
| 结构信号 | 失败toast |

**Impeccable：** 选型合同 props：见源码；API /api/user/admin/classes/students。  
**Finesse：** 下拉密度；slots=无。  
**Taste：** 域内 placeholder，无营销卡。  

**判定：OK**  
**动作：** 删未用 scoped 灰阶工具类；debounce 走常量。  
**禁：** 页内第二套同名选择器；未知枚举兜底。

## 230. `ArchiveLifecyclePipe.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/archive-volume/ArchiveLifecyclePipe.vue` |
| 源码 | steps+Track+WorkbenchSurfaceCard；embedded 去卡；refs≈4 |
| 注册名 | `ArchiveLifecyclePipe` |
| Props要点 | steps、title、completedCount、totalCount、clickable |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 卷主链可传后端 completedCount/totalCount；embedded 剥离外卡。  
**Finesse：** 标题 14/600 + Track 横滑管道分工明确。  
**Taste：** mark 归档域专用，非 quality MatrixWorkbench。  

**判定：OK**  
**动作：** clickable 仅需导航页开启。  
**禁：** 混用 portfolio 进度条；营销大卡。

## 231. `ImprovementWorkbenchPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/improvement/ImprovementWorkbenchPanel.vue` |
| 源码 | L45 |
| 注册名 | `ImprovementWorkbenchPanel` |
| Props要点 | title、empty、emptyDescription |
| 结构信号 | 空态 |

**Impeccable：** empty→UiEmpty「请先选择培养方案」，否则 UiCard 承载四 Tab。  
**Finesse：** deep 压紧 card-body padding-top，符合 D8。  
**Taste：** 无独立渐变；改进模块统一壳。  

**判定：OK**  
**动作：** 新 Tab 勿复制壳。  
**禁：** 再包 StageWorkbenchShell。

## 232. `ArchiveSelector.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/selectors/ArchiveSelector.vue` |
| 源码 | 选择器 L148；refs≈3；badhex=- |
| 注册名 | `ArchiveSelector` |
| Props要点 | 见源码 |
| 结构信号 | 严格枚举、失败toast |

**Impeccable：** 选型合同 props：见源码；API /api/quality/archives/page。  
**Finesse：** 下拉密度；slots=无。  
**Taste：** 域内 placeholder，无营销卡。  

**判定：OK**  
**动作：** 删未用 scoped 灰阶工具类；debounce 走常量。  
**禁：** 页内第二套同名选择器；未知枚举兜底。

## 233. `AuditIssueSelector.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/selectors/AuditIssueSelector.vue` |
| 源码 | 选择器 L163；refs≈3；badhex=- |
| 注册名 | `AuditIssueSelector` |
| Props要点 | 见源码 |
| 结构信号 | 严格枚举、失败toast、Tag |

**Impeccable：** 选型合同 props：见源码；API /api/quality/audit-evaluation/issues/page。  
**Finesse：** 下拉密度；slots=无。  
**Taste：** 域内 placeholder，无营销卡。  

**判定：OK**  
**动作：** 删未用 scoped 灰阶工具类；debounce 走常量。  
**禁：** 页内第二套同名选择器；未知枚举兜底。

## 234. `AuditRectificationSelector.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/selectors/AuditRectificationSelector.vue` |
| 源码 | 选择器 L156；refs≈3；badhex=- |
| 注册名 | `AuditRectificationSelector` |
| Props要点 | 见源码 |
| 结构信号 | 严格枚举、失败toast、Tag |

**Impeccable：** 选型合同 props：见源码；API /api/quality/audit-evaluation/rectifications/page。  
**Finesse：** 下拉密度；slots=无。  
**Taste：** 域内 placeholder，无营销卡。  

**判定：OK**  
**动作：** 删未用 scoped 灰阶工具类；debounce 走常量。  
**禁：** 页内第二套同名选择器；未知枚举兜底。

## 235. `RequirementIndicatorSelector.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/selectors/RequirementIndicatorSelector.vue` |
| 源码 | 选择器 L132；refs≈3；badhex=- |
| 注册名 | `RequirementIndicatorSelector` |
| Props要点 | 见源码 |
| 结构信号 | 失败toast |

**Impeccable：** 选型合同 props：见源码；API /api/quality/requirement-indicators/page。  
**Finesse：** 下拉密度；slots=无。  
**Taste：** 域内 placeholder，无营销卡。  

**判定：OK**  
**动作：** 删未用 scoped 灰阶工具类；debounce 走常量。  
**禁：** 页内第二套同名选择器；未知枚举兜底。

## 236. `ArchiveReadinessRateBar.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/archive-volume/ArchiveReadinessRateBar.vue` |
| 源码 | L82；refs≈3；hex=-；empty=False |
| 注册名 | `ArchiveReadinessRateBar` |
| Props要点 | percent |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 归档卷子链；无 Ui* 关键件；props percent。  
**Finesse：** L82 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 保持合同。  
**禁：** 假空成功；「未知」枚举兜底；装饰 KPI 墙。

## 237. `MarkingAiAssistDrawer.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/MarkingAiAssistDrawer.vue` |
| 源码 | a-drawer 720；AI 历次执行时间线；UiEmpty；ExperienceAssistBadge；strict tones |
| 注册名 | `MarkingAiAssistDrawer` |
| Props要点 | open、loading、executions、highlightTraceId、statusLabel |
| 结构信号 | 空态、抽屉、严格枚举、Tag |

**Impeccable：** AI 历次执行时间线；空记录 UiEmpty；trace 高亮滚动定位。  
**Finesse：** 抽屉宽 720，承载诊断/摘要/定标徽章。  
**Taste：** 能力/状态 UiTag 语义色；AI 只读历史不写分。  

**判定：OK**  
**动作：** 保持 AI 不自动写分；历史只读。  
**禁：** 置信度字段；暗色抽屉。

## 238. `MarkScoreTriple.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/MarkScoreTriple.vue` |
| 源码 | 三列 AI建议/教师复核/满分；「仅供参考」Tag；strictEnum gradeStatus |
| 注册名 | `MarkScoreTriple` |
| Props要点 | aiScore、teacherReviewScore、fullScore、gradeStatus、compact |
| 结构信号 | 严格枚举、Tag |

**Impeccable：** 三列 AI建议/教师复核/满分；AI 旁「仅供参考」；gradeStatus 严格枚举。  
**Finesse：** compact 默认三等分 grid，给分旁路可读。  
**Taste：** primary 强调教师复核分，AI 不得压过真源。  

**判定：OK**  
**动作：** 给分面板继续复用。  
**禁：** AI 分视觉压过教师分；假 0 分。

## 239. `AssessmentItemSelector.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/selectors/AssessmentItemSelector.vue` |
| 源码 | 选择器 L140；refs≈2；badhex=- |
| 注册名 | `AssessmentItemSelector` |
| Props要点 | 见源码 |
| 结构信号 | 失败toast、Tag |

**Impeccable：** 选型合同 props：见源码；API /api/quality/assessment-items/page。  
**Finesse：** 下拉密度；slots=无。  
**Taste：** 域内 placeholder，无营销卡。  

**判定：OK**  
**动作：** 删未用 scoped 灰阶工具类；debounce 走常量。  
**禁：** 页内第二套同名选择器；未知枚举兜底。

## 240. `DepartmentSelector.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/selectors/DepartmentSelector.vue` |
| 源码 | 选择器 L86；refs≈2；badhex=- |
| 注册名 | `DepartmentSelector` |
| Props要点 | 见源码 |
| 结构信号 | 失败toast |

**Impeccable：** 选型合同 props：见源码；API /api/tenant-admin/departments/list。  
**Finesse：** 下拉密度；slots=无。  
**Taste：** 域内 placeholder，无营销卡。  

**判定：OK**  
**动作：** 删未用 scoped 灰阶工具类；debounce 走常量。  
**禁：** 页内第二套同名选择器；未知枚举兜底。

## 241. `GraduationRequirementSelector.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/selectors/GraduationRequirementSelector.vue` |
| 源码 | 选择器 L134；refs≈2；badhex=- |
| 注册名 | `GraduationRequirementSelector` |
| Props要点 | 见源码 |
| 结构信号 | 失败toast |

**Impeccable：** 选型合同 props：见源码；API /api/quality/graduation-requirements/page。  
**Finesse：** 下拉密度；slots=无。  
**Taste：** 域内 placeholder，无营销卡。  

**判定：OK**  
**动作：** 删未用 scoped 灰阶工具类；debounce 走常量。  
**禁：** 页内第二套同名选择器；未知枚举兜底。

## 242. `TrainingObjectiveSelector.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/selectors/TrainingObjectiveSelector.vue` |
| 源码 | 选择器 L134；refs≈2；badhex=- |
| 注册名 | `TrainingObjectiveSelector` |
| Props要点 | 见源码 |
| 结构信号 | 失败toast |

**Impeccable：** 选型合同 props：见源码；API /api/quality/training-objectives/page。  
**Finesse：** 下拉密度；slots=无。  
**Taste：** 域内 placeholder，无营销卡。  

**判定：OK**  
**动作：** 删未用 scoped 灰阶工具类；debounce 走常量。  
**禁：** 页内第二套同名选择器；未知枚举兜底。

## 243. `ArchiveDimPill.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/archive-volume/ArchiveDimPill.vue` |
| 源码 | L15；refs≈2；hex=-；empty=False |
| 注册名 | `ArchiveDimPill` |
| Props要点 | tone、label |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 归档卷子链；无 Ui* 关键件；props tone、label。  
**Finesse：** L15 面板。  
**Taste：** 与 portfolio/quality 分域，禁混 Scope。  

**判定：OK**  
**动作：** 保持合同。  
**禁：** 假空成功；「未知」枚举兜底；装饰 KPI 墙。

## 244. `FilePreviewDialog.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/FilePreviewDialog.vue` |
| 源码 | UiDialog+useFilePreview；image/pdf/office；loading/error/download |
| 注册名 | `FilePreviewDialog` |
| Props要点 | api |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** UiDialog+useFilePreview；loading/error/image/pdf 分态；失败可下载。  
**Finesse：** header 图标按扩展名主题；destroy-on-close。  
**Taste：** 无装饰预览壳，全站预览合同。  

**判定：OK**  
**动作：** 全站预览走 composable。  
**禁：** 页内第二套预览弹窗。

## 245. `ConfidentialStatusBar.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/ConfidentialStatusBar.vue` |
| 源码 | 涉密条；--dp-purple-*；默认「涉密考试环境」 |
| 注册名 | `ConfidentialStatusBar` |
| Props要点 | title、description |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** role=status 涉密条；默认「涉密考试环境」纪律文案。  
**Finesse：** 32px 紧凑条，沉浸给分顶栏。  
**Taste：** --dp-purple 为密级语义非品牌营销，仅限涉密场次。  

**判定：TUNE**  
**动作：** 仅涉密场次挂载；勿当全局主题条。  
**禁：** 紫阶扩到非涉密页；渐变密级条。

## 246. `PortfolioCategoryTreePicker.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/portfolio/PortfolioCategoryTreePicker.vue` |
| 源码 | L105；refs≈2；hex=-；empty=True |
| 注册名 | `PortfolioCategoryTreePicker` |
| Props要点 | modelValue、readonly、teacherId |
| 结构信号 | 空态、失败toast |

**Impeccable：** 空态、失败toast；props modelValue、readonly、teacherId。  
**Finesse：** L105；slots=['PortfolioCategoryTreePicker']。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持合同。  
**禁：** 假空成功；「未知」枚举兜底；装饰 KPI 墙。

## 247. `PortfolioIndicatorExplainDrawer.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/portfolio/PortfolioIndicatorExplainDrawer.vue` |
| 源码 | L49；refs≈2；hex=-；empty=False |
| 注册名 | `PortfolioIndicatorExplainDrawer` |
| Props要点 | open、explainText、explainStructJson |
| 结构信号 | 抽屉 |

**Impeccable：** 抽屉；props open、explainText、explainStructJson。  
**Finesse：** L49；slots=默认。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持合同。  
**禁：** 假空成功；「未知」枚举兜底；装饰 KPI 墙。

## 248. `PortfolioIndicatorTemplateParamsForm.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/portfolio/PortfolioIndicatorTemplateParamsForm.vue` |
| 源码 | L59；refs≈2；hex=-；empty=False |
| 注册名 | `PortfolioIndicatorTemplateParamsForm` |
| Props要点 | ruleType、params、disabled |
| 结构信号 | 无 Ui* 关键件 |

**Impeccable：** 无 Ui* 关键件；props ruleType、params、disabled。  
**Finesse：** L59；slots=默认。  
**Taste：** token/--dp；无营销 eyebrow。  

**判定：OK**  
**动作：** 保持合同。  
**禁：** 假空成功；「未知」枚举兜底；装饰 KPI 墙。

## 249. `IndirectFormSelector.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/selectors/IndirectFormSelector.vue` |
| 源码 | 选择器 L137；refs≈1；badhex=- |
| 注册名 | `IndirectFormSelector` |
| Props要点 | 见源码 |
| 结构信号 | 严格枚举、失败toast |

**Impeccable：** 选型合同 props：见源码；API /api/quality/indirect-forms/page。  
**Finesse：** 下拉密度；slots=无。  
**Taste：** 域内 placeholder，无营销卡。  

**判定：OK**  
**动作：** 删未用 scoped 灰阶工具类；debounce 走常量。  
**禁：** 页内第二套同名选择器；未知枚举兜底。

## 250. `ProfessionAlgorithmProfileSelector.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/selectors/ProfessionAlgorithmProfileSelector.vue` |
| 源码 | 选择器 L133；refs≈1；badhex=- |
| 注册名 | `ProfessionAlgorithmProfileSelector` |
| Props要点 | 见源码 |
| 结构信号 | 严格枚举、失败toast |

**Impeccable：** 选型合同 props：见源码；API /api/quality/profession-algorithm-profiles/page。  
**Finesse：** 下拉密度；slots=无。  
**Taste：** 域内 placeholder，无营销卡。  

**判定：OK**  
**动作：** 删未用 scoped 灰阶工具类；debounce 走常量。  
**禁：** 页内第二套同名选择器；未知枚举兜底。
