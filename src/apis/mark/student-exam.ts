import type { AiAnalysisStatusCode } from './ai-analysis-status'
import type { ExamStatusCode } from './exam'
import type { BindingStatusCode } from './exam-binding'
import type { FinalScoreStatusCode } from './final-score-status'
import type { GradeStatusCode } from './grade-status'
import type { ObjectiveResultCode } from './objective-result'
import type { QuestionTypeCode } from './question-type'
import type { MasteryLevelCode } from './student-mastery-level'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

import { ReviewWindowPolicyStatusCode } from './grade-review'

export { ReviewWindowPolicyStatusCode, ReviewWindowPolicyStatusDescription } from './grade-review'

export const STUDENT_REVIEW_WINDOW_STATUS_TONE: Record<ReviewWindowPolicyStatusCode, BadgeTone> = {
  [ReviewWindowPolicyStatusCode.DRAFT]: 'gray',
  [ReviewWindowPolicyStatusCode.ACTIVE]: 'orange',
  [ReviewWindowPolicyStatusCode.CLOSED]: 'gray',
}

export interface StudentExamPageRequest extends QueryDto {
  keyword?: string
  finalScoreStatus?: FinalScoreStatusCode
  reviewWindowAppealableOnly?: boolean
  orderByPublishedTimeDesc?: boolean
}

export interface StudentExamStatsRequest {}

export interface StudentExamStatsResponse {
  totalExamCount: number
  publishedCount: number
  unpublishedCount: number
  reviewOpenCount: number
  appealableCount: number
}

export interface StudentExamItemVO {
  candidateRosterId: string
  studentUserId: string
  studentNo: string
  studentName: string
  classId?: string
  examId: string
  examName: string
  examNo: string
  examStatus: ExamStatusCode
  courseId?: string
  examStartTime: string
  examEndTime: string
  paperInstanceId?: string
  bindingStatus?: BindingStatusCode
  finalScoreId?: string
  finalScoreStatus: FinalScoreStatusCode
  finalScore?: number
  examScore?: number
  dailyScore?: number
  dailyScoreFull?: number
  publishedTime?: string
  reviewWindowOpenTime?: string
  reviewWindowCloseTime?: string
  reviewWindowStatus: ReviewWindowPolicyStatusCode
  /** 复核最大申请次数 */
  maxRequestCount?: number
  /** 本卷已使用申请次数（不含已驳回） */
  usedReviewRequestCount?: number
  /** 本卷开放中申请数 */
  openReviewRequestCount?: number
  /** 当前是否在复核时间窗内 */
  reviewWindowWithinTime?: boolean
  /** 服务端真源：是否可提交复核 */
  canSubmitReviewRequest?: boolean
  /** 涉密 / 统考涉密场次 */
  confidential?: boolean
}

export interface StudentQuestionScoreVO {
  layoutQuestionId: string
  questionNo: string
  questionType: QuestionTypeCode
  fullScore: number
  teacherReviewScore: number
  gradeStatus: GradeStatusCode
  objectiveResult?: ObjectiveResultCode
  /** 学生端 AI 改进内容，整卷 AI 评分生成并随教师确认保留 */
  improvementSuggestion?: string
  /** 学生端 AI 错题聚类标签，用于错题本快速归类 */
  mistakeClusterLabel?: string
}

export interface StudentScoreDetailResponse {
  examId: string
  examName: string
  examNo: string
  examStatus: ExamStatusCode
  courseId?: string
  examStartTime: string
  examEndTime: string
  candidateRosterId: string
  studentUserId: string
  studentNo: string
  studentName: string
  paperInstanceId?: string
  bindingStatus?: BindingStatusCode
  finalScoreId?: string
  finalScoreStatus: FinalScoreStatusCode
  totalScore?: number
  examScore?: number
  dailyScore?: number
  dailyScoreFull?: number
  fullScore?: number
  publishedTime?: string
  /** 题目教师复核评分之和；总分更正后可能与 examScore 不同 */
  questionScoreSum?: number
  /** 题分之和是否等于正式考试分 */
  questionScoreSumMatchesExamScore?: boolean
  /** 最近一次已执行更正是否为总分更正；true 时官方卷面分以 examScore/totalScore 为准 */
  latestTotalScoreCorrectionApplied?: boolean
  questions: StudentQuestionScoreVO[]
  reviewWindowOpenTime?: string
  reviewWindowCloseTime?: string
  reviewWindowStatus: ReviewWindowPolicyStatusCode
  maxRequestCount?: number
  usedReviewRequestCount?: number
  openReviewRequestCount?: number
  reviewWindowWithinTime?: boolean
  canSubmitReviewRequest?: boolean
  /** 涉密 / 统考涉密场次 */
  confidential?: boolean
}

