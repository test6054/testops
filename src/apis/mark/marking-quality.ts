import type { PaperInstanceDisplayVO } from '@/apis/mark/exam-score'
import type {
  MarkingOrganizationStatusCode,
  QuestionMarkingGroupStatusCode,
} from '@/apis/mark/marking-organization'
import type { QuestionTypeCode } from '@/apis/mark/question-type'
/**
 * 阅卷质量监控 API - 对接 edu-mark 模块 MarkingQualityController
 *
 * 业务能力（按照 docs/17 §J 域）：
 *   1. 教师质量指标 - listReviewerMetrics / refreshReviewerMetrics
 *   2. 进度监控   - getLatestProgress / takeProgressSnapshot
 *   3. 抽检       - createSpotCheckTasks / handleSpotCheck
 *   4. 异常批次重处理 - reprocessBatch
 *
 * 后端规则：
 *   - 所有 endpoint 均为 POST，入参统一 body
 *   - 租户与操作人从 UserHold 注入
 *   - Long ID 在前端均以 string 表达
 */
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { PageResult, QueryDto } from '@/types'
import type { BatchReprocessScopeCode } from '@/types/enums/batch-reprocess-scope-enum'
import type { SpotCheckConclusionCode } from '@/types/enums/spot-check-conclusion-enum'
import http from '@/config/axios'
import { ProgressRiskLevelCode } from '@/types/enums/progress-risk-level-enum'
import {
  ALL_REVIEWER_METRIC_STATUS_CODES,
  ReviewerMetricStatusCode,
  ReviewerMetricStatusDescription,
} from '@/types/enums/reviewer-metric-status-enum'
import { SpotCheckStatusCode } from '@/types/enums/spot-check-status-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

export {
  ALL_BATCH_REPROCESS_SCOPE_CODES,
  BatchReprocessScopeCode,
  BatchReprocessScopeDescription,
} from '@/types/enums/batch-reprocess-scope-enum'

export {
  ALL_PROGRESS_RISK_LEVEL_CODES,
  ProgressRiskLevelCode,
  ProgressRiskLevelDescription,
} from '@/types/enums/progress-risk-level-enum'

export {
  ALL_REVIEWER_METRIC_STATUS_CODES,
  ReviewerMetricStatusCode,
  ReviewerMetricStatusDescription,
} from '@/types/enums/reviewer-metric-status-enum'

export {
  ALL_SPOT_CHECK_CONCLUSION_CODES,
  SpotCheckConclusionCode,
  SpotCheckConclusionDescription,
} from '@/types/enums/spot-check-conclusion-enum'

export {
  ALL_SPOT_CHECK_STATUS_CODES,
  SpotCheckStatusCode,
  SpotCheckStatusDescription,
} from '@/types/enums/spot-check-status-enum'

export const REVIEWER_METRIC_STATUS_TONE: Record<ReviewerMetricStatusCode, BadgeTone> = {
  [ReviewerMetricStatusCode.NORMAL]: 'green',
  [ReviewerMetricStatusCode.WARNING]: 'orange',
  [ReviewerMetricStatusCode.SUSPENDED]: 'red',
}

export const REVIEWER_METRIC_STATUS_OPTIONS: Array<{
  value: ReviewerMetricStatusCode
  label: string
}> = ALL_REVIEWER_METRIC_STATUS_CODES.map((value) => ({
  value,
  label: strictEnumLabel(ReviewerMetricStatusDescription, value, '阅卷员指标状态'),
}))

export const PROGRESS_RISK_LEVEL_TONE: Record<ProgressRiskLevelCode, BadgeTone> = {
  [ProgressRiskLevelCode.NORMAL]: 'green',
  [ProgressRiskLevelCode.LOW_RISK]: 'blue',
  [ProgressRiskLevelCode.MEDIUM_RISK]: 'orange',
  [ProgressRiskLevelCode.HIGH_RISK]: 'red',
}

export const SPOT_CHECK_STATUS_TONE: Record<SpotCheckStatusCode, BadgeTone> = {
  [SpotCheckStatusCode.PENDING]: 'orange',
  [SpotCheckStatusCode.IN_PROGRESS]: 'blue',
  [SpotCheckStatusCode.PASSED]: 'green',
  [SpotCheckStatusCode.ABNORMAL]: 'red',
  [SpotCheckStatusCode.HANDLED]: 'purple',
}

// ─── DTO ─────────────────────────────────

/** 教师质量指标查询 - 对应 ReviewerQualityQueryRequest */
export interface ReviewerQualityQueryRequest extends QueryDto {
  examId: string
  organizationId?: string
  groupId?: string
  reviewerUserId?: string
  metricStatus?: ReviewerMetricStatusCode
}

