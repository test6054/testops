import type { ExamStatusCode } from '@/apis/mark/exam'
/**
 * 教师阅卷概览 API - 对接 MarkTeacherDashboardController
 */
import type { ExtendedAxiosRequestConfig } from '@/config/axios/types'
import type { MarkStageKey } from '@/stores/modules/markStage'
import type { PageResult, QueryDto } from '@/types'
import type { MarkTeacherDashboardJourneyKeyCode } from '@/types/enums/mark-teacher-dashboard-journey-key-enum'
import type { MarkTeacherDashboardPendingTodoScopeCode } from '@/types/enums/mark-teacher-dashboard-pending-todo-scope-enum'
import type { MarkTeacherDashboardTodoTypeCode } from '@/types/enums/mark-teacher-dashboard-todo-type-enum'
import type { SemesterCode } from '@/types/enums/semester-enum'
import http from '@/config/axios'

export { MarkTeacherDashboardJourneyKeyCode } from '@/types/enums/mark-teacher-dashboard-journey-key-enum'
export {
  MarkTeacherDashboardTodoTypeCode,
  MarkTeacherDashboardTodoTypeDescription,
} from '@/types/enums/mark-teacher-dashboard-todo-type-enum'

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
  urgentTodoCount: number
  arbitrationPendingCount: number
  spotCheckPendingCount: number
  attentionTodoCount: number
  pendingTodoRowCount: number
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

/** 近 N 日进度趋势点：确认题量 / 发布成绩份数 */
export interface MarkTeacherDashboardDailyTrendItemVO {
  day: string
  confirmedGradeCount: number
  publishedScoreCount: number
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
  examNo?: string
  academicYear?: string
  semester?: SemesterCode
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
  averageScore?: number
  maxScore?: number
  minScore?: number
  passRate?: number
  fullScore?: number
  passScore?: number
}

export interface MarkTeacherDashboardOverviewVO {
  filterContext: MarkTeacherDashboardFilterContextVO
  filterOptions: MarkTeacherDashboardFilterOptionsVO
  signalMetrics: MarkTeacherDashboardSignalMetricsVO
  markingProgressSummary: MarkTeacherDashboardMarkingProgressSummaryVO
  dailyProgressTrend: MarkTeacherDashboardDailyTrendItemVO[]
  todoTypeSummary: MarkTeacherDashboardTodoTypeSummaryItemVO[]
  journeyStageSummary: MarkTeacherDashboardJourneyStageSummaryItemVO[]
  ongoingExamPage: PageResult<MarkTeacherDashboardOngoingExamItemVO>
  pendingTodoPage: PageResult<MarkTeacherDashboardPendingTodoItemVO>
  publishedExamInsights: MarkTeacherDashboardPublishedExamInsightItemVO[]
}

export interface MarkTeacherDashboardOngoingExamPageQuery extends QueryDto {
  /** 六步旅程筛选键；缺省表示不过滤 */
  journeyKey?: MarkTeacherDashboardJourneyKeyCode
}

export interface MarkTeacherDashboardPendingTodoPageQuery extends QueryDto {
  todoScope?: MarkTeacherDashboardPendingTodoScopeCode
}

export interface MarkTeacherDashboardQuery {
  academicYear?: string
  semester?: SemesterCode
  status?: ExamStatusCode
  publishedInsightLimit?: number
}

export interface MarkTeacherDashboardSectionQuery extends MarkTeacherDashboardQuery {
  loadKey: string
  ongoingExamPage?: MarkTeacherDashboardOngoingExamPageQuery
  pendingTodoPage?: MarkTeacherDashboardPendingTodoPageQuery
}

export interface MarkTeacherDashboardSignalSectionVO {
  loadKey: string
  filterContext: MarkTeacherDashboardFilterContextVO
  filterOptions: MarkTeacherDashboardFilterOptionsVO
  signalMetrics: MarkTeacherDashboardSignalMetricsVO
  markingProgressSummary: MarkTeacherDashboardMarkingProgressSummaryVO
  dailyProgressTrend?: MarkTeacherDashboardDailyTrendItemVO[]
}

export interface MarkTeacherDashboardExamsSectionVO {
  ongoingExamPage: PageResult<MarkTeacherDashboardOngoingExamItemVO>
  publishedExamInsights: MarkTeacherDashboardPublishedExamInsightItemVO[]
  journeyStageSummary: MarkTeacherDashboardJourneyStageSummaryItemVO[]
  todoTypeSummary: MarkTeacherDashboardTodoTypeSummaryItemVO[]
  markingProgressSummary: MarkTeacherDashboardMarkingProgressSummaryVO
  signalMetrics?: MarkTeacherDashboardSignalMetricsVO
}

export interface MarkTeacherDashboardTodosSectionVO {
  pendingTodoPage: PageResult<MarkTeacherDashboardPendingTodoItemVO>
  todoTypeSummary: MarkTeacherDashboardTodoTypeSummaryItemVO[]
}

/** POST /api/mark/teacher/dashboard/overview/signal */
export function loadTeacherDashboardSignalSection(
  query: MarkTeacherDashboardQuery = {},
  config?: ExtendedAxiosRequestConfig,
): Promise<MarkTeacherDashboardSignalSectionVO> {
  return http.post<MarkTeacherDashboardSignalSectionVO>(
    '/api/mark/teacher/dashboard/overview/signal',
    query,
    config,
  )
}

export function loadTeacherDashboardSignalSectionSilent(
  query: MarkTeacherDashboardQuery = {},
): Promise<MarkTeacherDashboardSignalSectionVO> {
  return loadTeacherDashboardSignalSection(query, { showErrorMessage: false })
}

/** POST /api/mark/teacher/dashboard/overview/exams */
export function loadTeacherDashboardExamsSection(
  query: MarkTeacherDashboardSectionQuery,
  config?: ExtendedAxiosRequestConfig,
): Promise<MarkTeacherDashboardExamsSectionVO> {
  return http.post<MarkTeacherDashboardExamsSectionVO>(
    '/api/mark/teacher/dashboard/overview/exams',
    query,
    config,
  )
}

/** POST /api/mark/teacher/dashboard/overview/todos */
export function loadTeacherDashboardTodosSection(
  query: MarkTeacherDashboardSectionQuery,
  config?: ExtendedAxiosRequestConfig,
): Promise<MarkTeacherDashboardTodosSectionVO> {
  return http.post<MarkTeacherDashboardTodosSectionVO>(
    '/api/mark/teacher/dashboard/overview/todos',
    query,
    config,
  )
}
