<!--
  归档门禁操作条：紧凑横排操作芯片，避免大空卡占首屏。
-->
<script setup lang="ts">
interface ArchiveGateOpsItem {
  key: string
  title: string
  description?: string
  /** 可操作门禁必填；checklistFail / grantsFail 等只读提示可缺省 */
  actionLabel?: string
  tone?: 'blue' | 'orange' | 'red' | 'gray'
}

defineOptions({ name: 'ArchiveVolumeGateOpsStrip' })

defineProps<{
  items: ArchiveGateOpsItem[]
}>()

const emit = defineEmits<{
  action: [key: string]
}>()
</script>

<template>
  <div v-if="items.length" class="archive-gate-ops" role="list">
    <button
      v-for="item in items.filter((row) => row.actionLabel)"
      :key="item.key"
      type="button"
      class="archive-gate-ops__item"
      :class="`archive-gate-ops__item--${item.tone ?? 'orange'}`"
      role="listitem"
      :title="item.description || item.title"
      @click="emit('action', item.key)"
    >
      <span class="archive-gate-ops__title">{{ item.title }}</span>
      <span class="archive-gate-ops__cta">{{ item.actionLabel }}</span>
    </button>
    <div
      v-for="item in items.filter((row) => !row.actionLabel)"
      :key="`info-${item.key}`"
      class="archive-gate-ops__item archive-gate-ops__item--info"
      :class="`archive-gate-ops__item--${item.tone ?? 'orange'}`"
      role="listitem"
      :title="item.description || item.title"
    >
      <span class="archive-gate-ops__title">{{ item.title }}</span>
      <span v-if="item.description" class="archive-gate-ops__desc">{{ item.description }}</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.archive-gate-ops {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
  margin-bottom: var(--dp-space-component);
}

.archive-gate-ops__item {
  display: inline-flex;
  align-items: center;
  gap: var(--dp-space-component-tight);
  max-width: 100%;
  min-height: 32px;
  padding: var(--dp-space-component-xs) var(--dp-space-component);
  border: 1px solid color-mix(in srgb, var(--dp-orange-500) 28%, var(--dp-border));
  border-radius: var(--dp-radius-control);
  background: color-mix(in srgb, var(--dp-orange-500) 8%, var(--dp-surface));
  text-align: left;
  cursor: pointer;
  transition:
    border-color var(--dp-duration-normal) var(--dp-ease-default),
    background var(--dp-duration-normal) var(--dp-ease-default);

  &:hover {
    border-color: color-mix(in srgb, var(--dp-color-primary) 40%, var(--dp-border));
    background: color-mix(in srgb, var(--dp-color-primary) 6%, var(--dp-surface));
  }

  &:focus-visible {
    outline: 2px solid var(--dp-color-primary);
    outline-offset: 2px;
  }
}

.archive-gate-ops__item--blue {
  border-color: color-mix(in srgb, var(--dp-blue-500) 28%, var(--dp-border));
  background: color-mix(in srgb, var(--dp-blue-500) 8%, var(--dp-surface));
}

.archive-gate-ops__item--red {
  border-color: color-mix(in srgb, var(--dp-red-500) 28%, var(--dp-border));
  background: color-mix(in srgb, var(--dp-red-500) 8%, var(--dp-surface));
}

.archive-gate-ops__item--gray {
  border-color: var(--dp-border);
  background: var(--dp-gray-50);
}

.archive-gate-ops__item--info {
  cursor: default;

  &:hover {
    border-color: inherit;
    background: inherit;
  }
}

.archive-gate-ops__title {
  font-size: var(--dp-font-size-xs);
  font-weight: 600;
  color: var(--dp-text-primary);
  line-height: 1.2;
}

.archive-gate-ops__cta {
  font-size: var(--dp-font-size-xs);
  font-weight: 600;
  color: var(--dp-color-primary);
  white-space: nowrap;
}

.archive-gate-ops__desc {
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-secondary);
  line-height: 1.3;
}
</style>
