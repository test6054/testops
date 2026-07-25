<template>
  <div v-if="stages.length" class="journey-mini" role="list" aria-label="考试旅程进度">
    <button
      v-for="stage in stages"
      :key="stage.key"
      type="button"
      role="listitem"
      class="journey-mini__step"
      :class="stepClass(stage.status)"
      :aria-label="stageAriaLabel(stage)"
      :title="stageTitle(stage)"
      @click="emit('stage-click', stage.key)"
    >
      <span class="journey-mini__bar" aria-hidden="true" />
    </button>
    <span class="journey-mini__label">{{ completedCount }}/{{ stages.length }} 已完成</span>
  </div>
</template>

<script lang="ts" setup>
import type { WorkbenchStage, WorkbenchStageStatus } from '@/types/workbench'
import { computed } from 'vue'
import {
  ALL_WORKBENCH_STAGE_STATUS_CODES,
  WorkbenchStageStatusDescription,
} from '@/types/enums/exam-workbench-stage-status-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

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

function stageStatusLabel(status: WorkbenchStageStatus): string {
  for (const code of ALL_WORKBENCH_STAGE_STATUS_CODES) {
    if (code === status) {
      return strictEnumLabel(WorkbenchStageStatusDescription, code, 'journeyStatus')
    }
  }
  throw new Error(`枚举合同不同步：journeyStatus=${status}`)
}

function stageAriaLabel(stage: WorkbenchStage): string {
  const statusText
    = stage.statusText?.trim()
      || stageStatusLabel(stage.status)
  return `${stage.title}：${statusText}`
}
</script>

<style lang="scss" scoped>
.journey-mini {
  display: flex;
  align-items: center;
  gap: var(--dp-space-component-xs);
  margin-bottom: var(--dp-space-block);
}

.journey-mini__step {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 1 1 0;
  min-width: 32px;
  min-height: 32px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--dp-color-primary);
    outline-offset: 2px;
    border-radius: var(--dp-radius-control, 6px);
  }
}

.journey-mini__bar {
  display: block;
  width: 100%;
  max-width: 28px;
  height: 6px;
  border-radius: var(--dp-radius-full, 999px);
  background: var(--dp-gray-200);
  transition: background var(--dp-duration-fast) var(--dp-ease-default);
}

.journey-mini__step--done .journey-mini__bar {
  background: var(--dp-green-500);
}

.journey-mini__step--active .journey-mini__bar {
  background: var(--dp-blue-500);
}

.journey-mini__step--warning .journey-mini__bar {
  background: var(--dp-orange-500);
}

.journey-mini__label {
  flex-shrink: 0;
  margin-left: var(--dp-space-component-tight);
  font-size: var(--dp-type-hint-size, 12px);
  color: var(--dp-text-muted);
  white-space: nowrap;
}

@media (max-width: 768px) {
  .journey-mini__step {
    min-width: 44px;
    min-height: 44px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .journey-mini__bar {
    transition: none;
  }
}
</style>
