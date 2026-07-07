import type { ExamStatusCode } from '@/apis/mark/exam'
/**
 * 教师阅卷概览 API - 对接 MarkTeacherDashboardController
 */
import type { ExtendedAxiosRequestConfig } from '@/config/axios/types'
import type { MarkStageKey } from '@/stores/modules/markStage'
import type { MarkTeacherDashboardJourneyKeyCode } from '@/types/enums/mark-teacher-dashboard-journey-key-enum'
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

/** POST /api/mark/teacher/dashboard/overview */
export function loadTeacherDashboardOverview(
  query: MarkTeacherDashboardQuery = {},
  config?: ExtendedAxiosRequestConfig,
): Promise<MarkTeacherDashboardOverviewVO> {
  return http.post<MarkTeacherDashboardOverviewVO>(
    '/api/mark/teacher/dashboard/overview',
    query,
    config,
  )
}

/** 静默拉取概览：筛选回退 bootstrap 用，不触发全局错误 toast。 */
export function loadTeacherDashboardOverviewSilent(
  query: MarkTeacherDashboardQuery = {},
): Promise<MarkTeacherDashboardOverviewVO> {
  return loadTeacherDashboardOverview(query, { showErrorMessage: false })
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
export function loadTeacherDashboardOverviewOnce(
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
