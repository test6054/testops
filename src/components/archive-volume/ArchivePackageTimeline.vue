<script lang="ts" setup>
import type { ArchiveVolumeExamArchivePackageTimelineStepVO } from '@/apis/mark/archive-volume'
import { computed } from 'vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import { formatDateTime } from '@/utils/format'

defineOptions({ name: 'ArchivePackageTimeline' })

const props = defineProps<{
  steps: ArchiveVolumeExamArchivePackageTimelineStepVO[]
}>()

const timelineSteps = computed(() => props.steps)

function formatEventTime(value?: string): string {
  if (!value) {
    return '—'
  }
  const formatted = formatDateTime(value)
  const timePart = formatted.split(' ')[1]
  return timePart ?? formatted
}

function dotClass(status: ArchiveVolumeExamArchivePackageTimelineStepVO['stepStatus']): string {
  if (status === 'done') {
    return 'archive-package-timeline__dot archive-package-timeline__dot--done'
  }
  if (status === 'active') {
    return 'archive-package-timeline__dot archive-package-timeline__dot--active'
  }
  if (status === 'failed') {
    return 'archive-package-timeline__dot archive-package-timeline__dot--failed'
  }
  return 'archive-package-timeline__dot archive-package-timeline__dot--pending'
}
</script>

<template>
  <UiEmpty v-if="timelineSteps.length === 0" description="创建归档包后将展示打包进度" />
  <div v-else class="archive-package-timeline">
    <article
      v-for="(step, index) in timelineSteps"
      :key="step.stepKey"
      class="archive-package-timeline__item"
    >
      <div class="archive-package-timeline__rail" aria-hidden="true">
        <span :class="dotClass(step.stepStatus)" />
        <span v-if="index < timelineSteps.length - 1" class="archive-package-timeline__line" />
      </div>
      <div class="archive-package-timeline__body">
        <div class="archive-package-timeline__title">{{ step.stepLabel }}</div>
        <div class="archive-package-timeline__desc">{{ step.description ?? '—' }}</div>
        <div class="archive-package-timeline__time">{{ formatEventTime(step.eventTime) }}</div>
      </div>
    </article>
  </div>
</template>

<style scoped lang="scss">
.archive-package-timeline {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-3);
}

.archive-package-timeline__item {
  display: flex;
  gap: var(--dp-space-3);
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
  border-radius: var(--dp-radius-full);
}

.archive-package-timeline__dot--done {
  background: var(--dp-green-600);
}

.archive-package-timeline__dot--active {
  background: var(--dp-blue-600);
}

.archive-package-timeline__dot--failed {
  background: var(--dp-red-600);
}

.archive-package-timeline__dot--pending {
  background: var(--dp-border);
}

.archive-package-timeline__line {
  flex: 1;
  width: 1.5px;
  min-height: 24px;
  margin-top: 4px;
  background: var(--dp-border-light);
}

.archive-package-timeline__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--dp-text-primary);
}

.archive-package-timeline__desc {
  margin-top: 2px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--dp-text-secondary);
}

.archive-package-timeline__time {
  margin-top: 2px;
  font-size: 11px;
  font-family: var(--dp-font-mono);
  color: var(--dp-text-tertiary);
}
</style>
