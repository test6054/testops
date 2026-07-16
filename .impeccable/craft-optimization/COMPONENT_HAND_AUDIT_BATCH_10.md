# 组件手审账 · Batch 10（Wave A · FilterPills–TableCell）

> 三 Skill · frontend-design-mark · 2026-07-16  
> 共性：本批 12 文件业务 import≈0（仅 components.d.ts）

## 92. `FilterPills.vue` — **DEAD? + TUNE**
硬编码蓝阶 rgba(37,99,235)；15px pill 偏松。动作：token 化或删；禁第二套筛选。

## 93. `FormList.vue` — **REWORK + DEAD?**
`linear-gradient` + card shadow。动作：去渐变或删。禁 Anti-AI 渐变。

## 94. `FormModal.vue` — **SHELL + DEAD?**
透传 UiDialog；圆角 10px。动作：并入 UiDialog icon prop。禁>8px。

## 95. `MetaItem.vue` — **OK + DEAD?**
非 scoped 全局样式。动作：scoped 或删。

## 96. `NativeSelect.vue` — **DEAD?**
与 UiSelect 双轨。动作：删。禁双轨。

## 97. `RangePicker.vue` — **OK + DEAD?**
token 合规但未接入；现网裸 a-range-picker。动作：FilterBar 接 dateRange。

## 98. `SelectArco.vue` — **SHELL + DEAD?**
纯转发 UiSelect；缺 computed import；Arco 名矛盾。动作：删。

## 99. `Separator.vue` — **OK + DEAD?**
hr + `--dp-border`。动作：无引用则删。

## 100. `StatItem.vue` — **REWORK + DEAD?**
灰底 KPI hover；与 SignalBand 双轨。动作：删，统一 MetricCard/SignalBand。

## 101–103. `Table.vue` / `TableBody` / `TableCell` — **DEAD?/SHELL**
原生 table 族；现网 UiDataTable。动作：整套删除。禁并行维护。
