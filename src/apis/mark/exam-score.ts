import type { BindingStatusCode } from './exam-binding'
import type { CandidateStatusCode } from './exam-scope'
import type { FinalScoreStatusCode } from './final-score-status'
import type { PageResult, QueryDto } from '@/types'
/**
 * 阅卷考试成绩汇总与最终成绩 API - 对接 /api/mark/exams/score-* 与 final-scores 接口。
 */
import type { FinalScoreRiskReasonCode } from '@/types/enums/final-score-risk-reason-enum'
import type { PaperInstanceDisplayModeCode } from '@/types/enums/paper-instance-display-mode-enum'
import type { ResultCode } from '@/types/enums/result-code'
import http from '@/config/axios'

export {
  ALL_FINAL_SCORE_RISK_REASON_CODES,
  FinalScoreRiskReasonCode,
  FinalScoreRiskReasonDescription,
} from '@/types/enums/final-score-risk-reason-enum'

export {
  ALL_PAPER_INSTANCE_DISPLAY_MODE_CODES,
  PaperInstanceDisplayModeCode,
  PaperInstanceDisplayModeDescription,
} from '@/types/enums/paper-instance-display-mode-enum'

/** 答卷展示信息 - 对应 PaperInstanceDisplayVO */
export interface PaperInstanceDisplayVO {
  displayMode?: PaperInstanceDisplayModeCode
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
  /** 试卷绑定状态过滤；空表示不过滤 */
  bindingStatus?: BindingStatusCode
  /** 仅查询已绑定但未发布最终成绩的试卷 */
  unpublishedBoundOnly?: boolean
  /**
   * 仅查询当前用户可作为指定复核人签审通过的待发布复核卷。
   * 与后端 canApprovePublishReview 同源；服务端注入当前用户，前端只传开关。
   */
  pendingMyPublishReviewOnly?: boolean
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
  /** 缺考计零（SCORE_ZERO）：无扫描影像的合成卷锚点 */
  absenceScoreZero?: boolean
  finalScoreStatus: FinalScoreStatusCode
  finalScoreStatusMessage: string
  /** 正式总分；CALCULATED 不返回 */
  finalScore?: number
  /** 正式卷面分；CALCULATED 不返回 */
  examScore?: number
  dailyScore?: number
  /** AI 预估卷面分（非正式，仅 CALCULATED） */
  estimatedExamScore?: number
  /** AI 预估总分（非正式，仅 CALCULATED） */
  estimatedTotalScore?: number
  /** 题目教师复核评分之和；总分更正后可能与 examScore 不同 */
  questionScoreSum?: number
  /** 题分之和是否等于正式考试分；false 时官方分以 examScore 为准 */
  questionScoreSumMatchesExamScore?: boolean
  /** 最近一次已执行更正是否为总分更正 */
  latestTotalScoreCorrectionApplied?: boolean
  confirmedTime?: string
  confirmedUserId?: string
  /** 当前用户是否可提交发布复核 */
  canSubmitPublishReview?: boolean
  /** 当前用户是否可复核通过并发布 */
  canApprovePublishReview?: boolean
  /** 当前用户是否可退回发布复核 */
  canRejectPublishReview?: boolean
  /** 当前用户是否可撤销本人提交的发布复核 */
  canCancelPublishReview?: boolean
  /** 当前 PENDING 发布复核轮次 ID */
  publishReviewId?: string
  /** 发布复核提交人用户 ID */
  publishReviewSubmitUserId?: string
  /** 发布复核提交人姓名 */
  publishReviewSubmitUserName?: string
  /** 指定发布复核人用户 ID 列表 */
  publishReviewerUserIds?: string[]
  /** 指定发布复核人姓名列表 */
  publishReviewerNames?: string[]
  /** 最近一次退回原因 */
  publishReviewRejectReason?: string
  paperDisplay: PaperInstanceDisplayVO
}


/** 最终成绩就绪分组 - 对应 FinalScoreReadinessGroup */
export type FinalScoreReadinessGroupCode
  = | 'ABSENCE'
    | 'IMAGING'
    | 'GRADING'
    | 'SOFT_RISK'
    | 'PUBLISH'

/** 最终成绩就绪严重级别 - 对应 FinalScoreReadinessSeverity */
export type FinalScoreReadinessSeverityCode = 'HARD_BLOCK' | 'ACTION_REQUIRED' | 'INFO'

