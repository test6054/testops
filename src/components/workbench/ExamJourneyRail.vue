<template>
  <div class="exam-journey-rail">
    <StageRail
      :stages="stages"
      :active-key="activeKey"
      compact
      allow-pending-select
      @select="handleSelect"
    />
  </div>
</template>

<script lang="ts" setup>
import type { ExamJourneyKey } from '@/constants/exam-journey'
import type { WorkbenchStage } from '@/types/workbench'
import StageRail from '@/components/workbench/StageRail.vue'
import { EXAM_JOURNEY_STEPS } from '@/constants/exam-journey'

defineOptions({
  name: 'ExamJourneyRail',
})

defineProps<{
  stages: WorkbenchStage[]
  activeKey: string
}>()

const emit = defineEmits<{
  (e: 'select', journeyKey: ExamJourneyKey): void
}>()

const JOURNEY_KEY_SET = new Set<string>(EXAM_JOURNEY_STEPS.map((step) => step.key))

/** 将 StageRail 选中项映射为六步旅程键并向上抛出 */
function handleSelect(stage: WorkbenchStage): void {
  if (!JOURNEY_KEY_SET.has(stage.key)) {
    throw new Error(`未知考试旅程键：${stage.key}`)
  }
  emit('select', stage.key as ExamJourneyKey)
}
</script>

<style lang="scss" scoped>
.exam-journey-rail {
  flex-shrink: 0;
  padding: 12px 16px;
  overflow-x: auto;
  background: var(--ant-color-bg-container);
  border-bottom: 1px solid var(--ant-color-border-secondary);
}
</style>
