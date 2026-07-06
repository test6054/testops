<script setup lang="ts">
import type {
  ArchiveSelfCheckStatusCode} from '@/apis/mark/archive-volume';
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { computed, onMounted } from 'vue'
import {
  ARCHIVE_SELF_CHECK_STATUS_TONE,
  ArchiveSelfCheckStatusDescription,
} from '@/apis/mark/archive-volume'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useArchiveVolumeSelfCheck } from '@/composables/useArchiveVolumeSelfCheck'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'ArchiveVolumeSelfCheckList' })

const props = withDefaults(
  defineProps<{
    volumeId: string
    selfCheckStatus?: ArchiveSelfCheckStatusCode
    readonly?: boolean
    /** 嵌入 integrity Tab 时不套 WorkbenchSurfaceCard */
    embedded?: boolean
  }>(),
  {
    readonly: false,
    embedded: false,
  },
)

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
  return strictEnumLabel(ArchiveSelfCheckStatusDescription, code, 'selfCheckStatus')
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

function handleRowClick(item: { templateItemId: string, checked?: boolean }) {
  if (props.readonly || checking.value) return
  void handleToggle(item.templateItemId, !item.checked)
}

onMounted(() => {
  void loadSelfCheck()
})

defineExpose({ loadSelfCheck })
</script>

<template>
  <component
    :is="embedded ? 'section' : WorkbenchSurfaceCard"
    class="archive-volume-self-check-list"
    :class="{ 'archive-volume-self-check-list--embedded': embedded }"
  >
    <div class="archive-volume-self-check-list__head">
      <div class="archive-volume-self-check-list__title-wrap">
        <h3 class="archive-volume-self-check-list__title">自检清单</h3>
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
          导出
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

    <UiSkeletonState v-if="loading" variant="card" compact />

    <UiEmpty v-else-if="items.length === 0" description="暂无自查项，请先在设置页配置模板" />

    <ul v-else class="archive-volume-self-check-list__items">
      <li
        v-for="item in items"
        :key="item.templateItemId"
        class="self-check-row"
        :class="{ 'self-check-row--interactive': !readonly && !checking }"
        @click="handleRowClick(item)"
      >
        <span
          class="self-check-mark"
          :class="item.checked ? 'self-check-mark--done' : 'self-check-mark--pending'"
          aria-hidden="true"
        >
          {{ item.checked ? '✓' : '' }}
        </span>
        <span class="self-check-row__label">{{ item.itemText }}</span>
        <UiTag v-if="item.requiredFlag" tone="orange" size="sm">必查</UiTag>
        <span v-if="item.checked && item.checkedTime" class="self-check-row__time">
          已确认 · {{ formatDateTime(item.checkedTime) }}
        </span>
      </li>
    </ul>
  </component>
</template>

<style scoped>
.archive-volume-self-check-list {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-3, 12px);
}

.archive-volume-self-check-list--embedded {
  gap: var(--dp-space-3, 12px);
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
}
</style>
