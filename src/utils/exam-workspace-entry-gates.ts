import type {
  MarkingProgressVO,
  WorkbenchNextActionKeyCode,
  WorkbenchNextActionVO,
} from '@/apis/mark/exam-progress'
import type { ExamJourneyKey } from '@/constants/exam-journey'
import type { MarkStageKey } from '@/stores/modules/markStage'
import { resolveScanStageEntryRouteName } from '@/utils/resolve-scan-stage-entry'

const NEXT_ACTION_ROUTE: Record<WorkbenchNextActionKeyCode, string> = {
  START_SCAN: 'TeacherExamWorkspaceScanBatches',
  ENTER_REVIEW: 'TeacherExamWorkspaceReviewBatchConfirm',
  ENTER_MARKING: 'TeacherExamWorkspaceMarkingTaskPool',
}

/** 是否存在扫描登记硬阻断 */
export function hasPrepHardBlocking(prepBlockingReasons: string[] | null | undefined): boolean {
  return (prepBlockingReasons?.length ?? 0) > 0
}

export function findWorkbenchNextAction(
  nextActions: WorkbenchNextActionVO[] | null | undefined,
  actionKey: WorkbenchNextActionKeyCode,
): WorkbenchNextActionVO | undefined {
  return nextActions?.find((item) => item.actionKey === actionKey)
}

/**
 * 是否允许从准备页进入扫描登记：消费后端 nextActions.START_SCAN，无 nextActions 时仅看硬阻断。
 */
export function canStartScanRegistration(
  prepBlockingReasons: string[] | null | undefined,
  nextActions?: WorkbenchNextActionVO[] | null,
): boolean {
  const action = findWorkbenchNextAction(nextActions, 'START_SCAN')
  if (action) {
    return action.enabled
  }
  return !hasPrepHardBlocking(prepBlockingReasons)
}

/** 是否允许进入批量复核：消费后端 nextActions.ENTER_REVIEW */
export function canEnterReviewBatch(
  nextActions?: WorkbenchNextActionVO[] | null,
  progress?: MarkingProgressVO | null,
): boolean {
  const action = findWorkbenchNextAction(nextActions, 'ENTER_REVIEW')
  if (action) {
    return action.enabled
  }
  if (!progress) {
    return false
  }
  const needReviewGrades = progress.needReviewGradeResultCount ?? 0
  if (needReviewGrades > 0) {
    return true
  }
  const pendingReview = progress.pendingReviewTaskCount + progress.inProgressReviewTaskCount
  return progress.gradablePaperCount > 0 && pendingReview > 0
}

export function resolveNextActionDisabledReason(
  nextActions: WorkbenchNextActionVO[] | null | undefined,
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
  nextActions: WorkbenchNextActionVO[] | null | undefined,
  suggestedStageKey?: MarkStageKey | null,
): WorkbenchNextActionVO | undefined {
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
  if (actionKey === 'START_SCAN' && examId) {
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

export function resolveSmartExamEntryRouteName(exam: {
  status: string
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
  const needReviewGrades = exam.needReviewGradeResultCount ?? 0
  if (countBlockingScanAttention(exam.scanAttentionCount, needReviewGrades) > 0) {
    return 'TeacherExamWorkspaceScanLiveMonitor'
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
  const order: ExamJourneyKey[] = ['prep', 'scan', 'assign', 'mark', 'publish', 'archive']
  return order.indexOf(journeyKey)
}