/** 最终成绩就绪动作 - 对应 FinalScoreReadinessAction */
export type FinalScoreReadinessActionCode
  = | 'NONE'
    | 'GO_ABSENCE'
    | 'REPAIR_SCORE_ZERO'
    | 'GO_QUESTION_REVIEW'
    | 'GO_SCAN_BATCHES'
    | 'OPEN_RISK_REVIEW'
    | 'BATCH_CONFIRM'
    | 'FILTER_CORRECTED'
    | 'FILTER_PENDING_PUBLISH_REVIEW'
    | 'FILTER_PENDING_MY_PUBLISH_REVIEW'
    | 'GO_DELAYED_TASKS'

/** 最终成绩就绪项 - 对应 FinalScoreReadinessItemResponse */
export interface FinalScoreReadinessItemResponse {
  code: FinalScoreRiskReasonCode
  groupCode: FinalScoreReadinessGroupCode
  severity: FinalScoreReadinessSeverityCode
  title: string
  description: string
  count: number
  actionCode: FinalScoreReadinessActionCode
  blocksConfirm: boolean
  blocksPublish: boolean
  /** 样例考生展示文案（姓名(学号)），后端真实回填，最多 5 条 */
  sampleLabels?: string[]
}

/** 最终成绩批量失败分组 - 对应 FinalScoreFailureGroupResponse */
export interface FinalScoreFailureGroupResponse {
  code: keyof typeof ResultCode
  message: string
  count: number
  samplePaperInstanceIds: string[]
  /** 样例考生展示文案（姓名(学号)），由后端反查名册 */
  sampleLabels?: string[]
}

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
  /** 已确认计零但尚未写入正式终分的人数 */
  missingAbsenceScoreZeroFinalCount: number
  blockingIncidentCount: number
  pendingDuplicateImageCount: number
  /** 待确认缺考记录数；与 ensureNoPendingAbsenceRecords 同源 */
  pendingAbsenceCount: number
  /** 已确认但仍使用待外部确认占位策略的缺考记录数 */
  unresolvedAbsenceScorePolicyCount: number
  /** BOUND 且可提交发布复核人数；与批量提交 SQL 同源 */
  publishableCount: number
  /** 待发布复核（PENDING_PUBLISH_REVIEW）卷数 */
  pendingPublishReviewCount: number
  /** 当前用户可签审通过的待发布复核卷数（待我复核） */
  pendingMyPublishReviewCount?: number
  /** 租户是否要求人工确认最终成绩 */
  manualFinalScoreConfirmRequired?: boolean
  /** 延迟自动确认分钟数 */
  delayedFinalScoreConfirmMinutes?: number
  /** 延迟自动确认进行中任务数 */
  pendingDelayedFinalScoreConfirmCount?: number
  /** 延迟自动确认失败任务数 */
  blockedDelayedFinalScoreConfirmCount?: number
  readyToSubmitPublishReview: boolean
  riskReasons: FinalScoreRiskReasonResponse[]
  reviewedReasonCodes: FinalScoreRiskReasonCode[]
  /** 分组就绪项真源；成绩确认页就绪度面板只消费此字段 */
  readinessItems: FinalScoreReadinessItemResponse[]
  /** 当前最高优先级就绪项编码 */
  primaryReadinessCode?: FinalScoreRiskReasonCode | null
  /** MVR-278：成绩确认/发布等阅卷写能力位 */
  canManageReviewerWrites?: boolean
  /** 是否可补齐缺考计零终分（评阅写、不叠 ACTIVE；关考后仍可） */
  canRepairAbsenceScoreZeroFinal?: boolean
}

/** 最终成绩风险复核保存请求 - 对应 FinalScoreRiskReviewSaveRequest */
export interface FinalScoreRiskReviewSaveRequest {
  examId: string
  reviewedReasonCodes: FinalScoreRiskReasonCode[]
}

/** 安全批量确认最终成绩条目 - 对应 FinalScoreSafeBatchConfirmItemRequest */
export interface FinalScoreSafeBatchConfirmItemRequest {
  paperInstanceId: string
  /** 日常成绩；本场考试配置 dailyScoreFull 时必填 */
  dailyScore?: number
}

/** 安全批量确认最终成绩请求 - 对应 FinalScoreSafeBatchConfirmRequest */
export interface FinalScoreSafeBatchConfirmRequest {
  examId: string
  /** 配置日常满分时必填；未配置日常分时不得传 */
  items?: FinalScoreSafeBatchConfirmItemRequest[]
}

