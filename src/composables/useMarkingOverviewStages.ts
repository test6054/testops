import type { MaybeRefOrGetter } from 'vue'
import type {
  MarkTeacherDashboardJourneyStageSummaryItemVO,
  MarkTeacherDashboardOngoingExamItemVO,
} from '@/apis/mark/teacher-dashboard'
import type { WorkbenchStage } from '@/types/workbench'
import { computed, toValue } from 'vue'
import {
  buildMarkDashboardJourneyRail,
  buildMarkDashboardJourneyRailFromSummary,
} from '@/utils/mark-dashboard-stages'

export interface UseMarkingOverviewStagesOptions {
  exams: MaybeRefOrGetter<MarkTeacherDashboardOngoingExamItemVO[]>
  journeyStageSummary: MaybeRefOrGetter<MarkTeacherDashboardJourneyStageSummaryItemVO[]>
}

/** 阅卷概览 StageRail：将 dashboard 旅程 DTO 映射为工作台阶段轨展示模型。 */
export function useMarkingOverviewStages(options: UseMarkingOverviewStagesOptions) {
  const stages = computed<WorkbenchStage[]>(() => {
    const summary = toValue(options.journeyStageSummary)
    if (summary.length > 0) {
      return buildMarkDashboardJourneyRailFromSummary(summary)
    }
    return buildMarkDashboardJourneyRail(toValue(options.exams))
  })

  const activeStageKey = computed(() => {
    const bottleneck = stages.value.find((stage) => stage.status === 'warning')
    if (bottleneck) {
      return bottleneck.key
    }
    const active = stages.value.find((stage) => stage.status === 'active')
    return active?.key ?? ''
  })

  return {
    stages,
    activeStageKey,
  }
}
