# 组件手审账 · Batch 08（Wave A · Alert/Descriptions/Dialog/Empty）

> 逐文件 Read · 三 Skill · frontend-design-mark · 2026-07-16

## 68. `AlertTitle.vue`

| 项 | 事实 |
|----|------|
| 引用 | 0 |
| 形态 | slot div；`--ant-color-text` |

**判定：DEAD?**  
**动作：** 删除；标题内聚于 Alert。  
**禁：** 零引用 compat 壳。

---

## 69. `Descriptions.vue`

| 项 | 事实 |
|----|------|
| 引用 | 0 |
| Token | `--dp-*` 皮肤完整但未消费 |

**判定：DEAD?**  
**动作：** 接入详情页或删除。  
**禁：** 有皮肤无引用双轨长期留。

---

## 70. `DescriptionsItem.vue`

| 项 | 事实 |
|----|------|
| 引用 | 0 |
| 形态 | 纯转发 `a-descriptions-item` |

**判定：SHELL**（兼 DEAD?）  
**动作：** 随 Descriptions 删除或直用 ant。  
**禁：** 单行 ant 转发 wrapper。

---

## 71–76. Dialog 拆件幽灵项

清单含 `Dialog.vue` / `DialogContent|Footer|Header|Title|Description.vue` — **源码目录不存在**；逻辑已内聚 [`UiDialog.vue`](../../src/components/ui-guide/ui/UiDialog.vue)。

**判定：DEAD?**（清单幽灵）  
**动作：** INDEX 标 DEAD?；勿重建 shadcn 拆件链。  
**禁：** 为分层好看拆 passthrough 子件。

---

## 77. `UiDialog.vue`

| 项 | 事实 |
|----|------|
| 引用 | 24+ |
| 遮罩 | `rgba(15,23,42,0.4)` |

**Impeccable：** 单文件收敛正确。  
**Finesse：** 工作台弹窗密度合格。  
**Taste：** 无英文眉。  

**判定：OK**（遮罩 TUNE）  
**动作：** 遮罩→`--dp-mask`。  
**禁：** 再引入 Dialog 多文件转发链。

---

## 78. `Empty.vue`（与 Batch 04 UiEmpty 合同同源）

| 项 | 事实 |
|----|------|
| 引用 | 120+；另有 `UiEmpty.vue` 双副本误引 |
| Token | `--ant-*` 混用 |

**判定：TUNE**  
**动作：** 统一路径删双副本；色→`--dp-*`。  
**禁：** 双文件名 compat；大插画默认开。

---

## 79. `UiEllipsisText.vue`

| 项 | 事实 |
|----|------|
| 引用 | 5（扫描/组织表） |
| 违例 | tooltip 暗色硬编码 `#f8fafc` / slate |

**判定：TUNE**  
**动作：** tooltip 改浅色 `--dp-*` overlay。  
**禁：** 暗色浮层混入浅色工作台。

---

## Batch 08 汇总

DEAD?/SHELL 清理优先；UiDialog OK；Empty/EllipsisText TUNE。
