# 组件手审账 · Batch 06（旅程轨 / 就绪面板 / 状态与分页 / OBE 条 / 扫描运营）

> 逐文件 Read · Impeccable · Finesse · Taste · frontend-design-mark  
> 禁脚本生成结论 · 2026-07-16

## 46. `StageRail.vue`

| 项 | 事实 |
|----|------|
| variant | `arrow` → UiArrowTimeline；默认 `panel` 白底分段 |
| 状态 | completed/active/warning/error\|blocked/pending；可选 progress |
| Token | 主色走 `--dp`；数字区有 `ant-color-white` |

**Impeccable：** `aria-label` / `aria-current`；pending 默认可禁选。  
**Finesse：** 旅程轨密度正确；compact 合工作台。  
**Taste：** 无英文 eyebrow；非营销时间轴。  

**判定：OK**  
**动作：** 考试/档案袋继续经域包装抛类型化键；勿在页内自造第二套阶段条。  
**禁：** 阶段条上挂 KPI 数字墙。

---

## 47. `ExamJourneyRail.vue`

| 项 | 事实 |
|----|------|
| 实现 | 包 `StageRail` arrow+compact+allowPendingSelect |
| 语义 | `isExamWorkspaceJourneyKey`；非法键 throw；过滤 overview |

**Impeccable：** 未知旅程键显式失败，正确。  
**Finesse：** 薄适配但持有域键门禁——非空壳转发。  
**Taste：** 表面 token 干净。  

**判定：OK**  
**动作：** 保持；勿再包一层 ExamJourneyRailWrapper。  
**禁：** 静默吞未知 key。

---

## 48. `PortfolioTeacherJourneyRail.vue`

| 项 | 事实 |
|----|------|
| 结构 | 与 ExamJourneyRail 同构；`isPortfolioTeacherJourneyKey` |

**判定：OK**  
**动作：** 与考试轨分域常量；勿合并成无类型通用壳。  
**禁：** 档案袋页复用 ExamJourneyRail。

---

## 49. `WorkflowReadinessPanel.vue`

| 项 | 事实 |
|----|------|
| UI | title + 可选 metrics 文案 + 步骤列表；pending 可「前往」 |
| Import | `@/components/ui-guide/ui/Button.vue`（双轨之一） |

**Impeccable：** 就绪缺口可行动；completed 降不透明度。  
**Finesse：** 紧凑列表，非全宽 Alert。  
**Taste：** metrics 为文案非彩点卡——OK。  

**判定：OK**  
**动作：** 步骤状态来自后端合同；import 随 Button 合并一并收敛。  
**禁：** 改成粉黄大框门禁。

---

## 50. `UiStateBlock.vue`

| 项 | 事实 |
|----|------|
| 默认 | `compact: true`（注释：笔记本优先，避大框占屏） |
| state | empty/loading/success/warning/error/info |

**Impeccable：** 失败/空/加载可分；actions 槽清晰。  
**Finesse：** 默认 compact 对齐「拒大框门禁」。  
**Taste：** 默认文案偏泛，调用方应覆盖业务句。  

**判定：OK**  
**动作：** 工作台优先 compact；全页态显式 `compact=false`。  
**禁：** 用 StateBlock 替代 Scope 内联状态做培养方案门禁。

---

## 51. `UiPagination.vue`

| 项 | 事实 |
|----|------|
| 合同 | `current`/`pageSize` defineModel；`共 N 条` |
| 默认 | showSizeChanger + showTotal |

**判定：OK**  
**动作：** 列表页统一本原语；页码跟后端分页。  
**禁：** 前端假全量再本地翻页。

---

## 52. `QualityObeJourneyStrip.vue`

| 项 | 事实 |
|----|------|
| 注释 | 32px、低饱和、无 KPI 数字 |
| 门禁 | 未确认方案 → warning + 跳转方案工作台 |
| Token | `ant-color-*` 与 `--dp-text-secondary` 混用 |

**Impeccable：** 达成度/报告路由有方案确认门；pending 禁用。  
**Finesse：** 条带形态正确，非卡片墙。  
**Taste：** TUNE——底栏改 `--dp-surface` / `--dp-border`，少用 ant 容器色。  

**判定：OK / token TUNE**  
**动作：** token 对齐 dp；保持无 KPI。  
**禁：** 步骤旁加达成百分比装饰。

---

## 53. `ScanOpsWorkbench.vue`

| 项 | 事实 |
|----|------|
| 壳 | StageWorkbenchShell + ContextBar + SignalBand `panel` |
| 域 | exam / archive / portfolio 分 Tab 集 |
| 失败 | overviewLoadFailed 可见 |

**Impeccable：** 域 Tab 裁剪正确；失败不装空。  
**Finesse：** 运营工作台密度合适。  
**Taste：** SignalBand 用 panel——符合 Batch 02 约束。  

**判定：OK**  
**动作：** 指标须可下钻到 exception/dispatch。  
**禁：** 改 tiles 彩点阵列。

---

## 54. `ScanOpsPanel.vue`

| 项 | 事实 |
|----|------|
| 内容 | 运营体检 SignalBand + 院系耗时表 |
| Import | `Button.vue`（非 UiButton.vue） |

**Impeccable：** loadFailed + AlertStrip；混扫可跳队列。  
**Finesse：** 表 + 信号带，operate 正确。  
**Taste：** 失败率/混扫率 tone 语义化——OK。  

**判定：OK**  
**动作：** 随 Button 双轨合并改 import。  
**禁：** 无下钻的装饰 KPI。

---

## 55. `ScanExceptionPanel.vue`

| 项 | 事实 |
|----|------|
| 职责 | 异常仪表盘表；exam vs dispatch 种类过滤分叉 |
| Import | `UiButton.vue`（与 OpsPanel 分叉） |
| 动作 | 重试登记 / 取消派单 / 强制释放等 |

**Impeccable：** emptyKind / loadError 合同完整。  
**Finesse：** 行内动作收敛在状态允许范围。  
**Taste：** OK；双 Button 路径再次证明 REWORK。  

**判定：OK**  
**动作：** 与 ScanOpsPanel 统一 Button 入口。  
**禁：** 异常表外包说明大卡墙。

---

## Batch 06 汇总

| 组件 | 判定 |
|------|------|
| StageRail | OK |
| ExamJourneyRail | OK |
| PortfolioTeacherJourneyRail | OK |
| WorkflowReadinessPanel | OK |
| UiStateBlock | OK |
| UiPagination | OK |
| QualityObeJourneyStrip | OK / token TUNE |
| ScanOpsWorkbench | OK |
| ScanOpsPanel | OK |
| ScanExceptionPanel | OK |

累计手审约 **55**。  
交叉债：`Button.vue` / `UiButton.vue` 双轨在本批多处复现（Readiness / Ops / Exception）。

## 下一批

`ScanDispatchPanel` · `ScanOperationLogPanel` · `UiArrowTimeline` · `UiSectionTabs` · `FilterBar` · `UiFilterBar` · `InfoGrid` · `PendingTodoFeed` · `MarkExamSelect`
