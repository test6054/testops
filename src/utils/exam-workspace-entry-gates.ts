import type {
  ExamWorkbenchNextActionResponse,
  MarkingProgressResponse,
} from '@/apis/mark/exam-progress'
import type { ExamJourneyKey } from '@/constants/exam-journey'
import type { MarkStageKey } from '@/stores/modules/markStage'
import { WorkbenchNextActionKeyCode } from '@/apis/mark/exam-progress'
import { MarkTeacherDashboardJourneyKeyCode } from '@/types/enums/mark-teacher-dashboard-journey-key-enum'
import { resolveScanStageEntryRouteName } from '@/utils/resolve-scan-stage-entry'

const NEXT_ACTION_ROUTE: Record<WorkbenchNextActionKeyCode, string> = {
  [WorkbenchNextActionKeyCode.START_SCAN]: 'TeacherExamWorkspaceScanBatches',
  [WorkbenchNextActionKeyCode.ENTER_REVIEW]: 'TeacherExamWorkspaceReviewBatchConfirm',
  [WorkbenchNextActionKeyCode.ENTER_MARKING]: 'TeacherExamWorkspaceMarkingTaskPool',
  [WorkbenchNextActionKeyCode.EXPERIENCE_ASSIST_CALIBRATION]:
    'TeacherExamWorkspaceMarkingExperienceAssistPolicy',
}

export function findWorkbenchNextAction(
  nextActions: ExamWorkbenchNextActionResponse[] | null | undefined,
  actionKey: WorkbenchNextActionKeyCode,
): ExamWorkbenchNextActionResponse | undefined {
  return nextActions?.find((item) => item.actionKey === actionKey)
}

/**
 * 是否允许从准备页进入扫描登记：仅看 START_SCAN 合同 enabled；
 * 缺 nextAction 时 fail-closed。制卷/名册硬阻断不再参与。
 */
export function canStartScanRegistration(
  nextActions?: ExamWorkbenchNextActionResponse[] | null,
): boolean {
  const action = findWorkbenchNextAction(nextActions, WorkbenchNextActionKeyCode.START_SCAN)
  if (!action) {
    return false
  }
  return action.enabled
}

/** 是否允许进入批量复核：消费后端 nextActions.ENTER_REVIEW */
export function canEnterReviewBatch(
  nextActions?: ExamWorkbenchNextActionResponse[] | null,
  _progress?: MarkingProgressResponse | null,
): boolean {
  const action = findWorkbenchNextAction(nextActions, WorkbenchNextActionKeyCode.ENTER_REVIEW)
  if (!action) {
    return false
  }
  return action.enabled
}

export function resolveNextActionDisabledReason(
  nextActions: ExamWorkbenchNextActionResponse[] | null | undefined,
  actionKey: WorkbenchNextActionKeyCode,
): string | undefined {
  const action = findWorkbenchNextAction(nextActions, actionKey)
  if (!action || action.enabled) {
    return undefined
  }
  return action.disabledReason
}

/** 首个 enabled 的 nextAction；若传入 suggestedStageKey 则优先匹配目标阶段对应动作。 */
export function resolvePrimaryEnabledNextAction(
  nextActions: ExamWorkbenchNextActionResponse[] | null | undefined,
  suggestedStageKey?: MarkStageKey | null,
): ExamWorkbenchNextActionResponse | undefined {
  if (!nextActions?.length) {
    return undefined
  }
  if (suggestedStageKey) {
    const matched = nextActions.find(
      (item) => item.enabled && item.targetStageKey === suggestedStageKey,
    )
    if (matched) {
      return matched
    }
  }
  return nextActions.find((item) => item.enabled)
}

export function resolveNextActionRouteName(
  actionKey: WorkbenchNextActionKeyCode,
  examId?: string,
  scanAttentionCount?: number,
): string {
  if (actionKey === WorkbenchNextActionKeyCode.START_SCAN && examId) {
    return resolveScanStageEntryRouteName({ scanAttentionCount })
  }
  return NEXT_ACTION_ROUTE[actionKey]
}

/**
 * 考试列表智能入口：按主链与进度跳转到最优子页。
 * gradablePaperCount 缺失时用 totalQuestionGradeCount 作复核/阅卷代理。
 */
/** 扫描监控需优先处置的异常数（不含识别复核 NEED_REVIEW，后者走阅卷复核入口）。 */
export function countBlockingScanAttention(
  scanAttentionCount: number,
  needReviewGradeResultCount?: number,
): number {
  const needReviewGrades = needReviewGradeResultCount ?? 0
  return Math.max(0, scanAttentionCount - needReviewGrades)
}

/**
 * 考试列表智能入口：优先消费后端 workspaceRouteName；CLOSED 进概览；其余按进度回退。
 */
export function resolveSmartExamEntryRouteName(exam: {
  status: string
  hasPrioritySignal?: boolean
  workspaceRouteName?: string
  scanAttentionCount: number
  questionCount: number
  totalQuestionGradeCount: number
  pendingReviewTaskCount: number
  inProgressReviewTaskCount: number
  gradablePaperCount?: number
  needReviewGradeResultCount?: number
  openProcessingTaskCount: number
  confirmedQuestionGradeCount: number
}): string {
  if (exam.status === 'CLOSED') {
    return 'TeacherExamWorkspaceOverview'
  }
  if (exam.hasPrioritySignal === true) {
    const routeName = exam.workspaceRouteName?.trim()
    if (!routeName) {
      throw new Error('优先推进考试缺少 workspaceRouteName 合同字段')
    }
    return routeName
  }
  const needReviewGrades = exam.needReviewGradeResultCount ?? 0
  if (countBlockingScanAttention(exam.scanAttentionCount, needReviewGrades) > 0) {
    return 'TeacherExamWorkspaceScanMonitor'
  }
  const pendingReview = exam.pendingReviewTaskCount + exam.inProgressReviewTaskCount
  const hasGradableWork = (exam.gradablePaperCount ?? 0) > 0 || exam.totalQuestionGradeCount > 0
  if (needReviewGrades > 0 || (hasGradableWork && pendingReview > 0)) {
    return 'TeacherExamWorkspaceReviewBatchConfirm'
  }
  if (exam.totalQuestionGradeCount > 0) {
    if (exam.openProcessingTaskCount > 0) {
      return 'TeacherExamWorkspaceMarkingTaskPool'
    }
    if (Math.max(0, exam.totalQuestionGradeCount - exam.confirmedQuestionGradeCount) > 0) {
      return 'TeacherExamWorkspaceMarkingTaskPool'
    }
    return 'TeacherExamWorkspaceScoreSummary'
  }
  if (exam.questionCount <= 0) {
    return 'TeacherExamWorkspacePrep'
  }
  return 'TeacherExamWorkspaceScanBatches'
}

export function resolveJourneyIndex(journeyKey: ExamJourneyKey): number {
  const order: ExamJourneyKey[] = [
    MarkTeacherDashboardJourneyKeyCode.PREP,
    MarkTeacherDashboardJourneyKeyCode.SCAN,
    MarkTeacherDashboardJourneyKeyCode.ASSIGN,
    MarkTeacherDashboardJourneyKeyCode.MARK,
    MarkTeacherDashboardJourneyKeyCode.PUBLISH,
    MarkTeacherDashboardJourneyKeyCode.ARCHIVE,
  ]
  return order.indexOf(journeyKey)
}
