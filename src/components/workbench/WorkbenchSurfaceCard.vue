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
  box-shadow: var(--dp-shadow-sm);
  overflow: hidden;
}

.workbench-surface-card__head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--dp-space-2);
  padding: var(--dp-space-3) var(--dp-space-4);
  border-bottom: 1px solid var(--dp-border);
}

.workbench-surface-card__toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--dp-space-2);
  padding: var(--dp-space-2) var(--dp-space-4);
  border-bottom: 1px solid var(--dp-border);
  background: var(--dp-surface);
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
