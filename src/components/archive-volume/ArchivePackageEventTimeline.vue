<script lang="ts" setup>
import type { ArchiveVolumeExamArchivePackageEventVO } from '@/apis/mark/archive-volume'
import { computed } from 'vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import { formatDateTime } from '@/utils/format'

defineOptions({ name: 'ArchivePackageEventTimeline' })

const props = defineProps<{
  events: ArchiveVolumeExamArchivePackageEventVO[]
}>()

/** 时间线按发生时间正序展示，与原型一致。 */
const timelineEvents = computed(() =>
  [...props.events].sort((left, right) => {
    const leftTime = left.eventTime ? new Date(left.eventTime).getTime() : 0
    const rightTime = right.eventTime ? new Date(right.eventTime).getTime() : 0
    return leftTime - rightTime
  }),
)

function formatEventTime(value?: string): string {
  if (!value) {
    return '—'
  }
  const formatted = formatDateTime(value)
  const timePart = formatted.split(' ')[1]
  return timePart ?? formatted
}

function formatEventDesc(event: ArchiveVolumeExamArchivePackageEventVO): string {
  const reason = event.reason?.trim()
  if (reason) {
    return reason
  }
  return event.eventTypeLabel ?? '—'
}
</script>

<template>
  <UiEmpty v-if="timelineEvents.length === 0" description="暂无归档时间线" />
  <div v-else class="archive-package-timeline">
    <article
      v-for="(event, index) in timelineEvents"
      :key="event.eventId"
      class="archive-package-timeline__item"
    >
      <div class="archive-package-timeline__rail" aria-hidden="true">
        <span class="archive-package-timeline__dot" />
        <span v-if="index < timelineEvents.length - 1" class="archive-package-timeline__line" />
      </div>
      <div class="archive-package-timeline__body">
        <div class="archive-package-timeline__title">{{ event.eventTypeLabel ?? '—' }}</div>
        <div class="archive-package-timeline__desc">{{ formatEventDesc(event) }}</div>
        <div class="archive-package-timeline__time">{{ formatEventTime(event.eventTime) }}</div>
      </div>
    </article>
  </div>
</template>

<style scoped lang="scss">
.archive-package-timeline {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-3, 12px);
}

.archive-package-timeline__item {
  display: flex;
  gap: var(--dp-space-3, 12px);
}

.archive-package-timeline__rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 12px;
  flex-shrink: 0;
}

.archive-package-timeline__dot {
  width: 8px;
  height: 8px;
  margin-top: 6px;
  border-radius: 999px;
  background: var(--dp-green-600, #16a34a);
}

.archive-package-timeline__line {
  flex: 1;
  width: 1.5px;
  min-height: 24px;
  margin-top: 4px;
  background: var(--dp-border-light, #e2e8f0);
}

.archive-package-timeline__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--dp-text-primary, #0f172a);
}

.archive-package-timeline__desc {
  margin-top: 2px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--dp-text-secondary, #64748b);
}

.archive-package-timeline__time {
  margin-top: 2px;
  font-size: 11px;
  font-family: var(--dp-font-mono, ui-monospace, monospace);
  color: var(--dp-text-tertiary, #94a3b8);
}
</style>
