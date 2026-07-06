<template>
  <div v-if="stages.length" class="journey-mini">
    <button
      v-for="stage in stages"
      :key="stage.key"
      type="button"
      class="journey-mini__step"
      :class="stepClass(stage.status)"
      :title="stage.title"
      @click="emit('stage-click', stage.key)"
    />
    <span class="journey-mini__label">{{ completedCount }}/{{ stages.length }} 已完成</span>
  </div>
</template>

<script lang="ts" setup>
import type { ExamWorkbenchStageItemVO, ExamWorkbenchStageKeyCode, WorkbenchStageStatusCode } from '@/apis/mark/exam-progress'
import { computed } from 'vue'

defineOptions({ name: 'ExamJourneyMiniStrip' })

const props = defineProps<{
  stages: ExamWorkbenchStageItemVO[]
}>()

const emit = defineEmits<{
  'stage-click': [key: ExamWorkbenchStageKeyCode]
}>()

const completedCount = computed(() =>
  props.stages.filter((stage) => stage.status === 'completed').length,
)

function stepClass(status: WorkbenchStageStatusCode): string {
  if (status === 'completed') return 'journey-mini__step--done'
  if (status === 'active') return 'journey-mini__step--active'
  if (status === 'warning' || status === 'error' || status === 'blocked') {
    return 'journey-mini__step--warning'
  }
  return ''
}
</script>
