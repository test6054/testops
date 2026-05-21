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
import http from '@/config/axios'

// ─── 状态枚举 ─────────────────────────────────

/** 教师质量指标状态 - 对应 ReviewerMetricStatus */
export type ReviewerMetricStatusCode = 'NORMAL' | 'WARNING' | 'SUSPENDED'

export const REVIEWER_METRIC_STATUS_LABEL: Record<ReviewerMetricStatusCode, string> = {
  NORMAL: '正常',
  WARNING: '预警',
  SUSPENDED: '已暂停',
}

export const REVIEWER_METRIC_STATUS_COLOR: Record<ReviewerMetricStatusCode, BadgeTone> = {
  NORMAL: 'green',
  WARNING: 'orange',
  SUSPENDED: 'red',
}

/** 进度风险等级 - 对应 ProgressRiskLevel */
export type ProgressRiskLevelCode = 'NORMAL' | 'LOW_RISK' | 'MEDIUM_RISK' | 'HIGH_RISK'

export const PROGRESS_RISK_LEVEL_LABEL: Record<ProgressRiskLevelCode, string> = {
  NORMAL: '正常',
  LOW_RISK: '低风险',
  MEDIUM_RISK: '中风险',
  HIGH_RISK: '高风险',
}

export const PROGRESS_RISK_LEVEL_COLOR: Record<ProgressRiskLevelCode, BadgeTone> = {
  NORMAL: 'green',
  LOW_RISK: 'blue',
  MEDIUM_RISK: 'orange',
  HIGH_RISK: 'red',
}

/** 抽检结论 */
export type SpotCheckConclusionCode = 'PASSED' | 'ABNORMAL'

export const SPOT_CHECK_CONCLUSION_LABEL: Record<SpotCheckConclusionCode, string> = {
  PASSED: '一致通过',
  ABNORMAL: '判分异常',
}

/** 异常批次重处理范围 */
export type BatchReprocessScopeCode = 'ALL' | 'FAILED_ONLY'

export const BATCH_REPROCESS_SCOPE_LABEL: Record<BatchReprocessScopeCode, string> = {
  ALL: '整批次',
  FAILED_ONLY: '仅失败页',
}

// ─── DTO ─────────────────────────────────

/** 教师质量指标查询 - 对应 ReviewerQualityQueryRequest */
export interface ReviewerQualityQueryPayload {
  examId: string
  organizationId?: string
  groupId?: string
  reviewerUserId?: string
  metricStatus?: ReviewerMetricStatusCode
}

/** 进度快照请求 - 对应 ProgressSnapshotRequest */
export interface ProgressSnapshotPayload {
  examId: string
  organizationId: string
  groupId?: string
}

/** 抽检任务创建 - 对应 SpotCheckCreateRequest */
export interface SpotCheckCreatePayload {
  examId: string
  organizationId: string
  groupId?: string
  /** 抽检比例 1~100 */
  sampleRate: number
  targetReviewerUserId?: string
}

/** 抽检处理 - 对应 SpotCheckHandleRequest */
export interface SpotCheckHandlePayload {
  spotCheckId: string
  conclusion: SpotCheckConclusionCode
  /** 组长建议分（ABNORMAL 时可选） */
  suggestedScore?: number
  handleNote?: string
}

/** 异常批次重处理 - 对应 BatchReprocessRequest */
export interface BatchReprocessPayload {
  examId: string
  scanBatchId: string
  reason: string
  scope?: BatchReprocessScopeCode
}

/** 教师质量指标 VO - 对应 ExamReviewerQualityMetric */
export interface ReviewerQualityMetricVO {
  id?: string
  tenantId?: string
  examId: string
  organizationId?: string
  groupId?: string
  reviewerUserId: string
  totalTasks?: number
  submittedTasks?: number
  avgScore?: number
  scoreStddev?: number
  consistencyRate?: number
  avgTimeSeconds?: number
  returnCount?: number
  scoreBias?: number
  metricStatus?: ReviewerMetricStatusCode
  snapshotTime?: string
}

