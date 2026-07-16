# 组件手审账 · Batch 12（Wave A · Popover/Panel/Form）

> 三 Skill · 2026-07-16 · 共性：views/components 业务引用≈0

## 116. `UiColumnSettingPopover.vue` — **DEAD?**
列设完整；待 UiDataTable 接入。禁页内手写列设。

## 117. `UiConfirmPopover.vue` — **SHELL + DEAD?**
现网走 UiConfirmDialog。动作：删或并。禁第三套确认。

## 118. `UiConversationPanel.vue` — **DEAD?**
英文 eyebrow「Conversation Sessions」。动作：中文；未立项禁进导航。

## 119. `UiDeliverableItemEditor.vue` — **SHELL**
薄包 UiEditorCard。动作：合并或直用 EditorCard。

## 120. `UiDetailSection.vue` — **SHELL + DEAD?**
与 FormSection/DescriptionGrid 重叠。动作：删。

## 121. `UiInboxPanel.vue` — **SHELL + DEAD?**
收件箱侧栏壳。禁假收件箱。

## 122. `UiInsightPanel.vue` — **REWORK**
510 行洞察墙；大量 hex；KPI 装饰墙。动作：拆 SignalBand+列表；strict-enum。禁 shadow-card 墙。

## 123. `UiIntentCard.vue` — **TUNE + DEAD?**
progress `#2563eb`。动作：→`--dp-blue-500`。禁第二蓝。

## 124. `UiLogRecordList.vue` — **TUNE**
`#fff` 行底。动作：→`--dp-surface`；扫描日志可复用。

## 125. `UiLogViewer.vue` — **TUNE**
终端暗色视口可接受；外卡 shadow 偏重。动作：外框去 shadow-card。禁全页暗色。

## 126. `UiMatrixForm.vue` — **TUNE**
defineOptions 名 `UiTableForm` 不一致；裸 a-select。动作：统一名；改 UiSelect。

## 127. `UiModeSwitchPanel.vue` — **OK**
token 合规。动作：模式切换优先复用。禁第二套 mode pill。
