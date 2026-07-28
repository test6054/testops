<template>
  <section
    class="workbench-surface-card"
    :class="{ 'workbench-surface-card--embedded': embedded }"
  >
    <header v-if="$slots.head" class="workbench-surface-card__head">
      <slot name="head" />
    </header>
    <div v-if="$slots.toolbar" class="workbench-surface-card__toolbar">
      <slot name="toolbar" />
    </div>
    <div
      class="workbench-surface-card__body"
      :class="{ 'workbench-surface-card__body--flush': flush }"
    >
      <slot />
    </div>
  </section>
</template>

<script lang="ts" setup>
/**
 * 工作台操作面容器：表格/筛选/分栏详情的白底分段。
 * 固定轻阴影，禁止 hover 抬升（操作面非可点击实体；可点卡片用 UiCard hoverable / UiMetricCard clickable）。
 */
defineOptions({ name: 'WorkbenchSurfaceCard' })

withDefaults(
  defineProps<{
    /** 表格等内容区贴边，无内边距 */
    flush?: boolean
    /** 嵌入外层 Surface 时去掉描边与阴影，避免双卡嵌套 */
    embedded?: boolean
  }>(),
  {
    flush: false,
    embedded: false,
  },
)
</script>

<style scoped>
.workbench-surface-card {
  display: flex;
  flex-direction: column;
  background: var(--dp-surface);
  border: 1px solid var(--dp-panel-border);
  border-radius: var(--dp-radius-panel);
  box-shadow: var(--dp-shadow-card);
  overflow: hidden;
  min-height: 0;
  transition:
    background-color var(--dp-duration-normal) var(--dp-ease-default),
    border-color var(--dp-duration-normal) var(--dp-ease-default),
    border-radius var(--dp-duration-normal) var(--dp-ease-default),
    box-shadow var(--dp-duration-normal) var(--dp-ease-default);
}

.workbench-surface-card:has(.ui-data-table--fill-remaining) {
  flex: 1 1 auto;
}

.workbench-surface-card--embedded {
  background: transparent;
  border-color: transparent;
  border-radius: 0;
  box-shadow: none;
}

/* 面板标题字号唯一权威：子节点继承；页内勿再写 15px / 重复 panel-title 字号 */
.workbench-surface-card__head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
  padding: var(--dp-space-component) var(--dp-space-block);
  border-bottom: 1px solid var(--ant-color-split);
  background: var(--dp-surface-chrome);
  font-size: var(--dp-type-panel-title-size);
  line-height: var(--dp-type-panel-title-line-height);
  font-weight: var(--dp-type-panel-title-weight);
  color: var(--dp-text-primary);
  letter-spacing: -0.01em;
}

.workbench-surface-card__head :deep(h2),
.workbench-surface-card__head :deep(h3),
.workbench-surface-card__head :deep(.dp-section-title),
.workbench-surface-card__head :deep(.workbench-panel-title) {
  margin: 0;
  font: inherit;
  letter-spacing: inherit;
  color: inherit;
}

.workbench-surface-card__head :deep(p),
.workbench-surface-card__head :deep(.dp-meta),
.workbench-surface-card__head :deep(.workbench-panel-desc),
.workbench-surface-card__head :deep(.marking-overview__panel-desc) {
  margin: 0;
  font-size: var(--dp-font-size-xs);
  line-height: 1.4;
  font-weight: var(--dp-font-weight-body);
  color: var(--dp-text-muted);
  letter-spacing: normal;
}

.workbench-surface-card__toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
  padding: var(--dp-space-component-tight) var(--dp-space-block);
  border-bottom: 1px solid var(--ant-color-split);
  background: var(--dp-surface-chrome);
}

.workbench-surface-card__body {
  flex: 1;
  padding: var(--dp-space-component) var(--dp-space-block);
  min-height: 0;
  min-width: 0;
}

.workbench-surface-card__body--flush {
  padding: 0;
  display: flex;
  flex-direction: column;
}

.workbench-surface-card__body:has(.ui-data-table--fill-remaining) {
  display: flex;
  flex-direction: column;
}
</style>

<style lang="scss">
/* 嵌套 Surface 降影：须非 scoped，覆盖子树内另一张 WorkbenchSurfaceCard */
.workbench-surface-card .workbench-surface-card {
  box-shadow: none;
  border-radius: var(--dp-radius-xs);
}

.workbench-surface-card .workbench-surface-card .workbench-surface-card__head {
  padding: var(--dp-space-component-tight) var(--dp-space-component);
  gap: var(--dp-space-component-tight);
}

.workbench-surface-card .workbench-surface-card .workbench-surface-card__toolbar {
  padding: var(--dp-space-component-tight) var(--dp-space-component);
}

.workbench-surface-card
  .workbench-surface-card
  .workbench-surface-card__body:not(.workbench-surface-card__body--flush) {
  padding: var(--dp-space-component);
}

.workbench-surface-card__body--flush > .exam-status-card {
  margin-bottom: 0;
  border: none;
  border-radius: 0;
}
</style>
