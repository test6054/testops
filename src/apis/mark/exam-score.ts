import type { BindingStatusCode } from './exam-binding'
import type { CandidateStatusCode } from './exam-scope'
import type { FinalScoreStatusCode } from './final-score-status'
/**
 * 阅卷考试成绩汇总与最终成绩 API - 对接 /api/mark/exams/score-* 与 final-scores 接口。
 */
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'
import { assertUserFacingFiniteNumber, assertUserFacingText } from '@/utils/contract-guard'

const EXAM_SCORE_DATA_ERROR = '成绩数据异常，请刷新后重试'

/** 答卷展示基础信息 - 对应 PaperInstanceDisplayVO 公共字段 */
interface PaperInstanceDisplayBaseVO {
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

/** 实名答卷展示信息 - 后端 REAL_NAME 分支必须返回学生身份字段 */
export interface RealNamePaperInstanceDisplayVO extends PaperInstanceDisplayBaseVO {
  displayMode: 'REAL_NAME'
  paperInstanceId: string
  studentUserId: string
  studentNo: string
  studentName: string
}

/** 匿名答卷展示信息 - 后端 ANONYMOUS 分支以匿名号作为主展示锚点 */
export interface AnonymousPaperInstanceDisplayVO extends PaperInstanceDisplayBaseVO {
  displayMode: 'ANONYMOUS'
  paperInstanceId: string
  anonymousNo: string
}

/** 未绑定答卷展示信息 - 后端 UNBOUND 分支表达合法扫描未绑定态 */
export interface UnboundPaperInstanceDisplayVO extends PaperInstanceDisplayBaseVO {
  displayMode: 'UNBOUND'
}

/** 答卷展示信息 - 对应 PaperInstanceDisplayVO */
export type PaperInstanceDisplayVO
  = | RealNamePaperInstanceDisplayVO
    | AnonymousPaperInstanceDisplayVO
    | UnboundPaperInstanceDisplayVO

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
export interface ExamScoreSummaryItemVO {
  candidateRosterId: string
  classId: string
  studentClassName: string
  studentUserId: string
  studentNo: string
  studentName: string
  candidateStatus?: CandidateStatusCode
  /** 试卷实例ID，未绑定试卷时为 undefined */
  paperInstanceId?: string
  bindingStatus?: BindingStatusCode
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
export interface FinalScoreRiskReasonVO {
  reasonCode: FinalScoreRiskReasonCode
  reasonName: string
  count: number
}

/** 最终成绩全场风险概览 - 对应 FinalScoreRiskOverviewResponse */
export interface FinalScoreRiskOverviewVO {
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
  riskReasons: FinalScoreRiskReasonVO[]
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
export interface FinalScoreSafeBatchConfirmFailureVO {
  paperInstanceId: string
  code: string
  message: string
}

/** 安全批量确认最终成绩响应 - 对应 FinalScoreSafeBatchConfirmResponse */
export interface FinalScoreSafeBatchConfirmVO {
  totalCandidateCount: number
  successCount: number
  skippedCount: number
  failureCount: number
  confirmedPaperInstanceIds: string[]
  failures: FinalScoreSafeBatchConfirmFailureVO[]
  skipReasons: FinalScoreRiskReasonVO[]
}

/** 全场批量发布最终成绩请求 - 对应 FinalScoreBatchPublishRequest */
export interface FinalScoreBatchPublishRequest {
  examId: string
}

/** 全场批量发布最终成绩失败明细 - 对应 FinalScoreBatchPublishFailureResponse */
export interface FinalScoreBatchPublishFailureVO {
  paperInstanceId: string
  code: string
  message: string
}

/** 全场批量发布最终成绩响应 - 对应 FinalScoreBatchPublishResponse */
export interface FinalScoreBatchPublishVO {
  totalCandidateCount: number
  publishableCount: number
  successCount: number
  alreadyPublishedCount: number
  remainingCount: number
  failureCount: number
  publishedPaperInstanceIds: string[]
  failures: FinalScoreBatchPublishFailureVO[]
  beforeOverview: FinalScoreRiskOverviewVO
  afterOverview: FinalScoreRiskOverviewVO
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
export interface ExamScoreDistributionVO {
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
  ranges: string[]
  counts: number[]
}

/** 考试分数分布合同校验，确保图表分段和计数可一一对应。 */
function validateExamScoreDistributionContract(
  record: ExamScoreDistributionVO,
): ExamScoreDistributionVO {
  assertUserFacingText(record.examId, EXAM_SCORE_DATA_ERROR)
  assertUserFacingFiniteNumber(record.fullScore, EXAM_SCORE_DATA_ERROR)
  assertUserFacingFiniteNumber(record.passScore, EXAM_SCORE_DATA_ERROR)
  assertUserFacingFiniteNumber(record.participantCount, EXAM_SCORE_DATA_ERROR)
  assertUserFacingFiniteNumber(record.passCount, EXAM_SCORE_DATA_ERROR)
  assertUserFacingFiniteNumber(record.avgScore, EXAM_SCORE_DATA_ERROR)
  assertUserFacingFiniteNumber(record.stdDev, EXAM_SCORE_DATA_ERROR)
  if (!Array.isArray(record.ranges) || !Array.isArray(record.counts)) {
    throw new TypeError(EXAM_SCORE_DATA_ERROR)
  }
  if (record.ranges.length !== record.counts.length) {
    throw new TypeError(EXAM_SCORE_DATA_ERROR)
  }
  return record
}

/** 分页查询考试成绩汇总。 */
export function pageExamScoreSummary(
  request: ExamScoreSummaryQueryRequest,
): Promise<PageResult<ExamScoreSummaryItemVO>> {
  return http.post<PageResult<ExamScoreSummaryItemVO>>('/api/mark/exams/score-summary', request)
}

/** 查询最终成绩全场风险概览，前端不得由分页列表自行推断全场状态。 */
export function getFinalScoreRiskOverview(
  request: FinalScoreRiskOverviewRequest,
): Promise<FinalScoreRiskOverviewVO> {
  return http.post<FinalScoreRiskOverviewVO>(
    '/api/mark/exams/final-scores/risk-overview',
    request,
  )
}

/** 保存最终成绩风险复核状态，并返回最新风险概览。 */
export function saveFinalScoreRiskReview(
  request: FinalScoreRiskReviewSaveRequest,
): Promise<FinalScoreRiskOverviewVO> {
  return http.post<FinalScoreRiskOverviewVO>(
    '/api/mark/exams/final-scores/risk-review/save',
    request,
  )
}

/** 安全批量确认最终成绩，只确认后端判定为无阻塞风险的已计算成绩。 */
export function batchConfirmSafeFinalScores(
  request: FinalScoreSafeBatchConfirmRequest,
): Promise<FinalScoreSafeBatchConfirmVO> {
  return http.post<FinalScoreSafeBatchConfirmVO>(
    '/api/mark/exams/final-scores/batch-confirm-safe',
    request,
  )
}

/** 全场批量发布最终成绩，按考试全场口径筛选可发布成绩。 */
export function batchPublishFinalScores(
  request: FinalScoreBatchPublishRequest,
): Promise<FinalScoreBatchPublishVO> {
  return http.post<FinalScoreBatchPublishVO>(
    '/api/mark/exams/final-scores/batch-publish',
    request,
  )
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
): Promise<ExamScoreDistributionVO> {
  return http
    .post<ExamScoreDistributionVO>('/api/mark/exams/score-distribution', request)
    .then(validateExamScoreDistributionContract)
}
