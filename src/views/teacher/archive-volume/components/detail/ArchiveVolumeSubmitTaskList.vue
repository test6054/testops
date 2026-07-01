<script setup lang="ts">
import type { ArchiveVolumeSubmitChecklistItemVO } from '@/apis/mark/archive-volume'
import { computed } from 'vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import { resolveSubmitTaskTarget } from '@/composables/useArchiveSubmitTaskRouter'

defineOptions({ name: 'ArchiveVolumeSubmitTaskList' })

const props = defineProps<{
  items: ArchiveVolumeSubmitChecklistItemVO[]
}>()

const emit = defineEmits<{
  navigate: [item: ArchiveVolumeSubmitChecklistItemVO]
}>()

const pendingItems = computed(() => props.items.filter(item => item.passed !== true))

function actionLabel(item: ArchiveVolumeSubmitChecklistItemVO): string {
  if (item.actionLabel?.trim()) return item.actionLabel.trim()
  const target = resolveSubmitTaskTarget(item)
  if (target.wizardStep === 'integrity') return '去四性检测'
  if (target.wizardStep === 'catalog') return '去编目'
  if (target.wizardStep === 'selfCheck') return '去自查'
  if (target.wizardStep === 'submit') return '去提交'
  return '去处理'
}

function dimensionTone(dimension: string): 'gray' | 'blue' | 'green' | 'red' | 'orange' | 'purple' {
  if (dimension === 'REMEDIATION') return 'orange'
  if (dimension === 'FOUR_PROPERTY') return 'blue'
  if (dimension === 'INTEGRITY' || dimension === 'SCORE') return 'red'
  if (dimension === 'CATALOG_NOT_READY' || dimension === 'CATALOG') return 'purple'
  return 'gray'
}
</script>

<template>
  <ul v-if="pendingItems.length" class="archive-volume-submit-task-list">
    <li
      v-for="(item, index) in pendingItems"
      :key="`${item.dimension}-${index}`"
      class="archive-volume-submit-task-list__item"
    >
      <div class="archive-volume-submit-task-list__main">
        <UiTag :tone="dimensionTone(item.dimension)" size="sm">{{ item.dimension }}</UiTag>
        <span class="archive-volume-submit-task-list__message">{{ item.message }}</span>
      </div>
      <UiButton size="sm" variant="outline" @click="emit('navigate', item)">
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
  gap: var(--dp-space-2, 8px);
}

.archive-volume-submit-task-list__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-3, 12px);
  padding: var(--dp-space-3, 12px);
  border: 1px solid var(--dp-border, #e2e8f0);
  border-radius: var(--dp-radius-control, 4px);
  background: var(--dp-surface, #fff);
}

.archive-volume-submit-task-list__main {
  display: flex;
  align-items: flex-start;
  gap: var(--dp-space-2, 8px);
  min-width: 0;
}

.archive-volume-submit-task-list__message {
  font-size: 14px;
  line-height: 1.5;
  color: var(--dp-text-primary, #0f172a);
}

.archive-volume-submit-task-list__empty {
  margin: 0;
  font-size: 13px;
  color: var(--dp-text-secondary, #64748b);
}
</style>
