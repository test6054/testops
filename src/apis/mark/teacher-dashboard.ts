/**
 * 教师阅卷概览 API - 对接 MarkTeacherDashboardController
 */
import type { ExamStatusCode } from '@/apis/mark/exam'
import type { MarkStageKey } from '@/stores/modules/markStage'

import http from '@/config/axios'

export type MarkTeacherDashboardTodoTypeCode
  = | 'SCAN_ATTENTION'
    | 'PROCESSING_OPEN'
    | 'GRADE_PENDING'
    | 'REVIEW_PENDING'
    | 'SCORE_UNPUBLISHED'
    | 'CANDIDATE_UNBOUND'

export type MarkTeacherDashboardJourneyKeyCode
  = | 'prep'
    | 'scan'
    | 'assign'
    | 'mark'
    | 'publish'
    | 'archive'

export interface MarkTeacherDashboardFilterContextVO {
  tenantId: string
  academicYear?: string
  semester?: string
  status?: ExamStatusCode
  filteredExamCount: number
}

export interface MarkTeacherDashboardFilterOptionsVO {
  academicYears: string[]
  semesters: string[]
  statuses: ExamStatusCode[]
}

export interface MarkTeacherDashboardSignalMetricsVO {
  activeExamCount: number
  confirmedUnpublishedScoreCount: number
  recentCreatedExamCount: number
  candidateCount: number
  blockingTodoCount: number
}

export interface MarkTeacherDashboardMarkingProgressSummaryVO {
  candidateCount: number
  scanAttentionCount: number
  openProcessingTaskCount: number
  pendingReviewTaskCount: number
  pendingGradeCount: number
  confirmedUnpublishedScoreCount: number
  totalQuestionGradeCount: number
  confirmedQuestionGradeCount: number
}

export interface MarkTeacherDashboardTodoTypeSummaryItemVO {
  todoType: MarkTeacherDashboardTodoTypeCode
  count: number
}

export interface MarkTeacherDashboardJourneyStageSummaryItemVO {
  journeyKey: MarkTeacherDashboardJourneyKeyCode
  examCount: number
}

export interface MarkTeacherDashboardPendingTodoItemVO {
  todoType: MarkTeacherDashboardTodoTypeCode
  examId?: string
  examName?: string
  label: string
  count: number
  blocking?: boolean
  workspacePath: string
}

export interface MarkTeacherDashboardOngoingExamItemVO {
  examId: string
  examName: string
  examNo: string
  academicYear?: string
  semester?: string
  status: ExamStatusCode
  candidateCount?: number
  currentStageKey?: MarkStageKey
  currentStageTitle?: string
  progressPercent?: number
  scanAttentionCount?: number
  openProcessingTaskCount?: number
  pendingReviewTaskCount?: number
  pendingGradeCount?: number
  confirmedUnpublishedScoreCount?: number
  publishedScoreCount?: number
  blockingTodoCount?: number
  pendingTodos?: MarkTeacherDashboardPendingTodoItemVO[]
  recommendedWorkspacePath?: string
  updateTime?: string
}

export interface MarkTeacherDashboardPublishedExamInsightItemVO {
  examId: string
  examName: string
  academicYear?: string
  semester?: string
  participantCount: number
  averageScore?: string
  maxScore?: string
  minScore?: string
  passRate?: string
  fullScore?: string
  passScore?: string
}

export interface MarkTeacherDashboardOverviewVO {
  filterContext: MarkTeacherDashboardFilterContextVO
  filterOptions: MarkTeacherDashboardFilterOptionsVO
  signalMetrics: MarkTeacherDashboardSignalMetricsVO
  markingProgressSummary: MarkTeacherDashboardMarkingProgressSummaryVO
  todoTypeSummary: MarkTeacherDashboardTodoTypeSummaryItemVO[]
  journeyStageSummary: MarkTeacherDashboardJourneyStageSummaryItemVO[]
  ongoingExams: MarkTeacherDashboardOngoingExamItemVO[]
  pendingTodos: MarkTeacherDashboardPendingTodoItemVO[]
  publishedExamInsights: MarkTeacherDashboardPublishedExamInsightItemVO[]
}

export interface MarkTeacherDashboardQuery {
  academicYear?: string
  semester?: string
  status?: ExamStatusCode
  ongoingLimit?: number
  publishedInsightLimit?: number
  todoLimit?: number
}

function assertCount(value: unknown, field: string): number {
  const count = Number(value)
  if (!Number.isFinite(count) || count < 0) {
    throw new TypeError(`阅卷概览响应缺少合法字段：${field}`)
  }
  return count
}

function assertRequiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`阅卷概览响应缺少合法字段：${field}`)
  }
  return value
}

const TODO_TYPE_CODES: MarkTeacherDashboardTodoTypeCode[] = [
  'SCAN_ATTENTION',
  'PROCESSING_OPEN',
  'GRADE_PENDING',
  'REVIEW_PENDING',
  'SCORE_UNPUBLISHED',
  'CANDIDATE_UNBOUND',
]

const JOURNEY_KEY_CODES: MarkTeacherDashboardJourneyKeyCode[] = [
  'prep',
  'scan',
  'assign',
  'mark',
  'publish',
  'archive',
]

function assertTodoType(value: unknown, field: string): MarkTeacherDashboardTodoTypeCode {
  if (typeof value !== 'string' || !TODO_TYPE_CODES.includes(value as MarkTeacherDashboardTodoTypeCode)) {
    throw new TypeError(`阅卷概览响应缺少合法字段：${field}`)
  }
  return value as MarkTeacherDashboardTodoTypeCode
}

function assertJourneyKey(value: unknown, field: string): MarkTeacherDashboardJourneyKeyCode {
  if (typeof value !== 'string' || !JOURNEY_KEY_CODES.includes(value as MarkTeacherDashboardJourneyKeyCode)) {
    throw new TypeError(`阅卷概览响应缺少合法字段：${field}`)
  }
  return value as MarkTeacherDashboardJourneyKeyCode
}

function validatePendingTodoItem(
  item: unknown,
  index: number,
): MarkTeacherDashboardPendingTodoItemVO {
  if (!item || typeof item !== 'object') {
    throw new TypeError(`阅卷概览响应 pendingTodos[${index}] 无效`)
  }
  const todo = item as MarkTeacherDashboardPendingTodoItemVO
  assertTodoType(todo.todoType, `pendingTodos[${index}].todoType`)
  assertRequiredString(todo.label, `pendingTodos[${index}].label`)
  assertCount(todo.count, `pendingTodos[${index}].count`)
  assertRequiredString(todo.workspacePath, `pendingTodos[${index}].workspacePath`)
  if (todo.examId != null) {
    assertRequiredString(todo.examId, `pendingTodos[${index}].examId`)
  }
  return todo
}

function validateOngoingExamItem(
  item: unknown,
  index: number,
): MarkTeacherDashboardOngoingExamItemVO {
  if (!item || typeof item !== 'object') {
    throw new TypeError(`阅卷概览响应 ongoingExams[${index}] 无效`)
  }
  const exam = item as MarkTeacherDashboardOngoingExamItemVO
  assertRequiredString(exam.examId, `ongoingExams[${index}].examId`)
  assertRequiredString(exam.examName, `ongoingExams[${index}].examName`)
  assertRequiredString(exam.examNo, `ongoingExams[${index}].examNo`)
  assertRequiredString(exam.status, `ongoingExams[${index}].status`)
  if (exam.pendingTodos != null) {
    exam.pendingTodos.forEach((todo, todoIndex) => {
      validatePendingTodoItem(todo, todoIndex)
    })
  }
  return exam
}

function validatePublishedInsightItem(
  item: unknown,
  index: number,
): MarkTeacherDashboardPublishedExamInsightItemVO {
  if (!item || typeof item !== 'object') {
    throw new TypeError(`阅卷概览响应 publishedExamInsights[${index}] 无效`)
  }
  const insight = item as MarkTeacherDashboardPublishedExamInsightItemVO
  assertRequiredString(insight.examId, `publishedExamInsights[${index}].examId`)
  assertRequiredString(insight.examName, `publishedExamInsights[${index}].examName`)
  assertCount(insight.participantCount, `publishedExamInsights[${index}].participantCount`)
  if (insight.passRate != null && insight.passRate !== '') {
    const passRate = Number(insight.passRate)
    if (!Number.isFinite(passRate) || passRate < 0 || passRate > 1) {
      throw new TypeError(`阅卷概览响应缺少合法字段：publishedExamInsights[${index}].passRate`)
    }
  }
  return insight
}

