import type { ExamWorkbenchSummaryResponse } from '@/apis/mark/exam'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { ExamStatusCode } from '@/apis/mark/exam'
import { formatExamSubMeta } from '@/utils/exam-display-meta'

/** 阅卷确认进度百分比（0–100）。 */
export function getExamGradingPercent(exam: ExamWorkbenchSummaryResponse): number {
  const total = exam.totalQuestionGradeCount
  if (total <= 0) return 0
  return Math.round((exam.confirmedQuestionGradeCount / total) * 100)
}

export function progressFillClass(exam: ExamWorkbenchSummaryResponse): string {
  const percent = getExamGradingPercent(exam)
  if (percent >= 100) return 'exam-list-page__progress-fill--success'
  if (percent < 50) return 'exam-list-page__progress-fill--warning'
  return ''
}

export function progressPercentClass(exam: ExamWorkbenchSummaryResponse): string {
  const percent = getExamGradingPercent(exam)
  if (percent >= 100) return 'exam-list-page__progress-pct--ok'
  if (percent <= 0) return 'exam-list-page__progress-pct--zero'
  if (percent <= 50) return 'exam-list-page__progress-pct--warn'
  return ''
}

export function isExamPriorityRow(exam: ExamWorkbenchSummaryResponse): boolean {
  return exam.hasPrioritySignal === true
}

export function priorityReasonLabel(exam: ExamWorkbenchSummaryResponse): string {
  const message = exam.primaryPriorityReasonMessage?.trim()
  if (message) {
    return message
  }
  return '优先'
}

/** 考试名列副行：编号 · 院系。 */
export function examListExamSubMeta(exam: ExamWorkbenchSummaryResponse): string {
  return formatExamSubMeta(exam.examNo, exam.departmentName)
}

/**
 * 关考 / tip 待建袋 / 阅卷已满均可进 S1 复盘。
 * @param exam 考试工作台摘要
 * @param isAttentionExam 当前考试是否在 S1 自动建袋关注集合内
 */
export function isExamArchiveReady(
  exam: ExamWorkbenchSummaryResponse,
  isAttentionExam: boolean,
): boolean {
  if (isAttentionExam) {
    return true
  }
  if (exam.status === ExamStatusCode.CLOSED) {
    return true
  }
  return getExamGradingPercent(exam) >= 100
}

/** 从列表行内嵌进度字段提取待确认题数、扫描异常与进行中批阅任务数。 */
export function resolveExamProgressSnapshot(exam: ExamWorkbenchSummaryResponse): {
  pendingGrades: number
  scanAttention: number
  openMarking: number
} {
  return {
    pendingGrades: Math.max(0, exam.totalQuestionGradeCount - exam.confirmedQuestionGradeCount),
    scanAttention: exam.scanAttentionCount,
    openMarking: exam.openProcessingTaskCount,
  }
}

export function getPendingConfirmCount(exam: ExamWorkbenchSummaryResponse): number {
  return resolveExamProgressSnapshot(exam).pendingGrades
}

export function getScanAttentionCount(exam: ExamWorkbenchSummaryResponse): number {
  return resolveExamProgressSnapshot(exam).scanAttention
}

export function getOpenMarkingCount(exam: ExamWorkbenchSummaryResponse): number {
  return resolveExamProgressSnapshot(exam).openMarking
}

/** 教师视角参与身份：主考 / 评阅 / 管理员占位。 */
export function examParticipationLabel(
  exam: ExamWorkbenchSummaryResponse,
  isAdminView: boolean,
): string {
  if (exam.canManageOwnerExamLifecycleWrites === true) {
    return '主考'
  }
  if (isAdminView) {
    return '—'
  }
  return '评阅'
}

export function examParticipationTone(
  exam: ExamWorkbenchSummaryResponse,
  isAdminView: boolean,
): BadgeTone {
  if (exam.canManageOwnerExamLifecycleWrites === true) {
    return 'green'
  }
  if (isAdminView) {
    return 'gray'
  }
  return 'blue'
}
