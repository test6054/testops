import type {
  MarkTeacherDashboardJourneyStageSummaryItemVO,
  MarkTeacherDashboardOngoingExamItemVO,
} from '@/apis/mark/teacher-dashboard'
import type { MarkStageKey } from '@/stores/modules/markStage'
import type { MarkTeacherDashboardJourneyKeyCode } from '@/types/enums/mark-teacher-dashboard-journey-key-enum'
import type { WorkbenchStage, WorkbenchStageStatus } from '@/types/workbench'
import { EXAM_JOURNEY_STEPS, resolveJourneyKeyByStage } from '@/constants/exam-journey'

export interface MarkDashboardJourneyBottleneck {
  /** 前一阶段积压、待进入本阶段的考试场数 */
  waitingCount: number
  sourceStageTitle: string
  targetStageTitle: string
  targetJourneyKey: MarkTeacherDashboardJourneyKeyCode
}

function buildJourneyCountMap(
  summary: MarkTeacherDashboardJourneyStageSummaryItemVO[],
): Map<MarkTeacherDashboardJourneyKeyCode, number> {
  return new Map(summary.map((item) => [item.journeyKey, item.examCount]))
}

/** 筛选域旅程轨首要瓶颈：前一阶段有考试、本阶段为 0 时视为待进入 */
export function resolvePrimaryJourneyBottleneck(
  summary: MarkTeacherDashboardJourneyStageSummaryItemVO[],
): MarkDashboardJourneyBottleneck | null {
  const countByKey = buildJourneyCountMap(summary)
  for (let index = 1; index < EXAM_JOURNEY_STEPS.length; index += 1) {
    const step = EXAM_JOURNEY_STEPS[index]
    const prevStep = EXAM_JOURNEY_STEPS[index - 1]
    const prevCount = countByKey.get(prevStep.key) ?? 0
    const count = countByKey.get(step.key) ?? 0
    if (prevCount > 0 && count === 0) {
      return {
        waitingCount: prevCount,
        sourceStageTitle: prevStep.title,
        targetStageTitle: step.title,
        targetJourneyKey: step.key,
      }
    }
  }
  return null
}

function buildJourneyRailStages(
  countByKey: Map<MarkTeacherDashboardJourneyKeyCode, number>,
): WorkbenchStage[] {
  const maxJourneyIndex = EXAM_JOURNEY_STEPS.reduce((max, step, index) => {
    const count = countByKey.get(step.key) ?? 0
    return count > 0 && index > max ? index : max
  }, -1)

  return EXAM_JOURNEY_STEPS.map((step, index) => {
    const count = countByKey.get(step.key) ?? 0
    const prevCount = index > 0 ? (countByKey.get(EXAM_JOURNEY_STEPS[index - 1].key) ?? 0) : 0
    const isBottleneck = count === 0 && prevCount > 0

    let status: WorkbenchStageStatus = 'pending'
    let statusText: string | undefined
    if (count > 0) {
      status = 'active'
      statusText = `${count} 场`
    } else if (isBottleneck) {
      status = 'warning'
      statusText = '待进入'
    } else if (maxJourneyIndex > index) {
      status = 'completed'
    }

    return {
      key: step.key,
      title: step.title,
      status,
      statusText,
    }
  })
}

function isMarkStageKey(value: unknown): value is MarkStageKey {
  return (
    value === 'EXAM_PREP'
    || value === 'PAPER_TEMPLATE'
    || value === 'CANDIDATE_ROSTER'
    || value === 'SCAN'
    || value === 'MARKING_ORG'
    || value === 'TRIAL_MARKING'
    || value === 'FORMAL_MARKING'
    || value === 'SCORE_PUBLISH'
    || value === 'ARCHIVE'
  )
}

function resolveJourneyIndex(stageKey: MarkStageKey | undefined): number {
  if (!stageKey) return -1
  const journeyKey = resolveJourneyKeyByStage(stageKey)
  return EXAM_JOURNEY_STEPS.findIndex((step) => step.key === journeyKey)
}

/** 按进行中考试列表合成旅程汇总（summary 未返回时的回退） */
export function buildJourneyStageSummaryFromExams(
  exams: MarkTeacherDashboardOngoingExamItemVO[],
): MarkTeacherDashboardJourneyStageSummaryItemVO[] {
  const countByKey = new Map<MarkTeacherDashboardJourneyKeyCode, number>()
  for (const step of EXAM_JOURNEY_STEPS) {
    countByKey.set(step.key, 0)
  }
  for (const exam of exams) {
    if (!isMarkStageKey(exam.currentStageKey)) {
      continue
    }
    const journeyKey = resolveJourneyKeyByStage(exam.currentStageKey)
    countByKey.set(journeyKey, (countByKey.get(journeyKey) ?? 0) + 1)
  }
  return EXAM_JOURNEY_STEPS.map((step) => ({
    journeyKey: step.key,
    examCount: countByKey.get(step.key) ?? 0,
  }))
}
/** 按筛选域旅程汇总构建 StageRail 阶段项 */
export function buildMarkDashboardJourneyRailFromSummary(
  summary: MarkTeacherDashboardJourneyStageSummaryItemVO[],
): WorkbenchStage[] {
  return buildJourneyRailStages(buildJourneyCountMap(summary))
}

/** 按筛选域考试聚合六步旅程分布，与考试工作台 ExamJourneyRail 口径一致 */
export function buildMarkDashboardJourneyRail(
  exams: MarkTeacherDashboardOngoingExamItemVO[],
): WorkbenchStage[] {
  const countByKey = buildJourneyCountMap(buildJourneyStageSummaryFromExams(exams))
  return buildJourneyRailStages(countByKey)
}

/** 单张考试卡六步旅程点状态 */
export function resolveExamJourneyDotStatus(
  exam: MarkTeacherDashboardOngoingExamItemVO,
  journeyIndex: number,
): 'done' | 'current' | 'pending' {
  const currentIndex = resolveJourneyIndex(
    isMarkStageKey(exam.currentStageKey) ? exam.currentStageKey : undefined,
  )
  const completedSegments = Math.round(
    ((exam.progressPercent ?? 0) / 100) * EXAM_JOURNEY_STEPS.length,
  )
  if (journeyIndex < completedSegments) return 'done'
  if (journeyIndex === currentIndex) return 'current'
  return 'pending'
}

export type OngoingExamProgressTone = 'success' | 'warning' | 'primary'

/**
 * 仪表盘进行中考试卡进度条色调：按主链阶段判定「偏慢/正常」，避免准备期低进度误报橙色。
 */
export function resolveOngoingExamProgressTone(
  progress: number,
  stageKey: MarkStageKey | undefined,
): OngoingExamProgressTone {
  if (progress >= 100) {
    return 'success'
  }
  switch (stageKey) {
    case 'EXAM_PREP':
    case 'PAPER_TEMPLATE':
    case 'CANDIDATE_ROSTER':
    case 'SCAN':
    case 'MARKING_ORG':
      return 'primary'
    case 'TRIAL_MARKING':
    case 'FORMAL_MARKING':
      return progress < 50 ? 'warning' : 'primary'
    case 'SCORE_PUBLISH':
      return progress < 90 ? 'warning' : 'primary'
    default:
      return 'primary'
  }
}
