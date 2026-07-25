<template>
  <p v-if="!check" class="archive-fp-rows__empty">尚未执行四性检测</p>
  <div v-else class="archive-fp-rows" role="list">
    <div
      v-for="item in dimensionViews"
      :key="item.key"
      class="archive-fp-rows__row"
      :class="item.passed ? 'archive-fp-rows__row--pass' : 'archive-fp-rows__row--fail'"
      role="listitem"
    >
      <span class="archive-fp-rows__mark" aria-hidden="true">{{ item.passed ? '✓' : '✗' }}</span>
      <span class="archive-fp-rows__label">{{ item.label }}</span>
      <span class="archive-fp-rows__status">{{ item.passed ? '通过' : '未通过' }}</span>
      <span class="archive-fp-rows__desc">{{ item.description }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ArchiveFourPropertyCheckResponse } from '@/apis/mark/archive-volume'
import { computed } from 'vue'
import { buildFourPropertyDimensionViews } from '@/utils/archive-four-property-diagnostic'

defineOptions({ name: 'ArchiveFourPropertyGrid' })

const props = defineProps<{
  check: ArchiveFourPropertyCheckResponse | null | undefined
}>()

const dimensionViews = computed(() => buildFourPropertyDimensionViews(props.check))
</script>

<style scoped lang="scss">
.archive-fp-rows {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--dp-border-subtle);
  border-radius: var(--dp-radius-control);
  overflow: hidden;
}

.archive-fp-rows__row {
  display: grid;
  grid-template-columns: 20px 72px 52px minmax(0, 1fr);
  align-items: center;
  gap: var(--dp-space-component-tight);
  padding: var(--dp-space-component-tight) var(--dp-space-component);
  border-top: 1px solid var(--dp-border-subtle);
  font-size: var(--dp-font-size-sm);
  line-height: 1.4;

  &:first-child {
    border-top: none;
  }
}

.archive-fp-rows__row--pass {
  background: color-mix(in srgb, var(--dp-success) 6%, var(--dp-surface));
}

.archive-fp-rows__row--fail {
  background: color-mix(in srgb, var(--dp-warning) 8%, var(--dp-surface));
}

.archive-fp-rows__mark {
  font-size: var(--dp-font-size-xs);
  font-weight: 600;
  text-align: center;
}

.archive-fp-rows__row--pass .archive-fp-rows__mark {
  color: var(--dp-success);
}

.archive-fp-rows__row--fail .archive-fp-rows__mark {
  color: var(--dp-warning);
}

.archive-fp-rows__label {
  font-weight: 600;
  color: var(--dp-text-primary);
}

.archive-fp-rows__status {
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-secondary);
}

.archive-fp-rows__desc {
  min-width: 0;
  color: var(--dp-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.archive-fp-rows__empty {
  margin: 0;
  padding: var(--dp-space-component);
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-muted);
  border: 1px dashed var(--dp-border);
  border-radius: var(--dp-radius-control);
}

@media (max-width: 720px) {
  .archive-fp-rows__row {
    grid-template-columns: 20px 1fr auto;
    grid-template-rows: auto auto;
  }

  .archive-fp-rows__desc {
    grid-column: 2 / -1;
    white-space: normal;
  }
}
</style>
