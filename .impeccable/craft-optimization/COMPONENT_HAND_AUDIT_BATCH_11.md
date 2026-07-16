# 组件手审账 · Batch 11（Wave A · TableHead–UiCollectionToolbar）

> 三 Skill · 2026-07-16 · 共性：业务 import=0；现网替代 UiDataTable/UiSectionTabs/FilterBar

## 104–106. `TableHead` / `TableHeader` / `TableRow` — **SHELL + DEAD?**
成套删。禁与 UiDataTable 并行。

## 107. `TabPane.vue` — **SHELL + DEAD?**
薄包 a-tab-pane。禁与 UiSectionTabs 双轨。

## 108. `Tabs.vue` — **TUNE + DEAD?**
合同完整；与 SectionTabs 竞争。动作：无需求则删；活跃色收敛 `--dp-blue-500`。

## 109. `TaskCard.vue` — **TUNE + DEAD?**
warning `#fef2f2`；选中蓝阴影；标题 18px。动作：token+去重阴影；禁卡片墙替表。

## 110. `UiAccordion.vue` — **TUNE + DEAD?**
`#fff !important`。动作：→`--dp-surface`。

## 111. `UiActivityFeed.vue` — **TUNE + DEAD?**
头像 `#2563eb` 等 hex；fallback「记」。动作：token；禁假动态流。

## 112. `UiAgentCard.vue` — **REWORK + DEAD?**
默认 purple +「智能体」。动作：默认 blue 或删。禁紫阶 AI 卡墙。

## 113. `UiAssistantEntryCard.vue` — **TUNE + DEAD?**
多 hex tone。动作：复用 Badge soft token。

## 114. `UiBreadcrumbs.vue` — **OK + DEAD?**
a11y 好；工作台有 ContextBar 时禁叠。动作：无调用可删。

## 115. `UiCollectionToolbar.vue` — **TUNE + DEAD?**
与 FilterBar 重叠；默认 viewSwitch。动作：默认关 grid/list；优先 FilterBar。
