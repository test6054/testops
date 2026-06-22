<template>
  <UiArrowTimeline
    :stages="timelineStages"
    :active-key="activeKey"
    :compact="compact"
    :allow-pending-select="allowPendingSelect"
    @select="handleSelect"
  />
</template>

<script lang="ts" setup>
import type { UiArrowTimelineStage } from '@/components/ui-guide/ui/types'
import type { WorkbenchStage } from '@/types/workbench'
import { computed } from 'vue'

import UiArrowTimeline from '@/components/ui-guide/ui/UiArrowTimeline.vue'

import { WORKBENCH_STAGE_TO_TIMELINE } from '@/types/workbench'

defineOptions({
  name: 'StageRail',
})

const props = withDefaults(
  defineProps<{
    stages?: WorkbenchStage[]
    activeKey?: string
    compact?: boolean
    /** 为 true 时 pending 阶段仍可点击（六步旅程轨导航） */
    allowPendingSelect?: boolean
  }>(),
  {
    stages: () => [],
    activeKey: '',
    compact: false,
    allowPendingSelect: false,
  },
)

const emit = defineEmits<{
  (e: 'select', stage: WorkbenchStage): void
}>()

const timelineStages = computed<UiArrowTimelineStage[]>(() =>
  props.stages.map((stage) => ({
    key: stage.key,
    title: stage.title,
    status: WORKBENCH_STAGE_TO_TIMELINE[stage.status] ?? 'pending',
    statusText: stage.statusText,
    dateRange: stage.dateRange,
    progress: stage.progress,
    metrics: stage.metrics,
  })),
)

function handleSelect(timelineStage: UiArrowTimelineStage) {
  const source = props.stages.find((s) => s.key === timelineStage.key)
  if (source) {
    emit('select', source)
  }
}
</script>