export interface StudentAiDiagnosisItemResponse {
  questionType: QuestionTypeCode
  masteryLevel: MasteryLevelCode
  /** 得分率，后端返回 0-1 小数比例字符串，前端展示时转为百分比 */
  scoreRate: string
  lostQuestionNos?: string[]
  causeAnalysis?: string
  suggestion?: string
}

export interface StudentAiErrorClusterResponse {
  causeName: string
  causeDescription: string
  affectedCount: number
  typicalExamples: string[]
  questionType: QuestionTypeCode
  suggestion: string
}

export interface StudentAiLearningReportResponse {
  examId: string
  published: boolean
  available: boolean
  profileStatus?: AiAnalysisStatusCode
  clusterStatus?: AiAnalysisStatusCode
  profileMessage?: string
  clusterMessage?: string
  overallSummary?: string
  errorClusterSummary?: string
  diagnosisItems?: StudentAiDiagnosisItemResponse[]
  improvementSuggestions?: string[]
  errorClusters?: StudentAiErrorClusterResponse[]
}

/**
 * 学生单题答题明细 VO，仅在成绩已发布时由后端返回。
 *
 * 必填字段（PUBLISHED 守门后由后端校验）：
 * - examId / paperInstanceId / layoutQuestionId / questionNo / questionType / fullScore / teacherReviewScore / gradeStatus
 *
 * 可空字段（按题型 / OCR / 教师批阅状态决定）：
 * - sliceFileId / recognizedAnswer / commentText / objectiveResult
 *   / improvementSuggestion / mistakeClusterLabel / aiDiagnostic
 */
export interface StudentQuestionAnswerDetailResponse {
  examId: string
  paperInstanceId: string
  layoutQuestionId: string
  questionNo: string
  questionType: QuestionTypeCode
  fullScore: number
  teacherReviewScore: number
  gradeStatus: GradeStatusCode
  objectiveResult?: ObjectiveResultCode
  /** 作答切片文件 ID，客观题或未生成切片时为空 */
  sliceFileId?: string
  /** OCR 识别后的学生作答文本，未识别或主观题未作答空白时为空 */
  recognizedAnswer?: string
  /** 教师评语，未填写时为空 */
  commentText?: string
  /** 学生端 AI 学习内容 */
  improvementSuggestion?: string
  /** 学生端 AI 错题聚类标签 */
  mistakeClusterLabel?: string
  /** 题目级 AI 诊断信息 */
  aiDiagnostic?: string
}

export function pageMyExams(
  request: StudentExamPageRequest,
): Promise<PageResult<StudentExamItemVO>> {
  return http.post<PageResult<StudentExamItemVO>>('/api/mark/student/exams/page', request)
}

export function getMyExamStats(
  request: StudentExamStatsRequest = {},
): Promise<StudentExamStatsResponse> {
  return http.post<StudentExamStatsResponse>('/api/mark/student/exams/stats', request)
}

export function getMyScoreDetail(examId: string): Promise<StudentScoreDetailResponse> {
  return http.post<StudentScoreDetailResponse>('/api/mark/student/exams/score-detail', { examId })
}

export function getMyAiLearningReport(examId: string): Promise<StudentAiLearningReportResponse> {
  return http.post<StudentAiLearningReportResponse>('/api/mark/student/exams/ai-learning-report', {
    examId,
  })
}

/**
 * 查询当前学生指定考试中某一道题的答题明细。
 *
 * 后端守门：
 * - 学生身份未命中 candidate_roster -> FORBIDDEN
 * - 成绩未发布 -> CONFLICT（"成绩尚未发布，暂不能查看答题明细"）
 * - 制卷题目未命中 -> NOT_FOUND
 *
 * 调用方应保证仅在 finalScoreStatus = PUBLISHED 时调用，避免无谓的 CONFLICT 报错。
 */
export function getMyQuestionAnswerDetail(
  examId: string,
  layoutQuestionId: string,
): Promise<StudentQuestionAnswerDetailResponse> {
  return http.post<StudentQuestionAnswerDetailResponse>(
    '/api/mark/student/exams/question-answer-detail',
    {
      examId,
      layoutQuestionId,
    },
  )
}

/**
 * 学生是否可提交复核申请。
 * MVR-320：仅认 BE 下发 canSubmitReviewRequest===true；禁止缺省本地启发式回退（禁兼容）。
 */
export function canSubmitReview(item: StudentExamItemVO | StudentScoreDetailResponse): boolean {
  return item.canSubmitReviewRequest === true
}
