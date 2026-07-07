<template>
  <UiEmpty
    v-if="sortedEvents.length === 0"
    title="暂无事件流水"
    description="归档卷操作与状态变更将在此按时间展示"
  />
  <div v-else class="audit-timeline">
    <article v-for="event in sortedEvents" :key="event.eventId" class="audit-item">
      <div class="audit-time">{{ formatEventTime(event.createTime) }}</div>
      <div class="audit-body">
        <div class="audit-title">{{ archiveVolumeEventTypeLabel(event.eventType) }}</div>
        <div v-if="formatEventDesc(event)" class="audit-desc">{{ formatEventDesc(event) }}</div>
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
import type { ArchiveVolumeDetailResponse, ArchiveVolumeEventVO } from '@/apis/mark/archive-volume'
import { computed } from 'vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import { archiveVolumeEventTypeLabel } from '@/utils/archive-volume-event-ui'
import { formatDateTime } from '@/utils/format'

defineOptions({ name: 'ArchiveVolumeEventsTimeline' })

const props = defineProps<{
  events: ArchiveVolumeDetailResponse['events']
}>()

const sortedEvents = computed(() =>
  [...(props.events ?? [])].sort((left, right) => {
    const leftTime = left.createTime ? new Date(left.createTime).getTime() : 0
    const rightTime = right.createTime ? new Date(right.createTime).getTime() : 0
    return rightTime - leftTime
  }),
)

function formatEventTime(value?: string): string {
  return value ? formatDateTime(value) : '—'
}

/** 组装 audit-desc：优先 reason，其次状态变更摘要。 */
function formatEventDesc(event: ArchiveVolumeEventVO): string {
  const reason = event.reason?.trim()
  if (reason) {
    return reason
  }
  if (event.beforeStatus && event.afterStatus) {
    return `${event.beforeStatus} → ${event.afterStatus}`
  }
  if (event.afterStatus) {
    return event.afterStatus
  }
  return ''
}
</script>
