# 考试工作台 UI/UX 逐页渲染审查

> examId=207 | 生成时间 2026-06-22T06:31:15.901Z

## 旅程轨点击流（1440）

| 点击步骤 | 落地 URL | 高亮旅程 | 侧栏项数 |
|---|---|---|---|
| 创建与准备 | /teacher/exam-workspace/207/prep | 创建与准备 | 6 |
| 扫描识别 | /teacher/exam-workspace/207/scan/monitor | 扫描识别 | 5 |
| 阅卷安排 | /teacher/exam-workspace/207/marking-org | 阅卷安排 | 2 |
| 批阅 | /teacher/exam-workspace/207/marking/task-pool | 批阅 | 8 |
| 成绩发布 | /teacher/exam-workspace/207/score/summary | 成绩发布 | 4 |
| 归档 | /teacher/exam-workspace/207/archive/package | 归档 | 4 |

## 逐页指标（1440）

### 考试概览 (`overview`)
- 原型：阶段工作台 | 旅程：overview
- 轨/侧栏/横幅：true/true/true
- 建议横幅：建议优先处理「模板制卷」：制卷与模板前往建议阶段
- 布局：侧栏 259px | 主区 1180px | 水平溢出 false
- 侧栏 1 项，子组 考试概览 · 考试准备已就绪
- 主内容：表 2 | 空态 false | 主按钮 前往建议阶段、试卷模板
- 截图：screenshots/1440__overview.png

### 准备工作台 (`prep`)
- 原型：阶段工作台 | 旅程：prep
- 轨/侧栏/横幅：true/true/true
- 建议横幅：建议优先处理「模板制卷」：制卷与模板前往建议阶段
- 布局：侧栏 259px | 主区 1180px | 水平溢出 false
- 侧栏 6 项，子组 准备项进度 · 考试准备已就绪
- 主内容：表 0 | 空态 false | 主按钮 前往建议阶段、开始扫描录入
- 截图：screenshots/1440__prep.png

### 试卷题目 (`paper-template`)
- 原型：阶段工作台 | 旅程：prep
- 轨/侧栏/横幅：true/true/false
- 布局：侧栏 259px | 主区 1180px | 水平溢出 false
- 侧栏 6 项，子组 准备项进度 · 考试准备已就绪
- 主内容：表 6 | 空态 false | 主按钮 保存、新增题目
- 截图：screenshots/1440__paper-template.png

### 答卷页模板 (`paper-template/answer-sheet`)
- 原型：阶段工作台 | 旅程：prep
- 轨/侧栏/横幅：true/true/false
- 布局：侧栏 259px | 主区 1180px | 水平溢出 false
- 侧栏 6 项，子组 准备项进度 · 考试准备已就绪
- 主内容：表 3 | 空态 false | 主按钮 生成标准答题卡、保存
- 截图：screenshots/1440__paper-template_answer-sheet.png

### 考生名册 (`candidate-roster`)
- 原型：阶段工作台 | 旅程：prep
- 轨/侧栏/横幅：true/true/true
- 建议横幅：建议优先处理「模板制卷」：制卷与模板前往建议阶段
- 布局：侧栏 259px | 主区 1180px | 水平溢出 false
- 侧栏 6 项，子组 准备项进度 · 考试准备已就绪
- 主内容：表 3 | 空态 false | 主按钮 前往建议阶段、查询
- 截图：screenshots/1440__candidate-roster.png

### 录入与批次 (`scan/batches`)
- 原型：阶段工作台 | 旅程：scan
- 轨/侧栏/横幅：true/true/true
- 建议横幅：建议优先处理「模板制卷」：制卷与模板前往建议阶段
- 布局：侧栏 259px | 主区 1180px | 水平溢出 false
- 侧栏 5 项，子组 扫描识别 · 1 条异常待处理
- 主内容：表 9 | 空态 true | 主按钮 前往建议阶段、提交人工补录、重试、创建扫描批次
- 截图：screenshots/1440__scan_batches.png

### 扫描监控 (`scan/monitor`)
- 原型：阶段工作台 | 旅程：scan
- 轨/侧栏/横幅：true/true/true
- 建议横幅：建议优先处理「模板制卷」：制卷与模板前往建议阶段
- 布局：侧栏 259px | 主区 1180px | 水平溢出 false
- 侧栏 5 项，子组 扫描识别 · 1 条异常待处理
- 主内容：表 3 | 空态 true | 主按钮 前往建议阶段、查看异常、刷新
- 截图：screenshots/1440__scan_monitor.png

### 影像账本 (`scan/ledger`)
- 原型：阶段工作台 | 旅程：scan
- 轨/侧栏/横幅：true/true/true
- 建议横幅：建议优先处理「模板制卷」：制卷与模板前往建议阶段
- 布局：侧栏 259px | 主区 1180px | 水平溢出 false
- 侧栏 5 项，子组 扫描识别 · 1 条异常待处理
- 主内容：表 3 | 空态 true | 主按钮 前往建议阶段、执行整体对账
- 截图：screenshots/1440__scan_ledger.png

### 阅卷安排 (`marking-org`)
- 原型：管理详情 | 旅程：assign
- 轨/侧栏/横幅：true/true/true
- 建议横幅：建议优先处理「模板制卷」：制卷与模板前往建议阶段
- 布局：侧栏 259px | 主区 1180px | 水平溢出 false
- 侧栏 2 项，子组 阅卷安排 · 请配置题组与教师
- 主内容：表 1 | 空态 false | 主按钮 前往建议阶段、进入详情、查看题组与策略
- 截图：screenshots/1440__marking-org.png

