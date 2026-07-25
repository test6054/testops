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
}

.workbench-surface-card:has(.ui-data-table--fill-remaining) {
  flex: 1 1 auto;
}

.workbench-surface-card--embedded {
  background: transparent;
  border: none;
  border-radius: 0;
  box-shadow: none;
}

.workbench-surface-card__head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
  padding: var(--dp-space-component) var(--dp-space-block);
  border-bottom: 1px solid var(--ant-color-split);
  background: var(--dp-surface-chrome);
}

.workbench-surface-card__head :deep(h2),
.workbench-surface-card__head :deep(h3),
.workbench-surface-card__head :deep(.dp-section-title),
.workbench-surface-card__head :deep(.marking-overview__panel-title),
.workbench-surface-card__head :deep(.workbench-panel-title) {
  margin: 0;
  font-size: 15px;
  line-height: 1.4;
  font-weight: 700;
  color: var(--dp-text-primary);
  letter-spacing: -0.01em;
}

.workbench-surface-card__head :deep(p),
.workbench-surface-card__head :deep(.dp-meta),
.workbench-surface-card__head :deep(.marking-overview__panel-desc) {
  margin: 0;
  font-size: var(--dp-font-size-xs, 12px);
  line-height: 1.4;
  color: var(--dp-text-muted);
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