/** 校验 MarkTeacherDashboardResponse 必需字段。 */
export function validateTeacherDashboardOverview(data: MarkTeacherDashboardOverviewVO): MarkTeacherDashboardOverviewVO {
  if (!data || typeof data !== 'object') {
    throw new TypeError('阅卷概览响应为空')
  }
  const filterContext = data.filterContext
  if (!filterContext) {
    throw new TypeError('阅卷概览响应缺少 filterContext')
  }
  assertRequiredString(filterContext.tenantId, 'filterContext.tenantId')
  assertCount(filterContext.filteredExamCount, 'filterContext.filteredExamCount')

  const filterOptions = data.filterOptions
  if (!filterOptions) {
    throw new TypeError('阅卷概览响应缺少 filterOptions')
  }
  if (!Array.isArray(filterOptions.academicYears)) {
    throw new TypeError('阅卷概览响应缺少 filterOptions.academicYears')
  }
  if (!Array.isArray(filterOptions.semesters)) {
    throw new TypeError('阅卷概览响应缺少 filterOptions.semesters')
  }
  if (!Array.isArray(filterOptions.statuses)) {
    throw new TypeError('阅卷概览响应缺少 filterOptions.statuses')
  }

  const signalMetrics = data.signalMetrics
  if (!signalMetrics) {
    throw new TypeError('阅卷概览响应缺少 signalMetrics')
  }
  assertCount(signalMetrics.activeExamCount, 'signalMetrics.activeExamCount')
  assertCount(signalMetrics.confirmedUnpublishedScoreCount, 'signalMetrics.confirmedUnpublishedScoreCount')
  assertCount(signalMetrics.recentCreatedExamCount, 'signalMetrics.recentCreatedExamCount')
  assertCount(signalMetrics.candidateCount, 'signalMetrics.candidateCount')
  assertCount(signalMetrics.blockingTodoCount, 'signalMetrics.blockingTodoCount')

  const markingProgressSummary = data.markingProgressSummary
  if (!markingProgressSummary) {
    throw new TypeError('阅卷概览响应缺少 markingProgressSummary')
  }
  assertCount(markingProgressSummary.candidateCount, 'markingProgressSummary.candidateCount')
  assertCount(markingProgressSummary.scanAttentionCount, 'markingProgressSummary.scanAttentionCount')
  assertCount(markingProgressSummary.openProcessingTaskCount, 'markingProgressSummary.openProcessingTaskCount')
  assertCount(markingProgressSummary.pendingReviewTaskCount, 'markingProgressSummary.pendingReviewTaskCount')
  assertCount(markingProgressSummary.pendingGradeCount, 'markingProgressSummary.pendingGradeCount')
  assertCount(markingProgressSummary.confirmedUnpublishedScoreCount, 'markingProgressSummary.confirmedUnpublishedScoreCount')
  assertCount(markingProgressSummary.totalQuestionGradeCount, 'markingProgressSummary.totalQuestionGradeCount')
  assertCount(markingProgressSummary.confirmedQuestionGradeCount, 'markingProgressSummary.confirmedQuestionGradeCount')

  if (!Array.isArray(data.todoTypeSummary)) {
    throw new TypeError('阅卷概览响应缺少 todoTypeSummary')
  }
  data.todoTypeSummary.forEach((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new TypeError(`阅卷概览响应 todoTypeSummary[${index}] 无效`)
    }
    assertTodoType(item.todoType, `todoTypeSummary[${index}].todoType`)
    assertCount(item.count, `todoTypeSummary[${index}].count`)
  })

  if (!Array.isArray(data.journeyStageSummary)) {
    throw new TypeError('阅卷概览响应缺少 journeyStageSummary')
  }
  data.journeyStageSummary.forEach((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new TypeError(`阅卷概览响应 journeyStageSummary[${index}] 无效`)
    }
    assertJourneyKey(item.journeyKey, `journeyStageSummary[${index}].journeyKey`)
    assertCount(item.examCount, `journeyStageSummary[${index}].examCount`)
  })

  if (!Array.isArray(data.ongoingExams)) {
    throw new TypeError('阅卷概览响应缺少 ongoingExams')
  }
  data.ongoingExams.forEach((item, index) => {
    validateOngoingExamItem(item, index)
  })
  if (!Array.isArray(data.pendingTodos)) {
    throw new TypeError('阅卷概览响应缺少 pendingTodos')
  }
  data.pendingTodos.forEach((item, index) => {
    validatePendingTodoItem(item, index)
  })
  if (!Array.isArray(data.publishedExamInsights)) {
    throw new TypeError('阅卷概览响应缺少 publishedExamInsights')
  }
  data.publishedExamInsights.forEach((item, index) => {
    validatePublishedInsightItem(item, index)
  })
  return data
}

/** GET /api/mark/teacher/dashboard/overview */
export async function loadTeacherDashboardOverview(
  query: MarkTeacherDashboardQuery = {},
): Promise<MarkTeacherDashboardOverviewVO> {
  const data = await http.get<MarkTeacherDashboardOverviewVO>('/api/mark/teacher/dashboard/overview', {
    params: query,
  })
  return validateTeacherDashboardOverview(data)
}