/** 进度快照请求 - 对应 ProgressSnapshotRequest */
export interface ProgressSnapshotRequest {
  examId: string
  organizationId: string
  groupId?: string
}

/** 抽检任务创建 - 对应 SpotCheckCreateRequest */
export interface SpotCheckCreateRequest {
  examId: string
  organizationId: string
  groupId?: string
  /** 抽检比例 1~100 */
  sampleRate: number
  targetReviewerUserId?: string
}

/** 抽检处理 - 对应 SpotCheckHandleRequest */
export interface SpotCheckHandleRequest {
  spotCheckId: string
  conclusion: SpotCheckConclusionCode
  /** 抽检评分（ABNORMAL 时可选） */
  reviewScore?: number
  handleNote?: string
}

/** 异常批次重处理 - 对应 BatchReprocessRequest */
export interface BatchReprocessRequest {
  examId: string
  scanBatchId: string
  reason: string
  scope?: BatchReprocessScopeCode
}

/** 阅卷教师质量指标响应 - 对应 ReviewerQualityMetricResponse */
export interface ReviewerQualityMetricResponse {
  id?: string
  tenantId?: string
  examId: string
  organizationId?: string
  organizationStatus: MarkingOrganizationStatusCode
  organizationStatusMessage: string
  groupId?: string
  groupName?: string
  groupStatus?: QuestionMarkingGroupStatusCode
  groupStatusMessage?: string
  reviewerUserId: string
  reviewerUserName: string
  reviewerTeacherNo: string
  totalTasks: number
  submittedTasks: number
  avgScore?: number
  scoreStddev?: number
  consistencyRate: number
  avgTimeSeconds?: number
  returnCount: number
  scoreBias: number
  metricStatus: ReviewerMetricStatusCode
  snapshotTime: string
}

/** 进度监控记录 VO - 对应 ProgressMonitorRecordResponse */
export interface ProgressRiskItemResponse {
  riskCode: string
  riskLabel: string
  riskDescription: string
  riskLevel: ProgressRiskLevelCode
}

export interface ProgressMonitorRecordResponse {
  id?: string
  tenantId?: string
  examId: string
  organizationId?: string
  groupId?: string
  totalTasks: number
  allocatedTasks: number
  inProgressTasks: number
  submittedTasks: number
  finalizedTasks: number
  recycledTasks: number
  completionRate: number
  estimatedRemainingMinutes?: number
  riskLevel: ProgressRiskLevelCode
  /** latest / snapshot 返回；历史 list 接口不返回明细 */
  riskItems?: ProgressRiskItemResponse[]
  snapshotTime: string
}

// ─── API ─────────────────────────────────

/**
 * 查询阅卷教师质量指标列表
 * POST /api/mark/quality/reviewer/list
 */
export function listReviewerMetrics(
  request: ReviewerQualityQueryRequest,
): Promise<PageResult<ReviewerQualityMetricResponse>> {
  return http.post<PageResult<ReviewerQualityMetricResponse>>(
    '/api/mark/quality/reviewer/list',
    request,
  )
}

/**
 * 刷新教师质量指标快照（立即重算）
 * POST /api/mark/quality/reviewer/refresh
 */
export function refreshReviewerMetrics(request: ProgressSnapshotRequest): Promise<boolean> {
  return http.post<boolean>('/api/mark/quality/reviewer/refresh', request)
}

/**
 * 查询最新进度快照
 * POST /api/mark/quality/progress/latest
 */
export function getLatestProgress(
  request: ProgressSnapshotRequest,
): Promise<ProgressMonitorRecordResponse | null> {
  return http.post<ProgressMonitorRecordResponse | null>(
    '/api/mark/quality/progress/latest',
    request,
  )
}

/**
 * 实时计算并保存进度快照
 * POST /api/mark/quality/progress/snapshot
 */
export function takeProgressSnapshot(
  request: ProgressSnapshotRequest,
): Promise<ProgressMonitorRecordResponse> {
  return http.post<ProgressMonitorRecordResponse>('/api/mark/quality/progress/snapshot', request)
}

/** 历史进度快照查询请求 */
export interface ProgressSnapshotListRequest {
  examId: string
  organizationId: string
  groupId?: string
  /** 返回最近快照条数，默认 30，最大 100 */
  limit?: number
}

/**
 * 查询阅卷进度历史快照列表（按快照时间升序）
 * POST /api/mark/quality/progress/list
 */
export function listProgressSnapshots(
  request: ProgressSnapshotListRequest,
): Promise<ProgressMonitorRecordResponse[]> {
  return http.post<ProgressMonitorRecordResponse[]>('/api/mark/quality/progress/list', request)
}

/**
 * 创建抽检任务
 * POST /api/mark/quality/spotcheck/create
 * @returns 抽检任务数
 */
export function createSpotCheckTasks(request: SpotCheckCreateRequest): Promise<number> {
  return http.post<number>('/api/mark/quality/spotcheck/create', request)
}

