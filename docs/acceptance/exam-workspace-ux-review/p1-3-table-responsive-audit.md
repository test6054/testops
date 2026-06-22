# P1-3 考试工作台表格 768px 响应审查

> 实现层：`UiDataTable` + `data-table.ts` 统一断点过滤（默认 `responsiveColumns=true`）  
> 断点：`md=768px` 隐藏低优先级列；`lg=992px` 预留 `hideBelow: 'lg'`  
> 操作列：`<768px` 时 `operations-cell` 纵向堆叠，触控目标 ≥44px

## 统一机制

| 能力 | 说明 |
|------|------|
| `meta.hideBelow` | 列级显式标注 `'md' \| 'lg'` |
| `withHideBelowMd()` / `withHideBelowLg()` | 列定义 helper |
| `inferDataTableColumnHideBelow()` | 未标注列按 key/title 推断 |
| `responsiveColumns={false}` | 关闭自动响应（特殊宽表保留） |

**始终保留（推断不隐藏）**：`actions`、`status`、`paperDisplay`、`question`、`batchNo`、`archiveNo`、`aiScore`、`finalScore` 等主识别/状态列。

---

## 逐页审查（19 路由）

图例：✅ 推断覆盖 · 📝 建议显式 `hideBelow` · ⏭ 无表格/沉浸 · ⚠️ 需关 `responsiveColumns`

| 路由 | 页面文件 | 768 策略 | 保留列（≤768） | 隐藏列（≤768） |
|------|----------|----------|----------------|----------------|
| overview | `exam-detail.vue` | ⏭ | — | 无 `UiDataTable` |
| prep | `exam-prep-workbench.vue` | ⏭ | — | 无表格 |
| paper-template | `paper-template.vue` | ✅ | 题号/题型/分值/操作 | 创建时间、排序、诊断类 |
| answer-sheet | `answer-sheet-template.vue` | ✅ | 区域/题型/操作 | 次要配置列 |
| candidate-roster | `candidate-roster.vue` | ✅ | 考生、操作 | 班级 |
| scan/batches | `scan-upload.vue` | ✅+📝 | 批次号、状态、操作 | 扫描时间窗、事件/文件数、落库进度、异常；设备表隐藏工位/IP/诊断 |
| scan/monitor | `scan-live-monitor.vue` | ✅ | 状态、答卷/批次、操作 | 工位、设备 ID、文件数、扫描时间；异常表隐藏来源/批次/说明/更新时间 |
| scan/ledger | `image-ledger/*` | ✅ | 重复影像状态、处置 | 账本 KPI 区非表格；重复表全推断 |
| marking-org | `admin/marking-organization/index.vue` | ✅ | 组织/状态/操作 | 创建时间、统计次要列 |
| trial/task-pool | `marking-task-pool.vue` | ✅ | 题目、答卷、状态、给分、操作 | 匿名、题组、会话、轮次、教师、分配/提交时间 |
| marking/task-pool | 同上 | ✅ | 同上 | 同上 |
| marking/review-batch | `review-batch-confirm.vue` | ✅ | 答卷、题号、确认得分 | 来源、AI 建议分（可选 lg 保留） |
| marking/review | `review-task-hub.vue` | ✅ | 待复核摘要列 | 时间/来源次要列 |
| marking/arbitration | `review-arbitration.vue` | ✅ | 答卷、题号、AI 评分、操作 | 满分、指派教师、更新时间；仲裁任务表隐藏轮次/分配时间 |
| marking/quality | `marking-spot-check.vue` | ✅ | 考试、题目、原分、状态、操作 | 分派时间 |
| score/summary | `score-finalize.vue` | ✅ | 答卷、总成绩/状态、操作 | 班级、考试分/日常分、偏差、确认时间 |
| score/release | `score-publish.vue` | ✅ | 同上 | 同上 |
| archive/package | `archive/archive-list.vue` | ✅ | 归档编号、状态、操作 | 所属考试、保管期限、大小、清单数、创建时间 |
| marking/task/:id | `marking-task-detail.vue` | ⏭ | — | P0-2 已桌面门禁 |

### 768 视口矩阵（审查后预期）

| 页面 | 768 预期 |
|------|----------|
| overview / prep | ⚠️ 可用（无宽表） |
| paper-template | ⚠️ 可横向滚动，次要列已隐藏 |
| scan/batches | ✅ 主批次列 + 操作堆叠 |
| scan/monitor | ✅ |
| marking/task-pool | ✅ |
| marking/review-batch | ✅ |
| marking/arbitration | ✅ |
| archive/package | ✅ |
| marking/task/1 | ❌ 桌面引导（P0-2） |

---

## 后续显式标注（可选）

推断已覆盖主链；若某页需 **lg 保留、md 隐藏**，在列定义使用 `withHideBelowMd()`：

- `review-batch-confirm.vue`：`gradeSource`
- `marking-task-pool.vue`：`groupName`、`session`、`reviewRound`
- `scan-upload.vue`：`scanWindow`、`eventCount`、`fileCount`

关闭自动响应的候选：`paper-template.vue` 内极宽编辑表（若产品要求全列可见）。

---

## 验证

```bash
pnpm --dir edu-practice-mark-vue exec eslint \
  src/components/ui-guide/ui/data-table.ts \
  src/components/ui-guide/ui/UiDataTable.vue
```

浏览器：DevTools 768px 抽检 scan/batches、task-pool、review-batch、archive/package 操作列触控高度。
