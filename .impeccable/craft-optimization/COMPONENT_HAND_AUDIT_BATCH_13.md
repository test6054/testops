# 组件手审账 · Batch 13（Wave A · Notice–StageEditor）

> 三 Skill · 2026-07-16 · 业务引用≈0（components.d.ts）

## 128. `UiNoticeList.vue` — **DEAD?**
未读色 `#eff6ff`；有 v-else Empty。动作：接 inbox 前 token 化。禁第二蓝。

## 129. `UiPageCard.vue` — **SHELL**
包 Card + padding。动作：直用 UiCard 后删。禁壳外套白大卡。

## 130. `UiPageHero.vue` — **REWORK**
默认三列 KPI + `#1d4ed8` + purple；shadow-card。动作：工作台改 ContextBar+SignalBand。禁 KPI 装饰墙。

## 131. `UiPendingList.vue` — **REWORK**
course 语义「待答辩」；GiCell；跑马灯。动作：删或去 course/ticker。禁 course 迁入 mark-vue。

## 132. `UiProgressMonitorCard.vue` — **TUNE**
`#2563eb` progress。动作：→ primary token。禁装饰 KPI。

## 133. `UiQuotaPanel.vue` — **REWORK**
Empty 无 v-else 叠显。动作：修空态。禁空态与列表同屏。

## 134. `UiRankListCard.vue` — **REWORK**
Empty 无 v-else；`'--'` 兜底。动作：修空态；禁假排行。

## 135. `UiResourceCard.vue` — **REWORK**
uppercase cover；默认「资源卡片」。动作：删或去 uppercase。禁 course 资源卡。

## 136. `UiSearchTableDialog.vue` — **TUNE**
选表弹窗合同完整。动作：与 SelectionModal 合并保留本文件。禁第三套。

## 137. `UiSelectionModal.vue` — **SHELL**
SearchTableDialog 子集。动作：删并统一。禁双维护。

## 138. `UiSelectorHeaderExtra.vue` — **DEAD?**
header+键值。动作：有场景再接。

## 139. `UiSimpleList.vue` — **TUNE**
hover 重阴影。动作：去 8px shadow。禁列表 shadow-card。

## 140. `UiSimplePie.vue` — **REWORK**
`#3b82f6`；与 MarkChart 分叉。动作：删或仅 demo。禁非品牌饼图。

## 141. `UiStageEditorShell.vue` — **SHELL**
course 交付物壳。动作：删。禁 course 语义进 mark-vue。