/**
 * 处理抽检结论（PASSED / ABNORMAL）
 * POST /api/mark/quality/spotcheck/handle
 */
export function handleSpotCheck(request: SpotCheckHandleRequest): Promise<boolean> {
  return http.post<boolean>('/api/mark/quality/spotcheck/handle', request)
}

/**
 * 触发异常扫描批次重处理
 * POST /api/mark/quality/batch/reprocess
 */
export function reprocessBatch(request: BatchReprocessRequest): Promise<boolean> {
  return http.post<boolean>('/api/mark/quality/batch/reprocess', request)
}

// ─── B-9 当前教师待处理抽检 ─────────────────────────────────

/** 待处理抽检列表查询请求 - 对应 MyPendingSpotCheckQueryRequest */
export interface MyPendingSpotCheckQueryRequest extends QueryDto {
  /** 考试ID（可选，为空时跨考试聚合） */
  examId?: string
}

/** 待处理抽检列表项响应 - 对应 MyPendingSpotCheckItemResponse */
export interface MyPendingSpotCheckItemResponse {
  /** 抽检记录ID（提交结论时作为 spotCheckId 使用） */
  id: string
  examId: string
  /** 考试名称快照，跨考试聚合时由后端直接返回 */
  examName: string
  /** 考试编号快照，跨考试聚合时由后端直接返回 */
  examNo: string
  organizationId: string
  groupId: string
  groupName: string
  markingTaskId: string
  layoutQuestionId: string
  questionNo: string
  questionType: QuestionTypeCode
  questionTypeMessage: string
  paperInstanceId: string
  candidateRosterId: string
  studentUserId: string
  studentNo: string
  studentName: string
  classId: string
  className: string
  anonymousToken: string
  paperDisplay: PaperInstanceDisplayVO
  reviewerUserId: string
  /** 教师复核评分 */
  originalScore: number
  /** 抽检状态，后端当前返回 PENDING / IN_PROGRESS */
  spotCheckStatus: SpotCheckStatusCode
  /** 抽检创建时间，用于展示「分派多久前」 */
  createTime: string
}

/**
 * 查询当前教师作为被抽检对象的待处理抽检列表（PENDING + IN_PROGRESS）。
 * 教师端用于按当前账号聚合需要处理的抽检任务。
 * POST /api/mark/quality/spotcheck/my-pending
 */
export function listMyPendingSpotChecks(
  request: MyPendingSpotCheckQueryRequest,
): Promise<PageResult<MyPendingSpotCheckItemResponse>> {
  return http.post<PageResult<MyPendingSpotCheckItemResponse>>(
    '/api/mark/quality/spotcheck/my-pending',
    request,
  )
}

/** 当前教师待处理抽检计数 - 对齐 MyPendingSpotCheckCountResponse */
export interface MyPendingSpotCheckCountResponse {
  pendingCount: number
}

export interface MyPendingSpotCheckCountRequest {
  examId?: string
}

/**
 * 统计当前教师待处理抽检数量；谓词与 listMyPendingSpotChecks 一致。
 * POST /api/mark/quality/spotcheck/my-pending-count
 */
export function countMyPendingSpotChecks(
  request: MyPendingSpotCheckCountRequest,
): Promise<MyPendingSpotCheckCountResponse> {
  return http.post<MyPendingSpotCheckCountResponse>(
    '/api/mark/quality/spotcheck/my-pending-count',
    request,
  )
}

/** 全场抽检记录查询 - 对应 ExamSpotCheckRecordQueryRequest */
export interface ExamSpotCheckRecordQueryRequest extends QueryDto {
  examId: string
  groupId?: string
  spotCheckStatus?: SpotCheckStatusCode
}

/** 全场抽检记录列表项 - 对应 ExamSpotCheckRecordItemResponse */
export interface ExamSpotCheckRecordItemResponse {
  id: string
  groupName: string
  reviewerUserId: string
  reviewerDisplayName: string
  questionNo: string
  questionType?: QuestionTypeCode
  questionTypeMessage: string
  originalScore: number
  reviewScore?: number
  spotCheckStatus: SpotCheckStatusCode
  spotCheckStatusMessage: string
  checkerUserId?: string
  checkerDisplayName?: string
  checkedTime?: string
  createTime: string
}

/**
 * 分页查询单场考试全场抽检记录台账。
 * POST /api/mark/quality/spotcheck/list
 */
export function listExamSpotCheckRecords(
  request: ExamSpotCheckRecordQueryRequest,
): Promise<PageResult<ExamSpotCheckRecordItemResponse>> {
  return http.post<PageResult<ExamSpotCheckRecordItemResponse>>(
    '/api/mark/quality/spotcheck/list',
    request,
  )
}
