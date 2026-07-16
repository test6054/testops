# 组件手审账 · Batch 25（补漏）

> 三 Skill · 2026-07-16

## 525. `TableHead.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/ui-guide/ui/TableHead.vue` |
| 源码 | 见 Batch 11：SHELL + DEAD? |

**Impeccable：** 无消费者 th 壳。  
**Finesse：** 无增量。  
**Taste：** 中性。  

**判定：SHELL**  
**动作：** 随 Table 族删除（同 Batch 11）。  
**禁：** 与 UiDataTable 并行。

## 526. `UiTag.vue` / `Tag.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/ui-guide/ui/Tag.vue`（组件名 UiTag） |
| 源码 | 见 Batch 05：OK |

**Impeccable：** tone/variant 合同完整。  
**Finesse：** 密度合格。  
**Taste：** --dp 色阶。  

**判定：OK**  
**动作：** 保持；INDEX 对齐 Tag.vue。  
**禁：** 页内硬编码色 Tag。

## 527. `CreateFormPageShell.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/create-form/CreateFormPageShell.vue` |
| 源码 | 创建流页壳；侧栏 UiSidebarNav + 主区表单 |

**Impeccable：** 向导步骤与内容区分离清楚。  
**Finesse：** 创建流密度合适，非工作台 StageShell。  
**Taste：** 无营销 KPI。  

**判定：OK**  
**动作：** 仅用于创建流；工作台勿套用。  
**禁：** 与 StageWorkbenchShell 双顶栏。