### 试评任务池 (`trial/task-pool`)
- 原型：阶段工作台 | 旅程：mark
- 轨/侧栏/横幅：true/true/true
- 建议横幅：建议优先处理「模板制卷」：制卷与模板前往建议阶段
- 布局：侧栏 259px | 主区 1180px | 水平溢出 false
- 侧栏 8 项，子组 试评 · 试评校准 / 正评 · 1 份待批 / 进行中 / 质控 · 1 份待批 / 进行中
- 主内容：表 3 | 空态 true | 主按钮 前往建议阶段、查询
- 截图：screenshots/1440__trial_task-pool.png

### 阅卷任务池 (`marking/task-pool`)
- 原型：阶段工作台 | 旅程：mark
- 轨/侧栏/横幅：true/true/true
- 建议横幅：建议优先处理「模板制卷」：制卷与模板前往建议阶段
- 布局：侧栏 259px | 主区 1180px | 水平溢出 false
- 侧栏 8 项，子组 试评 · 试评校准 / 正评 · 1 份待批 / 进行中 / 质控 · 1 份待批 / 进行中
- 主内容：表 3 | 空态 true | 主按钮 前往建议阶段、查询
- 截图：screenshots/1440__marking_task-pool.png

### 批量复核确认 (`marking/review-batch`)
- 原型：阶段工作台 | 旅程：mark
- 轨/侧栏/横幅：true/true/true
- 建议横幅：建议优先处理「模板制卷」：制卷与模板前往建议阶段
- 布局：侧栏 259px | 主区 1180px | 水平溢出 false
- 侧栏 8 项，子组 试评 · 试评校准 / 正评 · 1 份待批 / 进行中 / 质控 · 1 份待批 / 进行中
- 主内容：表 0 | 空态 false | 主按钮 前往建议阶段、批量确认选中、重试
- 截图：screenshots/1440__marking_review-batch.png

### OCR/AI 复核 (`marking/review`)
- 原型：阶段工作台 | 旅程：mark
- 轨/侧栏/横幅：true/true/true
- 建议横幅：建议优先处理「模板制卷」：制卷与模板前往建议阶段
- 布局：侧栏 259px | 主区 1180px | 水平溢出 false
- 侧栏 8 项，子组 试评 · 试评校准 / 正评 · 1 份待批 / 进行中 / 质控 · 1 份待批 / 进行中
- 主内容：表 0 | 空态 false | 主按钮 前往建议阶段、重试
- 截图：screenshots/1440__marking_review.png

### 仲裁裁定 (`marking/arbitration`)
- 原型：阶段工作台 | 旅程：mark
- 轨/侧栏/横幅：true/true/true
- 建议横幅：建议优先处理「模板制卷」：制卷与模板前往建议阶段
- 布局：侧栏 259px | 主区 1180px | 水平溢出 false
- 侧栏 8 项，子组 试评 · 试评校准 / 正评 · 1 份待批 / 进行中 / 质控 · 1 份待批 / 进行中
- 主内容：表 6 | 空态 true | 主按钮 前往建议阶段
- 截图：screenshots/1440__marking_arbitration.png

### 抽检处理 (`marking/quality`)
- 原型：阶段工作台 | 旅程：mark
- 轨/侧栏/横幅：true/true/true
- 建议横幅：建议优先处理「模板制卷」：制卷与模板前往建议阶段
- 布局：侧栏 259px | 主区 1180px | 水平溢出 false
- 侧栏 8 项，子组 试评 · 试评校准 / 正评 · 1 份待批 / 进行中 / 质控 · 1 份待批 / 进行中
- 主内容：表 3 | 空态 true | 主按钮 前往建议阶段
- 截图：screenshots/1440__marking_quality.png

### 成绩确认 (`score/summary`)
- 原型：阶段工作台 | 旅程：publish
- 轨/侧栏/横幅：true/true/true
- 建议横幅：建议优先处理「模板制卷」：制卷与模板前往建议阶段
- 布局：侧栏 259px | 主区 1180px | 水平溢出 false
- 侧栏 4 项，子组 成绩发布 · 1 题待确认成绩
- 主内容：表 3 | 空态 false | 主按钮 前往建议阶段、查询
- 截图：screenshots/1440__score_summary.png

### 成绩发布 (`score/release`)
- 原型：阶段工作台 | 旅程：publish
- 轨/侧栏/横幅：true/true/true
- 建议横幅：建议优先处理「模板制卷」：制卷与模板前往建议阶段
- 布局：侧栏 259px | 主区 1180px | 水平溢出 false
- 侧栏 4 项，子组 成绩发布 · 1 题待确认成绩
- 主内容：表 3 | 空态 false | 主按钮 前往建议阶段、查询、发布
- 截图：screenshots/1440__score_release.png

### 归档列表 (`archive/package`)
- 原型：阶段工作台 | 旅程：archive
- 轨/侧栏/横幅：true/true/true
- 建议横幅：建议优先处理「模板制卷」：制卷与模板前往建议阶段
- 布局：侧栏 259px | 主区 1180px | 水平溢出 false
- 侧栏 4 项，子组 归档 · 归档 / 质量评价
- 主内容：表 3 | 空态 true | 主按钮 前往建议阶段、新建电子归档包、查询
- 截图：screenshots/1440__archive_package.png

### 批阅沉浸 (`marking/task/1`)
- 原型：批阅沉浸 | 旅程：mark
- 轨/侧栏/横幅：false/false/true
- 建议横幅：建议优先处理「模板制卷」：制卷与模板前往建议阶段
- 布局：侧栏 0px | 主区 1440px | 水平溢出 false
- 侧栏 0 项
- 主内容：表 1 | 空态 true | 主按钮 前往建议阶段
- 截图：screenshots/1440__marking_task_1.png
