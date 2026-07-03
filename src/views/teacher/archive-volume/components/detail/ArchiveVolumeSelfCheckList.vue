<script setup lang="ts">
import type { ArchiveSelfCheckStatusCode } from '@/apis/mark/archive-volume'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { computed, onMounted } from 'vue'
import {
  ARCHIVE_SELF_CHECK_STATUS_LABEL,
  ARCHIVE_SELF_CHECK_STATUS_TONE,
} from '@/apis/mark/archive-volume'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import { useArchiveVolumeSelfCheck } from '@/composables/useArchiveVolumeSelfCheck'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'ArchiveVolumeSelfCheckList' })

const props = defineProps<{
  volumeId: string
  selfCheckStatus?: ArchiveSelfCheckStatusCode
  readonly?: boolean
}>()

const emit = defineEmits<{
  "refreshed": []
  'open-sign-off': []
}>()

const {
  loading,
  checking,
  exporting,
  items,
  selfCheckStatus,
  allRequiredChecked,
  loadSelfCheck,
  toggleItem,
  exportSelfCheck,
} = useArchiveVolumeSelfCheck(() => props.volumeId)

const effectiveStatus = computed(() => props.selfCheckStatus ?? selfCheckStatus.value)

function statusLabel(code: ArchiveSelfCheckStatusCode) {
  return strictEnumLabel(ARCHIVE_SELF_CHECK_STATUS_LABEL, code, 'selfCheckStatus')
}

function statusTone(code: ArchiveSelfCheckStatusCode): BadgeTone {
  return strictEnumTone(ARCHIVE_SELF_CHECK_STATUS_TONE, code, 'selfCheckStatus')
}

async function handleToggle(templateItemId: string, checked: boolean) {
  const item = items.value.find((row) => row.templateItemId === templateItemId)
  if (!item) return
  await toggleItem(item, checked)
  emit('refreshed')
}

onMounted(() => {
  void loadSelfCheck()
})

defineExpose({ loadSelfCheck })
</script>

<template>
  <section class="archive-volume-self-check-list">
    <div class="archive-volume-self-check-list__head">
      <div class="archive-volume-self-check-list__title-wrap">
        <h3 class="archive-volume-self-check-list__title">提交前自查清单</h3>
        <UiTag :tone="statusTone(effectiveStatus)" size="sm">
          {{ statusLabel(effectiveStatus) }}
        </UiTag>
      </div>
      <div class="archive-volume-self-check-list__actions">
        <UiButton
          size="sm"
          variant="ghost"
          :loading="exporting"
          :disabled="items.length === 0"
          @click="exportSelfCheck"
        >
          导出自查表
        </UiButton>
        <UiButton
          v-if="!readonly && allRequiredChecked"
          size="sm"
          variant="primary"
          @click="emit('open-sign-off')"
        >
          进入签字确认
        </UiButton>
      </div>
    </div>

    <a-skeleton v-if="loading" active :paragraph="{ rows: 6 }" />

    <UiEmpty v-else-if="items.length === 0" description="暂无自查项，请先在设置页配置模板" />

    <ul v-else class="archive-volume-self-check-list__items">
      <li
        v-for="item in items"
        :key="item.templateItemId"
        class="archive-volume-self-check-list__item"
      >
        <a-checkbox
          :checked="item.checked"
          :disabled="readonly || checking"
          @update:checked="handleToggle(item.templateItemId, $event as boolean)"
        >
          <span class="archive-volume-self-check-list__text">{{ item.itemText }}</span>
          <UiTag v-if="item.requiredFlag" tone="orange" size="sm">必查</UiTag>
        </a-checkbox>
        <span v-if="item.checked && item.checkedTime" class="archive-volume-self-check-list__meta">
          {{ item.checkerName || '已确认' }} · {{ formatDateTime(item.checkedTime) }}
        </span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.archive-volume-self-check-list {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-4, 16px);
}

.archive-volume-self-check-list__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--dp-space-3, 12px);
}

.archive-volume-self-check-list__title-wrap {
  display: flex;
  align-items: center;
  gap: var(--dp-space-2, 8px);
}

.archive-volume-self-check-list__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.archive-volume-self-check-list__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-2, 8px);
}

.archive-volume-self-check-list__items {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: var(--dp-space-3, 12px);
}

.archive-volume-self-check-list__item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--dp-space-3, 12px);
  border: 1px solid var(--dp-border, #e2e8f0);
  border-radius: var(--dp-radius-control, 4px);
  background: var(--dp-surface, #fff);
}

.archive-volume-self-check-list__text {
  margin-right: var(--dp-space-2, 8px);
}

.archive-volume-self-check-list__meta {
  margin-left: 24px;
  font-size: 12px;
  color: var(--dp-text-secondary, #64748b);
}
</style>
