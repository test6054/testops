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
import { isPortfolioTeacherJourneyKey } from '@/constants/portfolio-teacher-journey'

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

function handleSelect(stage: WorkbenchStage): void {
  if (!isPortfolioTeacherJourneyKey(stage.key)) {
    throw new Error(`未知档案袋旅程键：${stage.key}`)
  }
  emit('select', stage.key)
}
</script>

<style lang="scss" scoped>
.portfolio-teacher-journey-rail {
  flex-shrink: 0;
  padding: var(--dp-space-component) var(--dp-space-block);
  overflow-x: auto;
  background: var(--dp-surface);
  border-bottom: 1px solid var(--dp-border);
}
</style>
