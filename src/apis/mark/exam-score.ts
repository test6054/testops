import type { BindingStatusCode } from './exam-binding'
import type { CandidateStatusCode } from './exam-scope'
import type { FinalScoreStatusCode } from './final-score-status'
/**
 * 阅卷考试成绩汇总与最终成绩 API - 对接 /api/mark/exams/score-* 与 final-scores 接口。
 */
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

/** 答卷展示信息 - 对应 PaperInstanceDisplayVO */
export interface PaperInstanceDisplayVO {
  displayMode?: 'REAL_NAME' | 'ANONYMOUS' | 'UNBOUND'
  paperInstanceId?: string
  candidateRosterId?: string
  studentUserId?: string
  studentNo?: string
  studentName?: string
  classId?: string
  className?: string
  anonymousNo?: string
  primaryText: string
  secondaryText?: string
}

/** 考试成绩汇总查询请求 - 对应 ExamScoreSummaryQueryRequest */
export interface ExamScoreSummaryQueryRequest extends QueryDto {
  examId: string
  /** 最终成绩状态过滤；空表示不过滤，含未生成最终成绩的考生 */
  finalScoreStatus?: FinalScoreStatusCode
  /** 学号或姓名关键词（模糊匹配） */
  keyword?: string
  /** 参考班级 ID */
  classId?: string
  /** 仅查询已绑定但未发布最终成绩的试卷 */
  unpublishedBoundOnly?: boolean
}

/** 考试成绩汇总项 - 对应 ExamScoreSummaryItemResponse */
export interface ExamScoreSummaryItemResponse {
  candidateRosterId: string
  classId: string
  studentClassName: string
  studentUserId: string
  studentNo: string
  studentName: string
  candidateStatus?: CandidateStatusCode
  /** 试卷实例ID，未绑定试卷时为 undefined */
  paperInstanceId?: string
  bindingStatus: BindingStatusCode
  scanBatchId?: string
  finalScoreStatus: FinalScoreStatusCode
  finalScoreStatusMessage: string
  finalScore?: number
  examScore?: number
  dailyScore?: number
  confirmedTime?: string
  confirmedUserId?: string
  paperDisplay: PaperInstanceDisplayVO
}

/** 最终成绩风险原因编码 - 对应后端全场风险概览输出 */
export type FinalScoreRiskReasonCode
  = | 'ABNORMAL_PAPER'
    | 'UNRECONCILED_ABSENCE'
    | 'MISSING_QUESTION_GRADE'
    | 'UNCONFIRMED_QUESTION_GRADE'
    | 'BLOCKING_INCIDENT'
    | 'PENDING_DUPLICATE_IMAGE'
    | 'SAFE_CONFIRMABLE'

/** 最终成绩全场风险概览请求 - 对应 FinalScoreRiskOverviewRequest */
export interface FinalScoreRiskOverviewRequest {
  examId: string
}

/** 最终成绩风险原因 - 对应 FinalScoreRiskReasonResponse */
export interface FinalScoreRiskReasonResponse {
  reasonCode: FinalScoreRiskReasonCode
  reasonName: string
  count: number
}

/** 最终成绩全场风险概览 - 对应 FinalScoreRiskOverviewResponse */
export interface FinalScoreRiskOverviewResponse {
  totalCandidateCount: number
  pendingCount: number
  calculatedCount: number
  confirmedCount: number
  publishedCount: number
  withdrawnCount: number
  correctedCount: number
  safeConfirmableCount: number
  blockedCount: number
  missingQuestionGradeCount: number
  unconfirmedQuestionGradeCount: number
  abnormalPaperCount: number
  unreconciledAbsenceCount: number
  blockingIncidentCount: number
  pendingDuplicateImageCount: number
  readyToPublish: boolean
  riskReasons: FinalScoreRiskReasonResponse[]
  reviewedReasonCodes: FinalScoreRiskReasonCode[]
}

/** 最终成绩风险复核保存请求 - 对应 FinalScoreRiskReviewSaveRequest */
export interface FinalScoreRiskReviewSaveRequest {
  examId: string
  reviewedReasonCodes: FinalScoreRiskReasonCode[]
}

/** 安全批量确认最终成绩请求 - 对应 FinalScoreSafeBatchConfirmRequest */
export interface FinalScoreSafeBatchConfirmRequest {
  examId: string
}

/** 安全批量确认失败明细 - 对应 FinalScoreSafeBatchConfirmFailureResponse */
export interface FinalScoreSafeBatchConfirmFailureResponse {
  paperInstanceId: string
  code: string
  message: string
}

/** 安全批量确认最终成绩响应 - 对应 FinalScoreSafeBatchConfirmResponse */
export interface FinalScoreSafeBatchConfirmResponse {
  totalCandidateCount: number
  successCount: number
  skippedCount: number
  failureCount: number
  confirmedPaperInstanceIds: string[]
  failures: FinalScoreSafeBatchConfirmFailureResponse[]
  skipReasons: FinalScoreRiskReasonResponse[]
}

