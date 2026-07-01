<template>
  <div class="portfolio-teacher-journey-rail">
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
import type { PortfolioTeacherJourneyKey } from '@/constants/portfolio-teacher-journey'
import type { WorkbenchStage } from '@/types/workbench'
import StageRail from '@/components/workbench/StageRail.vue'
import { PORTFOLIO_TEACHER_JOURNEY_STEPS } from '@/constants/portfolio-teacher-journey'

defineOptions({
  name: 'PortfolioTeacherJourneyRail',
})

defineProps<{
  stages: WorkbenchStage[]
  activeKey: string
}>()

const emit = defineEmits<{
  (e: 'select', journeyKey: PortfolioTeacherJourneyKey): void
}>()

const JOURNEY_KEY_SET = new Set<string>(PORTFOLIO_TEACHER_JOURNEY_STEPS.map((step) => step.key))

function handleSelect(stage: WorkbenchStage): void {
  if (!JOURNEY_KEY_SET.has(stage.key)) {
    throw new Error(`未知档案袋旅程键：${stage.key}`)
  }
  emit('select', stage.key as PortfolioTeacherJourneyKey)
}
</script>

<style lang="scss" scoped>
.portfolio-teacher-journey-rail {
  flex-shrink: 0;
  padding: var(--dp-space-3) var(--dp-space-4);
  overflow-x: auto;
  background: var(--dp-surface);
  border-bottom: 1px solid var(--dp-border);
}
</style>
