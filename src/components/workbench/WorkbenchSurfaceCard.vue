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
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
  box-shadow:
    0 1px 2px color-mix(in srgb, var(--dp-text-primary) 4%, transparent),
    0 1px 3px color-mix(in srgb, var(--dp-text-primary) 5%, transparent);
  overflow: hidden;
  transition:
    border-color var(--dp-duration-normal) cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow var(--dp-duration-normal) cubic-bezier(0.4, 0, 0.2, 1);
}

.workbench-surface-card:hover {
  box-shadow:
    0 2px 4px color-mix(in srgb, var(--dp-text-primary) 5%, transparent),
    0 4px 12px color-mix(in srgb, var(--dp-text-primary) 6%, transparent);
}

.workbench-surface-card--embedded {
  background: transparent;
  border: none;
  border-radius: 0;
  box-shadow: none;
}

.workbench-surface-card--embedded:hover {
  box-shadow: none;
}

.workbench-surface-card__head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--dp-space-2);
  padding: var(--dp-space-3) var(--dp-space-4);
  border-bottom: 1px solid var(--dp-border);
  background: linear-gradient(
    180deg,
    var(--dp-surface-elevated) 0%,
    color-mix(in srgb, var(--dp-surface-elevated) 60%, var(--dp-surface)) 100%
  );
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
  gap: var(--dp-space-2);
  padding: var(--dp-space-2) var(--dp-space-4);
  border-bottom: 1px solid color-mix(in srgb, var(--dp-border) 70%, transparent);
  background: color-mix(in srgb, var(--dp-surface-elevated) 50%, var(--dp-surface));
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

@media (prefers-reduced-motion: reduce) {
  .workbench-surface-card {
    transition: none;
  }
}
</style>
