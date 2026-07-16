# 组件手审账 · Batch 25（补漏）

> 方法：逐文件 Read · 三 Skill · frontend-design-mark  
> INDEX 真源：`batch=BATCH_25` 仅 **1 路径**；另 2 条为 INDEX 它批交叉索引。  
> Date: 2026-07-16（深审）

---

## 525. `TableHead.vue`（INDEX `BATCH_25`）

| 项 | 事实 |
|----|------|
| 路径 | `components/ui-guide/ui/TableHead.vue` |
| 行数 | 10 |
| 注册名 | `UiTableHead` |
| 结构 | `<th class="ui-table__head"><slot/></th>` 透传 `$attrs` |
| 调用 | **0** 业务引用（Table 族 DEAD? 链，见 BATCH_10/11） |

**Impeccable：** 无消费者 th 包装，不参与 `UiDataTable` 主链。  
**Finesse：** 10 行纯 slot 透传，**零语义增量**。  
**Taste：** 中性；存在即 Table 族碎片债。  

**判定：SHELL**  
**动作：** 随 Table/TableBody/TableCell 族一并删除；业务统一 `UiDataTable`。  
**禁：** 为新页再引 TableHead 壳。

---

## 526. `Tag.vue` / `UiTag`（INDEX 交叉 · `FORCE` / BATCH_05）

| 项 | 事实 |
|----|------|
| 路径 | `components/ui-guide/ui/Tag.vue`（`defineOptions({ name: 'UiTag' })`） |
| INDEX | `#17 Tag.vue · OK`；`#436 UiTag.vue · OK`（同文件双索引项） |
| 结论源 | BATCH_05 已审：tone/variant 合同完整，`--dp-*` 色阶 |

**Impeccable：** 业务枚举 tone 映射唯一入口。  
**Finesse：** 密度合格。  
**Taste：** 禁页内硬编码色 Tag。  

**判定：OK**（不重复开案）  
**动作：** 保持；新枚举同步 tone map。  
**禁：** 页面 `span` 假 Tag。

---

## 527. `CreateFormPageShell.vue`（INDEX 交叉 · `FORCE`）

| 项 | 事实 |
|----|------|
| 路径 | `components/create-form/CreateFormPageShell.vue` |
| INDEX | `#211 · OK` |
| 结构 | 侧栏 `UiSidebarNav` + 主区表单 slot；创建流向导壳 |

**Impeccable：** 向导步骤与内容区分离清楚。  
**Finesse：** 创建流密度合适，**非** `StageWorkbenchShell`。  
**Taste：** 无营销 KPI hero。  

**判定：OK**（不重复开案）  
**动作：** 仅用于创建流；工作台勿套用。  
**禁：** 与考试 `ContextBar` 双顶栏。

---

## Batch 25 小结

| 判定 | 数量 | 说明 |
|------|-----:|------|
| SHELL | 1 | `TableHead.vue`（本批唯一 INDEX `BATCH_25`） |
| OK | 2 | Tag / CreateFormPageShell — INDEX 它批已审，此处交叉索引 |
