# 组件手审账 · Batch 07（Wave A · Filter/骨架/选择/卡片/时间轴）

> 逐文件 Read · Impeccable product · Finesse product · Taste audit-only · frontend-design-mark  
> Design Read：product workbench · Taste 3/2/8 · Finesse S2/D8 · 禁脚本结论  
> 2026-07-16

## 56. `FilterBar.vue`（UiFilterBar）

| 项 | 事实 |
|----|------|
| 引用 | ~81 列表页 |
| Token | 壳 `--dp-*`；label fallback `#6b7280` |

**Impeccable：** 三域筛选事实标准。  
**Finesse：** 字段宽/高密度统一。  
**Taste：** 无营销 eyebrow。  

**判定：OK**  
**动作：** label fallback → `--dp-text-secondary`。  
**禁：** 拆成 passthrough 壳；第二品牌蓝。

---

## 57. `UiSkeletonState.vue`

| 项 | 事实 |
|----|------|
| 引用 | ~66 |
| Hex | shimmer `#f1f5f9`/`#e2e8f0`；有 reduced-motion |

**判定：TUNE**  
**动作：** shimmer → `--dp-gray-100/200`。  
**禁：** 加重阴影营销骨架。

---

## 58. `UiSelect.vue`

| 项 | 事实 |
|----|------|
| 引用 | ~15 |
| Hex | 多选 tag `#d6e8ff`；dropdown 阴影偏重 |

**判定：TUNE**  
**动作：** tag → `--dp-blue-50/200`。  
**禁：** 与 SelectArco/Select 再扩双轨。

---

## 59. `Badge.vue`（UiBadge）

| 项 | 事实 |
|----|------|
| 引用 | ~19（多 kit 内） |
| Tone | `--dp-blue-*` |

**判定：OK**  
**动作：** 保持；页勿私写 badge 色板。  
**禁：** 平行色板。

---

## 60. `UiActionLink.vue`

| 项 | 事实 |
|----|------|
| 引用 | 10（kit 内） |
| 主色 | `#1677ff` 合规 |

**判定：OK**  
**动作：** 保持。  
**禁：** 页内 `text-blue-600` 绕开。

---

## 61. `UiEntityCard.vue`

| 项 | 事实 |
|----|------|
| 引用 | 3（kit 卡壳） |
| 违例 | `#2563eb`；uppercase eyebrow；selected 重阴影 |

**判定：TUNE**  
**动作：** accent→`--dp-blue-*`；删 uppercase；阴影收敛。  
**禁：** 中文工作台保留 uppercase eyebrow。

---

## 62. `UiActivityTimeline.vue`

| 项 | 事实 |
|----|------|
| 引用 | 1（score-finalize） |
| 空态 | UiEmpty |

**判定：TUNE**  
**动作：** 轴线 hex→`--dp-border`。  
**禁：** 空数据静默不渲染。

---

## 63. `UiArrowTimeline.vue`

| 项 | 事实 |
|----|------|
| 引用 | 1（StageRail） |
| 违例 | 大量 Tailwind 蓝 `#3b82f6/#2563eb` |

**判定：REWORK**  
**动作：** 全状态改 `--dp-*`；补 stages 空态。  
**禁：** 双蓝；wizard 居中指标堆叠。

---

## 64. `UiDescriptionGrid.vue`

| 项 | 事实 |
|----|------|
| 引用 | 1 |
| Token | 干净 |

**判定：TUNE**  
**动作：** `items=[]` 考虑 UiEmpty。  
**禁：** `--` 改假数据。

---

## 65. `UiMetricCard.vue`

| 项 | 事实 |
|----|------|
| 引用 | 1→UiStatPanel 间接多页 |
| 违例 | 默认 `#2563eb`；icon inset 高光 |

**判定：TUNE**  
**动作：** blue→`--dp-blue-600`；去 inset。  
**禁：** `#2563eb` 默认强调。

---

## 66. `UiStatisticChartCard.vue`

| 项 | 事实 |
|----|------|
| 引用 | 1（MarkChartCard） |
| 缺陷 | UiEmpty 与 chart 可叠显 |

**判定：REWORK**  
**动作：** Empty 改 `v-else`；dot→`--dp-*`。  
**禁：** 空态与内容并存。

---

## 67. `AlertDescription.vue`

| 项 | 事实 |
|----|------|
| 引用 | 0 |
| 形态 | 纯 slot div |

**判定：DEAD?**  
**动作：** 接入 Alert 或删除。  
**禁：** 零引用死文件长期留 kit。

---

## Batch 07 汇总

| 判定 | 组件 |
|------|------|
| REWORK | UiArrowTimeline, UiStatisticChartCard |
| TUNE | UiSkeletonState, UiSelect, UiEntityCard, UiActivityTimeline, UiDescriptionGrid, UiMetricCard |
| OK | FilterBar, Badge, UiActionLink |
| DEAD? | AlertDescription |
