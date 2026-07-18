<template>
  <section class="workbench-surface-card">
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
defineOptions({ name: 'WorkbenchSurfaceCard' })

withDefaults(
  defineProps<{
    /** 表格等内容区贴边，无内边距 */
    flush?: boolean
  }>(),
  {
    flush: false,
  },
)
</script>

<style scoped>
.workbench-surface-card {
  display: flex;
  flex-direction: column;
  background: var(--dp-surface);
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
  box-shadow: var(--dp-shadow-xs);
  overflow: hidden;
  transition:
    border-color var(--dp-duration-normal) ease,
    box-shadow var(--dp-duration-normal) ease;
}

.workbench-surface-card__head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--dp-space-2);
  padding: var(--dp-space-3) var(--dp-space-4);
  border-bottom: 1px solid var(--dp-border);
  background: var(--dp-surface-elevated);
}

.workbench-surface-card__head :deep(h2),
.workbench-surface-card__head :deep(h3),
.workbench-surface-card__head :deep(.dp-section-title),
.workbench-surface-card__head :deep(.marking-overview__panel-title),
.workbench-surface-card__head :deep(.workbench-panel-title) {
  margin: 0;
  font-size: 15px;
  line-height: 1.4;
  font-weight: 600;
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
  gap: var(--dp-space-2);
  padding: var(--dp-space-2) var(--dp-space-4);
  border-bottom: 1px solid var(--dp-border);
  background: var(--dp-surface-elevated);
}

.workbench-surface-card__body {
  flex: 1;
  padding: var(--dp-space-3) var(--dp-space-4);
  min-height: 0;
  min-width: 0;
}

.workbench-surface-card__body--flush {
  padding: 0;
}
</style>
