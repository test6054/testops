import type { MarkTeacherDashboardJourneyStageSummaryItemVO, MarkTeacherDashboardOngoingExamItemVO } from '@/apis/mark/teacher-dashboard'
import type { MarkStageKey } from '@/stores/modules/markStage'
import type { WorkbenchStage, WorkbenchStageStatus } from '@/types/workbench'
import {
  EXAM_JOURNEY_STEPS,
  resolveJourneyKeyByStage,
} from '@/constants/exam-journey'

function resolveJourneyIndex(stageKey: MarkStageKey | undefined): number {
  if (!stageKey) return -1
  const journeyKey = resolveJourneyKeyByStage(stageKey)
  return EXAM_JOURNEY_STEPS.findIndex(step => step.key === journeyKey)
}

/** 按筛选域旅程汇总构建 StageRail 阶段项 */
export function buildMarkDashboardJourneyRailFromSummary(
  summary: MarkTeacherDashboardJourneyStageSummaryItemVO[],
): WorkbenchStage[] {
  const countByKey = new Map(summary.map(item => [item.journeyKey, item.examCount]))
  const maxJourneyIndex = EXAM_JOURNEY_STEPS.reduce((max, step, index) => {
    const count = countByKey.get(step.key) ?? 0
    return count > 0 && index > max ? index : max
  }, -1)

  return EXAM_JOURNEY_STEPS.map((step, index) => {
    const count = countByKey.get(step.key) ?? 0
    let status: WorkbenchStageStatus = 'pending'
    if (count > 0) {
      status = 'active'
    } else if (maxJourneyIndex > index) {
      status = 'completed'
    }
    return {
      key: step.key,
      title: step.title,
      status,
      statusText: count > 0 ? `${count} 场` : undefined,
    }
  })
}

/** 按筛选域考试聚合六步旅程分布，与考试工作台 ExamJourneyRail 口径一致 */
export function buildMarkDashboardJourneyRail(
  exams: MarkTeacherDashboardOngoingExamItemVO[],
): WorkbenchStage[] {
  const maxJourneyIndex = exams.reduce((max, exam) => {
    const index = resolveJourneyIndex(exam.currentStageKey as MarkStageKey | undefined)
    return index > max ? index : max
  }, -1)

  return EXAM_JOURNEY_STEPS.map((step, index) => {
    const count = exams.filter((exam) => {
      if (!exam.currentStageKey) return false
      return step.stageKeys.includes(exam.currentStageKey as MarkStageKey)
    }).length

    let status: WorkbenchStageStatus = 'pending'
    if (count > 0) {
      status = 'active'
    } else if (maxJourneyIndex > index) {
      status = 'completed'
    }

    return {
      key: step.key,
      title: step.title,
      status,
      statusText: count > 0 ? `${count} 场` : undefined,
    }
  })
}

/** 单张考试卡六步旅程点状态 */
export function resolveExamJourneyDotStatus(
  exam: MarkTeacherDashboardOngoingExamItemVO,
  journeyIndex: number,
): 'done' | 'current' | 'pending' {
  const currentIndex = resolveJourneyIndex(exam.currentStageKey as MarkStageKey | undefined)
  const completedSegments = Math.round(
    ((exam.progressPercent ?? 0) / 100) * EXAM_JOURNEY_STEPS.length,
  )
  if (journeyIndex < completedSegments) return 'done'
  if (journeyIndex === currentIndex) return 'current'
  return 'pending'
}