/** 全场批量发布最终成绩请求 - 对应 FinalScoreBatchPublishRequest */
export interface FinalScoreBatchPublishRequest {
  examId: string
}

/** 全场批量发布最终成绩失败明细 - 对应 FinalScoreBatchPublishFailureResponse */
export interface FinalScoreBatchPublishFailureResponse {
  paperInstanceId: string
  code: string
  message: string
}

/** 全场批量发布最终成绩响应 - 对应 FinalScoreBatchPublishResponse */
export interface FinalScoreBatchPublishResponse {
  totalCandidateCount: number
  publishableCount: number
  successCount: number
  alreadyPublishedCount: number
  remainingCount: number
  failureCount: number
  publishedPaperInstanceIds: string[]
  failures: FinalScoreBatchPublishFailureResponse[]
  beforeOverview: FinalScoreRiskOverviewResponse
  afterOverview: FinalScoreRiskOverviewResponse
}

/** 试卷最终成绩确认请求 - 对应 ExamFinalScoreConfirmRequest */
export interface ExamFinalScoreConfirmRequest {
  examId: string
  paperInstanceId: string
  /** 日常成绩；本场考试配置 dailyScoreFull 时必填 */
  dailyScore?: number
}

/** 试卷最终成绩发布请求 - 对应 ExamFinalScorePublishRequest */
export interface ExamFinalScorePublishRequest {
  examId: string
  paperInstanceId: string
}

/** 试卷最终成绩撤回请求 - 对应 ExamFinalScoreWithdrawRequest */
export interface ExamFinalScoreWithdrawRequest {
  examId: string
  paperInstanceId: string
  /** 撤回原因（必填，落入审计日志） */
  reason: string
}

/** 考试分数分布查询请求 */
export interface ExamScoreDistributionQueryRequest {
  examId: string
  classId?: string
}

/** 考试分数分布响应 */
export interface ExamScoreDistributionResponse {
  examId: string
  classId?: string
  fullScore: number
  passScore: number
  participantCount: number
  passCount: number
  avgScore: number
  maxScore: number
  minScore: number
  stdDev: number
  medianScore?: number
  excellentRate?: number
  ranges: string[]
  counts: number[]
}

/** 分页查询考试成绩汇总。 */
export function pageExamScoreSummary(
  request: ExamScoreSummaryQueryRequest,
): Promise<PageResult<ExamScoreSummaryItemResponse>> {
  return http.post<PageResult<ExamScoreSummaryItemResponse>>('/api/mark/exams/score-summary', request)
}

/** 查询最终成绩全场风险概览，前端不得由分页列表自行推断全场状态。 */
export function getFinalScoreRiskOverview(
  request: FinalScoreRiskOverviewRequest,
): Promise<FinalScoreRiskOverviewResponse> {
  return http.post<FinalScoreRiskOverviewResponse>('/api/mark/exams/final-scores/risk-overview', request)
}

/** 保存最终成绩风险复核状态，并返回最新风险概览。 */
export function saveFinalScoreRiskReview(
  request: FinalScoreRiskReviewSaveRequest,
): Promise<FinalScoreRiskOverviewResponse> {
  return http.post<FinalScoreRiskOverviewResponse>(
    '/api/mark/exams/final-scores/risk-review/save',
    request,
  )
}

/** 安全批量确认最终成绩，只确认后端判定为无阻塞风险的已计算成绩。 */
export function batchConfirmSafeFinalScores(
  request: FinalScoreSafeBatchConfirmRequest,
): Promise<FinalScoreSafeBatchConfirmResponse> {
  return http.post<FinalScoreSafeBatchConfirmResponse>(
    '/api/mark/exams/final-scores/batch-confirm-safe',
    request,
  )
}

/** 全场批量发布最终成绩，按考试全场口径筛选可发布成绩。 */
export function batchPublishFinalScores(
  request: FinalScoreBatchPublishRequest,
): Promise<FinalScoreBatchPublishResponse> {
  return http.post<FinalScoreBatchPublishResponse>('/api/mark/exams/final-scores/batch-publish', request)
}

/** 确认试卷最终成绩，仅落库 CONFIRMED 状态，不发送学生通知。 */
export function confirmFinalScore(request: ExamFinalScoreConfirmRequest): Promise<string> {
  return http.post<string>('/api/mark/exams/final-scores/confirm', request)
}

/** 发布试卷最终成绩，并向学生发送通知。 */
export function publishFinalScore(request: ExamFinalScorePublishRequest): Promise<string> {
  return http.post<string>('/api/mark/exams/final-scores/publish', request)
}

/** 撤回试卷最终成绩，撤回后学生侧成绩不再可见。 */
export function withdrawFinalScore(request: ExamFinalScoreWithdrawRequest): Promise<string> {
  return http.post<string>('/api/mark/exams/final-scores/withdraw', request)
}

/** 查询考试分数分布（五级分段直方图）。 */
export function getExamScoreDistribution(
  request: ExamScoreDistributionQueryRequest,
): Promise<ExamScoreDistributionResponse> {
  return http.post<ExamScoreDistributionResponse>('/api/mark/exams/score-distribution', request)
}
