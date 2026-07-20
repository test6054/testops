<template>
  <div class="exam-journey-rail">
    <StageRail
      :stages="stages"
      :active-key="activeKey"
      variant="arrow"
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
import { isExamWorkspaceJourneyKey } from '@/constants/exam-journey'

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

/** 将 StageRail 选中项映射为六步旅程键并向上抛出 */
function handleSelect(stage: WorkbenchStage): void {
  if (!isExamWorkspaceJourneyKey(stage.key) || stage.key === 'overview') {
    throw new Error(`未知考试旅程键：${stage.key}`)
  }
  emit('select', stage.key)
}
</script>

<style lang="scss" scoped>
.exam-journey-rail {
  flex-shrink: 0;
  padding: var(--dp-space-1) var(--dp-space-3);
  overflow-x: auto;
  background: var(--dp-surface);
  border-bottom: 1px solid var(--dp-border);
}
</style>
