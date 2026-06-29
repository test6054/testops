<template>
  <div class="marking-overview-stage-rail">
    <div class="marking-overview-stage-rail__head">
      <span class="marking-overview-stage-rail__title">考试旅程</span>
      <span class="marking-overview-stage-rail__hint">
        {{ filteredCount > 0 ? `筛选域 ${filteredCount} 场考试分布` : '筛选域暂无考试' }}
      </span>
    </div>
    <StageRail
      :stages="stages"
      :active-key="activeStageKey"
      variant="panel"
      compact
      class="marking-overview-stage-rail__timeline"
    />
  </div>
</template>

<script lang="ts" setup>
import type {
  MarkTeacherDashboardJourneyStageSummaryItemVO,
  MarkTeacherDashboardOngoingExamItemVO,
} from '@/apis/mark/teacher-dashboard'
import type { WorkbenchStage } from '@/types/workbench'
import { computed } from 'vue'
import StageRail from '@/components/workbench/StageRail.vue'
import {
  buildMarkDashboardJourneyRail,
  buildMarkDashboardJourneyRailFromSummary,
} from '@/utils/mark-dashboard-stages'

defineOptions({ name: 'MarkingOverviewStageRail' })

const props = defineProps<{
  exams: MarkTeacherDashboardOngoingExamItemVO[]
  journeyStageSummary: MarkTeacherDashboardJourneyStageSummaryItemVO[]
  filteredCount: number
}>()

const stages = computed<WorkbenchStage[]>(() => {
  if (props.journeyStageSummary.length > 0) {
    return buildMarkDashboardJourneyRailFromSummary(props.journeyStageSummary)
  }
  return buildMarkDashboardJourneyRail(props.exams)
})

const activeStageKey = computed(() => {
  const active = stages.value.find(stage => stage.status === 'active')
  return active?.key ?? ''
})
</script>

<style scoped>
.marking-overview-stage-rail__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--dp-space-3, 12px);
  margin-bottom: var(--dp-space-2, 8px);
}

.marking-overview-stage-rail__title {
  font-size: var(--dp-type-table-head-size, 14px);
  font-weight: var(--dp-type-table-head-weight, 600);
  color: var(--dp-text-primary, rgba(0, 0, 0, 0.88));
}

.marking-overview-stage-rail__hint {
  font-size: var(--dp-type-hint-size, 12px);
  line-height: var(--dp-type-hint-line-height);
  color: var(--dp-text-muted, rgba(0, 0, 0, 0.45));
}

.marking-overview-stage-rail__timeline {
  width: 100%;
}
</style>