/** 进度监控记录 VO - 对应 ExamProgressMonitorRecord */
export interface ProgressMonitorRecordVO {
  id?: string
  tenantId?: string
  examId: string
  organizationId?: string
  groupId?: string
  totalTasks?: number
  allocatedTasks?: number
  inProgressTasks?: number
  submittedTasks?: number
  finalizedTasks?: number
  recycledTasks?: number
  completionRate?: number
  estimatedRemainingMinutes?: number
  riskLevel?: ProgressRiskLevelCode
  riskDetail?: string
  snapshotTime?: string
}

// ─── API ─────────────────────────────────

/**
 * 查询阅卷教师质量指标列表
 * POST /api/mark/quality/reviewer/list
 */
export function listReviewerMetrics(
  payload: ReviewerQualityQueryPayload,
): Promise<ReviewerQualityMetricVO[]> {
  return http.post<ReviewerQualityMetricVO[]>('/api/mark/quality/reviewer/list', payload)
}

/**
 * 刷新教师质量指标快照（立即重算）
 * POST /api/mark/quality/reviewer/refresh
 */
export function refreshReviewerMetrics(payload: ProgressSnapshotPayload): Promise<boolean> {
  return http.post<boolean>('/api/mark/quality/reviewer/refresh', payload)
}

/**
 * 查询最新进度快照
 * POST /api/mark/quality/progress/latest
 */
export function getLatestProgress(
  payload: ProgressSnapshotPayload,
): Promise<ProgressMonitorRecordVO | null> {
  return http.post<ProgressMonitorRecordVO | null>('/api/mark/quality/progress/latest', payload)
}

/**
 * 实时计算并保存进度快照
 * POST /api/mark/quality/progress/snapshot
 */
export function takeProgressSnapshot(
  payload: ProgressSnapshotPayload,
): Promise<ProgressMonitorRecordVO> {
  return http.post<ProgressMonitorRecordVO>('/api/mark/quality/progress/snapshot', payload)
}

/**
 * 创建抽检任务
 * POST /api/mark/quality/spotcheck/create
 * @returns 抽检任务数
 */
export function createSpotCheckTasks(payload: SpotCheckCreatePayload): Promise<number> {
  return http.post<number>('/api/mark/quality/spotcheck/create', payload)
}

/**
 * 处理抽检结论（PASSED / ABNORMAL）
 * POST /api/mark/quality/spotcheck/handle
 */
export function handleSpotCheck(payload: SpotCheckHandlePayload): Promise<boolean> {
  return http.post<boolean>('/api/mark/quality/spotcheck/handle', payload)
}

/**
 * 触发异常扫描批次重处理
 * POST /api/mark/quality/batch/reprocess
 */
export function reprocessBatch(payload: BatchReprocessPayload): Promise<boolean> {
  return http.post<boolean>('/api/mark/quality/batch/reprocess', payload)
}

// ─── B-9 当前教师待处理抽检 ─────────────────────────────────

/** 抽检状态（仅 PENDING / IN_PROGRESS 会出现在「我的待处理」列表中） */
export type MyPendingSpotCheckStatusCode = 'PENDING' | 'IN_PROGRESS'

/** 待处理抽检列表查询请求 - 对应 MyPendingSpotCheckQueryRequest */
export interface MyPendingSpotCheckQueryPayload {
  /** 考试ID（可选，为空时跨考试聚合） */
  examId?: string
}

/** 待处理抽检列表项 VO - 对应 MyPendingSpotCheckItemDTO */
export interface MyPendingSpotCheckItemVO {
  /** 抽检记录ID（提交结论时作为 spotCheckId 使用） */
  id: string
  examId: string
  organizationId?: string
  groupId?: string
  markingTaskId?: string
  questionTemplateId?: string
  paperInstanceId?: string
  reviewerUserId?: string
  /** 教师原始给分 */
  originalScore?: number
  spotCheckStatus?: MyPendingSpotCheckStatusCode
  /** 抽检创建时间，用于展示「分派多久前」 */
  createTime?: string
}

/**
 * 查询当前教师作为被抽检对象的待处理抽检列表（PENDING + IN_PROGRESS）。
 * 教师端用于按当前账号聚合需要处理的抽检任务。
 * POST /api/mark/quality/spotcheck/my-pending
 */
export function listMyPendingSpotChecks(
  payload: MyPendingSpotCheckQueryPayload = {},
): Promise<MyPendingSpotCheckItemVO[]> {
  return http.post<MyPendingSpotCheckItemVO[]>('/api/mark/quality/spotcheck/my-pending', payload)
}
