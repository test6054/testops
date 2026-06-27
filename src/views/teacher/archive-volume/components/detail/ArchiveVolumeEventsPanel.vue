<template>
  <section class="archive-volume-events-panel">
    <UiDataTable
      pagination-mode="none"
      :columns="eventColumns"
      :data-source="events"
      :show-pagination="false"
      flat
      row-key="eventId"
      size="middle"
      empty-description="暂无事件流水"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'eventType'">
          {{ eventTypeLabel(record.eventType) }}
        </template>
        <template v-else-if="column.key === 'createTime'">
          {{ formatDateTime(record.createTime) }}
        </template>
      </template>
    </UiDataTable>
  </section>
</template>

<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ArchiveVolumeDetailVO,
  ArchiveVolumeEventTypeCode,
} from '@/apis/mark/archive-volume'
import { ARCHIVE_VOLUME_EVENT_TYPE_LABEL } from '@/apis/mark/archive-volume'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'ArchiveVolumeEventsPanel' })

defineProps<{
  events: ArchiveVolumeDetailVO['events']
}>()

const eventColumns: ColumnsType<ArchiveVolumeDetailVO['events'][number]> = [
  { title: '事件', key: 'eventType', width: 160 },
  { title: '说明', dataIndex: 'reason' },
  { title: '时间', key: 'createTime', width: 160 },
]

function eventTypeLabel(code?: ArchiveVolumeEventTypeCode) {
  if (!code) return '—'
  return strictEnumLabel(ARCHIVE_VOLUME_EVENT_TYPE_LABEL, code, 'eventType')
}
</script>

<style scoped>
.archive-volume-events-panel {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-4, 16px);
}
</style>
