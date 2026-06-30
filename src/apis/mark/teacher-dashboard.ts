/**
 * 教师阅卷概览 API - 对接 MarkTeacherDashboardController
 */
import type { ExamStatusCode } from '@/apis/mark/exam'
import type { MarkStageKey } from '@/stores/modules/markStage'
import type { SemesterCode } from '@/types/enums/semester-enum'

import http from '@/config/axios'
import { isValidSemesterCode } from '@/types/enums/semester-enum'

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
  semester?: SemesterCode
  status?: ExamStatusCode
  filteredExamCount: number
}

export interface MarkTeacherDashboardFilterOptionsVO {
  academicYears: string[]
  semesters: SemesterCode[]
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
  semester?: SemesterCode
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
  semester?: SemesterCode
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
  semester?: SemesterCode
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

function assertOptionalSemesterCode(value: unknown, field: string): SemesterCode | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined
  }
  if (typeof value !== 'string' || !isValidSemesterCode(value)) {
    throw new TypeError(`阅卷概览响应缺少合法字段：${field}`)
  }
  return value
}

function assertSemesterCodeList(values: unknown, field: string): SemesterCode[] {
  if (!Array.isArray(values)) {
    throw new TypeError(`阅卷概览响应缺少合法字段：${field}`)
  }
  return values.map((item, index) => {
    if (typeof item !== 'string' || !isValidSemesterCode(item)) {
      throw new TypeError(`阅卷概览响应缺少合法字段：${field}[${index}]`)
    }
    return item
  })
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
  exam.semester = assertOptionalSemesterCode(exam.semester, `ongoingExams[${index}].semester`)
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
  insight.semester = assertOptionalSemesterCode(insight.semester, `publishedExamInsights[${index}].semester`)
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
  filterContext.semester = assertOptionalSemesterCode(filterContext.semester, 'filterContext.semester')

  const filterOptions = data.filterOptions
  if (!filterOptions) {
    throw new TypeError('阅卷概览响应缺少 filterOptions')
  }
  if (!Array.isArray(filterOptions.academicYears)) {
    throw new TypeError('阅卷概览响应缺少 filterOptions.academicYears')
  }
  filterOptions.semesters = assertSemesterCodeList(filterOptions.semesters, 'filterOptions.semesters')
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

/** POST /api/mark/teacher/dashboard/overview */
export async function loadTeacherDashboardOverview(
  query: MarkTeacherDashboardQuery = {},
): Promise<MarkTeacherDashboardOverviewVO> {
  const data = await http.post<MarkTeacherDashboardOverviewVO>('/api/mark/teacher/dashboard/overview', query)
  return validateTeacherDashboardOverview(data)
}

let inflightOverviewRequest: Promise<MarkTeacherDashboardOverviewVO> | null = null
let inflightOverviewQueryKey = ''

function buildOverviewQueryKey(query: MarkTeacherDashboardQuery): string {
  return JSON.stringify({
    academicYear: query.academicYear ?? '',
    semester: query.semester ?? '',
    status: query.status ?? '',
    ongoingLimit: query.ongoingLimit ?? '',
    publishedInsightLimit: query.publishedInsightLimit ?? '',
    todoLimit: query.todoLimit ?? '',
  })
}

/** 同屏多段加载共用一次 overview 请求；后端分段契约就绪后可替换为独立 endpoint。 */
function loadTeacherDashboardOverviewOnce(
  query: MarkTeacherDashboardQuery = {},
): Promise<MarkTeacherDashboardOverviewVO> {
  const queryKey = buildOverviewQueryKey(query)
  if (!inflightOverviewRequest || inflightOverviewQueryKey !== queryKey) {
    inflightOverviewQueryKey = queryKey
    inflightOverviewRequest = loadTeacherDashboardOverview(query).finally(() => {
      inflightOverviewRequest = null
      inflightOverviewQueryKey = ''
    })
  }
  return inflightOverviewRequest
}

/** 信号带分段：KPI、筛选上下文与进度汇总。 */
export async function loadTeacherDashboardSignalSection(
  query: MarkTeacherDashboardQuery = {},
): Promise<MarkTeacherDashboardOverviewVO> {
  return loadTeacherDashboardOverviewOnce(query)
}

/** 考试卡片分段：进行中考试与已发布学情。 */
export async function loadTeacherDashboardExamsSection(
  query: MarkTeacherDashboardQuery = {},
): Promise<MarkTeacherDashboardOverviewVO> {
  return loadTeacherDashboardOverviewOnce(query)
}

/** 待办分段：租户级待办 TopN。 */
export async function loadTeacherDashboardTodosSection(
  query: MarkTeacherDashboardQuery = {},
): Promise<MarkTeacherDashboardOverviewVO> {
  return loadTeacherDashboardOverviewOnce(query)
}
