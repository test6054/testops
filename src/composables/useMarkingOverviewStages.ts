import type { MaybeRefOrGetter } from 'vue'
import type {
  MarkTeacherDashboardJourneyStageSummaryItemVO,
  MarkTeacherDashboardOngoingExamItemVO,
} from '@/apis/mark/teacher-dashboard'
import type { WorkbenchStage } from '@/types/workbench'
import { computed, toValue } from 'vue'
import {
  buildJourneyStageSummaryFromExams,
  buildMarkDashboardJourneyRail,
  buildMarkDashboardJourneyRailFromSummary,
  resolvePrimaryJourneyBottleneck,
} from '@/utils/mark-dashboard-stages'

export interface UseMarkingOverviewStagesOptions {
  exams: MaybeRefOrGetter<MarkTeacherDashboardOngoingExamItemVO[]>
  journeyStageSummary: MaybeRefOrGetter<MarkTeacherDashboardJourneyStageSummaryItemVO[]>
  filteredCount: MaybeRefOrGetter<number>
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

  const journeyHint = computed(() => {
    if (toValue(options.filteredCount) <= 0) {
      return ''
    }
    const summary = toValue(options.journeyStageSummary)
    const resolvedSummary
      = summary.length > 0 ? summary : buildJourneyStageSummaryFromExams(toValue(options.exams))
    const bottleneck = resolvePrimaryJourneyBottleneck(resolvedSummary)
    if (!bottleneck) {
      return ''
    }
    return `${bottleneck.waitingCount.toLocaleString('zh-CN')} 场考试等待进入${bottleneck.targetStageTitle}阶段`
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
    journeyHint,
    activeStageKey,
  }
}