/** 可安全批量确认考生 - 对应 FinalScoreSafeConfirmableCandidateResponse */
export interface FinalScoreSafeConfirmableCandidateResponse {
  paperInstanceId: string
  candidateRosterId: string
  studentUserId: string
  studentNo?: string
  studentName?: string
  classId?: string
  confirmedExamScore?: number
}

/** 可安全批量确认考生列表请求 */
export interface FinalScoreSafeConfirmableCandidatesRequest {
  examId: string
}

/** 安全批量确认最终成绩响应 - 对应 FinalScoreSafeBatchConfirmResponse */
export interface FinalScoreSafeBatchConfirmResponse {
  totalCandidateCount: number
  successCount: number
  skippedCount: number
  failureCount: number
  confirmedPaperInstanceIds: string[]
  failureGroups: FinalScoreFailureGroupResponse[]
  skipReasons: FinalScoreRiskReasonResponse[]
}

/** 提交最终成绩发布复核请求 - 对应 ExamFinalScoreSubmitPublishReviewRequest */
export interface ExamFinalScoreSubmitPublishReviewRequest {
  examId: string
  paperInstanceId: string
  reviewerUserIds: string[]
}

/** 确认最终成绩并原子提交发布复核请求。 */
export interface ExamFinalScoreConfirmAndSubmitPublishReviewRequest {
  examId: string
  paperInstanceId: string
  /** 日常成绩；本场考试配置 dailyScoreFull 时必填 */
  dailyScore?: number
  reviewerUserIds: string[]
}

/** 批量提交最终成绩发布复核请求 - 对应 ExamFinalScoreBatchSubmitPublishReviewRequest */
export interface ExamFinalScoreBatchSubmitPublishReviewRequest {
  examId: string
  paperInstanceIds: string[]
  reviewerUserIds: string[]
}

/** 复核通过并发布最终成绩请求 - 对应 ExamFinalScoreApprovePublishReviewRequest */
export interface ExamFinalScoreApprovePublishReviewRequest {
  examId: string
  paperInstanceId: string
}

/** 批量复核通过并发布最终成绩请求 - 对应 ExamFinalScoreBatchApprovePublishReviewRequest */
export interface ExamFinalScoreBatchApprovePublishReviewRequest {
  examId: string
  paperInstanceIds: string[]
}

/** 退回最终成绩发布复核请求 - 对应 ExamFinalScoreRejectPublishReviewRequest */
export interface ExamFinalScoreRejectPublishReviewRequest {
  examId: string
  paperInstanceId: string
  reason: string
}

/** 撤销最终成绩发布复核请求 - 对应 ExamFinalScoreCancelPublishReviewRequest */
export interface ExamFinalScoreCancelPublishReviewRequest {
  examId: string
  paperInstanceId: string
}

/** 批量发布复核逐卷失败明细。 */
export interface FinalScoreBatchPublishFailureResponse {
  paperInstanceId: string
  code: keyof typeof ResultCode
  message: string
  /** 姓名(学号)；答卷事实已失效时为空 */
  studentLabel?: string
}

/** 批量最终成绩发布复核响应 - 对应 FinalScoreBatchPublishReviewResponse */
export interface FinalScoreBatchPublishReviewResponse {
  requestedCount: number
  successCount: number
  failureCount: number
  successPaperInstanceIds: string[]
  /** 全量逐卷失败明细 */
  failures: FinalScoreBatchPublishFailureResponse[]
  failureGroups: FinalScoreFailureGroupResponse[]
  afterOverview: FinalScoreRiskOverviewResponse
}

/** 试卷最终成绩确认请求 - 对应 ExamFinalScoreConfirmRequest */
export interface ExamFinalScoreConfirmRequest {
  examId: string
  paperInstanceId: string
  /** 日常成绩；本场考试配置 dailyScoreFull 时必填 */
  dailyScore?: number
}

/** 试卷最终成绩撤回请求 - 对应 ExamFinalScoreWithdrawRequest */
export interface ExamFinalScoreWithdrawRequest {
  examId: string
  paperInstanceId: string
  /** 撤回原因（必填，落入审计日志） */
  reason: string
}

/** 试卷最终成绩撤回结果 - 对应 ExamFinalScoreWithdrawResponse */
export interface ExamFinalScoreWithdrawResponse {
  finalScoreId: string
  /** 同卷被作废的开放复核申请数 */
  invalidatedReviewRequestCount: number
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
  return http.post<PageResult<ExamScoreSummaryItemResponse>>(
    '/api/mark/exams/score-summary',
    request,
  )
}

