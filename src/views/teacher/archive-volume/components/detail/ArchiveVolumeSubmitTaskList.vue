<script setup lang="ts">
import type { ArchiveVolumeSubmitChecklistItemVO } from '@/apis/mark/archive-volume'
import { computed } from 'vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import { submitChecklistActionLabel } from '@/composables/useArchiveSubmitChecklistRouter'
import { ArchiveVolumeSubmitChecklistDimensionCode } from '@/types/enums/archive-volume-submit-checklist-dimension-enum'
import { submitChecklistDimensionLabel } from '@/utils/archive-submit-checklist-display'

defineOptions({ name: 'ArchiveVolumeSubmitTaskList' })

const props = withDefaults(
  defineProps<{
    items: ArchiveVolumeSubmitChecklistItemVO[]
    readonly?: boolean
  }>(),
  {
    // MVR-380：默认拒绝假可写；仅父级显式 :readonly="false" 可导航写入口
    readonly: true,
  },
)

const emit = defineEmits<{
  navigate: [item: ArchiveVolumeSubmitChecklistItemVO]
}>()

const pendingItems = computed(() => props.items.filter((item) => item.passed !== true))

function actionLabel(item: ArchiveVolumeSubmitChecklistItemVO): string {
  return submitChecklistActionLabel(item)
}

function dimensionTone(
  dimension: ArchiveVolumeSubmitChecklistDimensionCode,
): 'gray' | 'blue' | 'green' | 'red' | 'orange' | 'purple' {
  if (dimension === ArchiveVolumeSubmitChecklistDimensionCode.REMEDIATION) return 'orange'
  if (dimension === ArchiveVolumeSubmitChecklistDimensionCode.FOUR_PROPERTY_SECURITY)
    return 'orange'
  if (dimension === ArchiveVolumeSubmitChecklistDimensionCode.FOUR_PROPERTY) return 'blue'
  if (
    dimension === ArchiveVolumeSubmitChecklistDimensionCode.INTEGRITY
    || dimension === ArchiveVolumeSubmitChecklistDimensionCode.SCORE
  ) {
    return 'red'
  }
  if (
    dimension === ArchiveVolumeSubmitChecklistDimensionCode.CATALOG_NOT_READY
    || dimension === ArchiveVolumeSubmitChecklistDimensionCode.CATALOG
  ) {
    return 'purple'
  }
  return 'gray'
}

function dimensionLabel(dimension: ArchiveVolumeSubmitChecklistDimensionCode): string {
  return submitChecklistDimensionLabel(dimension)
}
</script>

<template>
  <ul v-if="pendingItems.length" class="archive-volume-submit-task-list">
    <li
      v-for="(item, index) in pendingItems"
      :key="`${item.dimension}-${index}`"
      class="submit-task-row"
      :class="{ 'submit-task-row--primary': index === 0 }"
    >
      <div class="submit-task-row__main">
        <UiTag :tone="dimensionTone(item.dimension)" size="sm">
          {{
            dimensionLabel(item.dimension)
          }}
        </UiTag>
        <span class="submit-task-row__message">{{ item.message }}</span>
      </div>
      <UiButton v-if="readonly === false" size="sm" variant="outline" @click="emit('navigate', item)">
        {{ actionLabel(item) }}
      </UiButton>
    </li>
  </ul>
  <p v-else class="archive-volume-submit-task-list__empty">当前无待办阻塞项</p>
</template>

<style scoped>
.archive-volume-submit-task-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: var(--dp-space-2);
}

.archive-volume-submit-task-list__empty {
  margin: 0;
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}

.submit-task-row--primary {
  border-left-color: var(--dp-red-500);
  background: color-mix(in srgb, var(--dp-orange-500) 8%, var(--dp-surface));
}
</style>
