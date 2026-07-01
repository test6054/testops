<template>
  <UiActivityTimeline
    :groups="timelineGroups"
    compact
    empty-title="暂无事件流水"
    empty-description="归档卷操作与状态变更将在此按时间展示"
  />
</template>

<script setup lang="ts">
import type { ArchiveVolumeDetailVO, ArchiveVolumeEventTypeCode } from '@/apis/mark/archive-volume'
import { ARCHIVE_VOLUME_EVENT_TYPE_LABEL } from '@/apis/mark/archive-volume'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { computed } from 'vue'
import UiActivityTimeline from '@/components/ui-guide/ui/UiActivityTimeline.vue'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'ArchiveVolumeEventsTimeline' })

const props = defineProps<{
  events: ArchiveVolumeDetailVO['events']
}>()

const EVENT_TYPE_TONE: Partial<Record<ArchiveVolumeEventTypeCode, BadgeTone>> = {
  VOLUME_CREATED: 'blue',
  VOLUME_AUTO_CREATED: 'blue',
  AUTO_CREATE_FAILED: 'red',
  MATERIAL_REGISTERED: 'green',
  IMPORT_BATCH: 'blue',
  INTEGRITY_CHECKED: 'blue',
  SCORE_CONFIRMED: 'green',
  SUBMITTED: 'purple',
  TRANSFER_APPROVED: 'green',
  TRANSFER_REJECTED: 'red',
  FOUR_PROPERTY_CHECKED: 'blue',
  ACCESS_REQUESTED: 'orange',
  ACCESS_APPROVED: 'green',
  ACCESS_REJECTED: 'red',
  REMEDIATION_ASSIGNED: 'orange',
  REMEDIATION_CLOSED: 'gray',
  ARCHIVE_DUE_REMINDER: 'red',
  DELAY_SUBMISSION_OVERDUE: 'red',
  SELF_CHECK_CONFIRMED: 'green',
  VOLUME_RECOLLECTING: 'orange',
}

const sortedEvents = computed(() =>
  [...(props.events ?? [])].sort((left, right) => {
    const leftTime = left.createTime ? new Date(left.createTime).getTime() : 0
    const rightTime = right.createTime ? new Date(right.createTime).getTime() : 0
    return rightTime - leftTime
  }),
)

const timelineGroups = computed(() => {
  const items = sortedEvents.value.map((event) => ({
    key: event.eventId,
    title: eventTypeLabel(event.eventType),
    time: event.createTime ? formatDateTime(event.createTime) : undefined,
    content: event.reason?.trim() || undefined,
    tone: resolveEventTone(event.eventType),
  }))
  if (items.length === 0) {
    return []
  }
  return [
    {
      key: 'archive-volume-events',
      label: '事件流水',
      items,
    },
  ]
})

function eventTypeLabel(code?: ArchiveVolumeEventTypeCode) {
  if (!code) return '—'
  return strictEnumLabel(ARCHIVE_VOLUME_EVENT_TYPE_LABEL, code, 'eventType')
}

function resolveEventTone(code?: ArchiveVolumeEventTypeCode): BadgeTone {
  if (!code) return 'gray'
  return EVENT_TYPE_TONE[code] ?? 'blue'
}
</script>
