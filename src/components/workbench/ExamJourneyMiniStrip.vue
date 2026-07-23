<template>
  <div v-if="stages.length" class="journey-mini">
    <button
      v-for="stage in stages"
      :key="stage.key"
      type="button"
      class="journey-mini__step"
      :class="stepClass(stage.status)"
      :title="stageTitle(stage)"
      @click="emit('stage-click', stage.key)"
    />
    <span class="journey-mini__label">{{ completedCount }}/{{ stages.length }} 已完成</span>
  </div>
</template>

<script lang="ts" setup>
import type { WorkbenchStage } from '@/types/workbench'
import { computed } from 'vue'

defineOptions({ name: 'ExamJourneyMiniStrip' })

const props = defineProps<{
  stages: WorkbenchStage[]
}>()

const emit = defineEmits<{
  'stage-click': [key: string]
}>()

const completedCount = computed(() =>
  props.stages.filter((stage) => stage.status === 'completed').length,
)

function stepClass(status: WorkbenchStage['status']): string {
  if (status === 'completed') return 'journey-mini__step--done'
  if (status === 'active') return 'journey-mini__step--active'
  if (status === 'warning' || status === 'error' || status === 'blocked') {
    return 'journey-mini__step--warning'
  }
  return ''
}

function stageTitle(stage: WorkbenchStage): string {
  const parts = [stage.title]
  if (stage.statusText?.trim()) {
    parts.push(stage.statusText.trim())
  }
  return parts.join(' · ')
}
</script>