/** 查询最终成绩全场风险概览，前端不得由分页列表自行推断全场状态。 */
export function getFinalScoreRiskOverview(
  request: FinalScoreRiskOverviewRequest,
): Promise<FinalScoreRiskOverviewResponse> {
  return http.post<FinalScoreRiskOverviewResponse>(
    '/api/mark/exams/final-scores/risk-overview',
    request,
  )
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

/** 查询可安全批量确认考生，供日常分批量录入。 */
export function listSafeConfirmableCandidates(
  request: FinalScoreSafeConfirmableCandidatesRequest,
): Promise<FinalScoreSafeConfirmableCandidateResponse[]> {
  return http.post<FinalScoreSafeConfirmableCandidateResponse[]>(
    '/api/mark/exams/final-scores/safe-confirmable-candidates',
    request,
  )
}

/** 提交单卷最终成绩发布复核。 */
export function submitPublishReview(
  request: ExamFinalScoreSubmitPublishReviewRequest,
): Promise<FinalScoreId> {
  return http.post<FinalScoreId>('/api/mark/exams/final-scores/submit-publish-review', request)
}

/** 在后端同一锁与事务内确认最终成绩并提交发布复核。 */
export function confirmAndSubmitPublishReview(
  request: ExamFinalScoreConfirmAndSubmitPublishReviewRequest,
): Promise<FinalScoreId> {
  return http.post<FinalScoreId>(
    '/api/mark/exams/final-scores/confirm-and-submit-publish-review',
    request,
  )
}

/** 批量提交最终成绩发布复核。 */
export function batchSubmitPublishReview(
  request: ExamFinalScoreBatchSubmitPublishReviewRequest,
): Promise<FinalScoreBatchPublishReviewResponse> {
  return http.post<FinalScoreBatchPublishReviewResponse>(
    '/api/mark/exams/final-scores/batch-submit-publish-review',
    request,
  )
}

/** 复核通过并发布单卷最终成绩。 */
export function approvePublishReview(
  request: ExamFinalScoreApprovePublishReviewRequest,
): Promise<FinalScoreId> {
  return http.post<FinalScoreId>('/api/mark/exams/final-scores/approve-publish-review', request)
}

/** 批量复核通过并发布最终成绩。 */
export function batchApprovePublishReview(
  request: ExamFinalScoreBatchApprovePublishReviewRequest,
): Promise<FinalScoreBatchPublishReviewResponse> {
  return http.post<FinalScoreBatchPublishReviewResponse>(
    '/api/mark/exams/final-scores/batch-approve-publish-review',
    request,
  )
}

/** 退回最终成绩发布复核。 */
export function rejectPublishReview(
  request: ExamFinalScoreRejectPublishReviewRequest,
): Promise<FinalScoreId> {
  return http.post<FinalScoreId>('/api/mark/exams/final-scores/reject-publish-review', request)
}

/** 撤销本人提交的最终成绩发布复核。 */
export function cancelPublishReview(
  request: ExamFinalScoreCancelPublishReviewRequest,
): Promise<FinalScoreId> {
  return http.post<FinalScoreId>('/api/mark/exams/final-scores/cancel-publish-review', request)
}

/** 最终成绩 ID；后端 ResultInfo<Long>，客户端按 string 语义传递 */
export type FinalScoreId = string

/** 确认试卷最终成绩，仅落库 CONFIRMED 状态，不发送学生通知。 */
export function confirmFinalScore(request: ExamFinalScoreConfirmRequest): Promise<FinalScoreId> {
  return http.post<FinalScoreId>('/api/mark/exams/final-scores/confirm', request)
}

/** 撤回试卷最终成绩；作废同卷开放复核申请并通知学生。 */
export function withdrawFinalScore(
  request: ExamFinalScoreWithdrawRequest,
): Promise<ExamFinalScoreWithdrawResponse> {
  return http.post<ExamFinalScoreWithdrawResponse>('/api/mark/exams/final-scores/withdraw', request)
}

/** 查询考试分数分布（五级分段直方图）。 */
export function getExamScoreDistribution(
  request: ExamScoreDistributionQueryRequest,
): Promise<ExamScoreDistributionResponse> {
  return http.post<ExamScoreDistributionResponse>('/api/mark/exams/score-distribution', request)
}
