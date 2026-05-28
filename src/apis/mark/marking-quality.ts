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

/** 抽检任务状态 - 与后端 SpotCheckStatus enum 对齐 */
export type SpotCheckStatusCode = 'PENDING' | 'IN_PROGRESS' | 'PASSED' | 'ABNORMAL' | 'HANDLED'

export const SPOT_CHECK_STATUS_LABEL: Record<SpotCheckStatusCode, string> = {
  PENDING: '待抽检',
  IN_PROGRESS: '抽检中',
  PASSED: '通过',
  ABNORMAL: '异常',
  HANDLED: '已处理',
}

export const SPOT_CHECK_STATUS_TONE: Record<SpotCheckStatusCode, BadgeTone> = {
  PENDING: 'orange',
  IN_PROGRESS: 'blue',
  PASSED: 'green',
  ABNORMAL: 'red',
  HANDLED: 'purple',
}

/** 异常批次重处理范围 */
export type BatchReprocessScopeCode = 'ALL' | 'FAILED_ONLY'

export const BATCH_REPROCESS_SCOPE_LABEL: Record<BatchReprocessScopeCode, string> = {
  ALL: '整批次',
  FAILED_ONLY: '仅失败页',
}

// ─── DTO ─────────────────────────────────

/** 教师质量指标查询 - 对应 ReviewerQualityQueryRequest */
export interface ReviewerQualityQueryPayload extends QueryDto {
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

/** 进度监控记录 VO - 对应 ExamProgressMonitorRecord */
export interface ProgressRiskItemVO {
  riskCode: string
  riskLabel: string
  riskDescription: string
  riskLevel: ProgressRiskLevelCode
}

export interface ProgressMonitorRecordVO {
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
  riskItems: ProgressRiskItemVO[]
  snapshotTime: string
}

// ─── API ─────────────────────────────────

/**
 * 查询阅卷教师质量指标列表
 * POST /api/mark/quality/reviewer/list
 */
export function listReviewerMetrics(
  payload: ReviewerQualityQueryPayload,
): Promise<PageResult<ReviewerQualityMetricVO>> {
  return http.post<unknown>('/api/mark/quality/reviewer/list', payload)
    .then((value) => validatePageResult(value, validateReviewerQualityMetric, '阅卷教师质量指标分页'))
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
  return http.post<unknown>('/api/mark/quality/progress/latest', payload)
    .then(validateNullableProgressMonitorRecord)
}

/**
 * 实时计算并保存进度快照
 * POST /api/mark/quality/progress/snapshot
 */
export function takeProgressSnapshot(
  payload: ProgressSnapshotPayload,
): Promise<ProgressMonitorRecordVO> {
  return http.post<unknown>('/api/mark/quality/progress/snapshot', payload)
    .then(validateProgressMonitorRecord)
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
export type MyPendingSpotCheckStatusCode = Extract<SpotCheckStatusCode, 'PENDING' | 'IN_PROGRESS'>

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
  /** 考试名称快照，跨考试聚合时由后端直接返回 */
  examName: string
  /** 考试编号快照，跨考试聚合时由后端直接返回 */
  examNo: string
  organizationId: string
  groupId: string
  markingTaskId: string
  questionTemplateId: string
  questionNo: string
  paperInstanceId: string
  reviewerUserId: string
  /** 教师原始给分 */
  originalScore: number
  spotCheckStatus: MyPendingSpotCheckStatusCode
  /** 抽检创建时间，用于展示「分派多久前」 */
  createTime: string
}

/**
 * 查询当前教师作为被抽检对象的待处理抽检列表（PENDING + IN_PROGRESS）。
 * 教师端用于按当前账号聚合需要处理的抽检任务。
 * POST /api/mark/quality/spotcheck/my-pending
 */
export function listMyPendingSpotChecks(
  payload: MyPendingSpotCheckQueryPayload = {},
): Promise<MyPendingSpotCheckItemVO[]> {
  return http.post<unknown>('/api/mark/quality/spotcheck/my-pending', payload)
    .then(validateMyPendingSpotCheckList)
}

function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`阅卷质量接口缺少 ${fieldName}`)
  }
  return value
}

function optionalString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  if (typeof value !== 'string') {
    throw new TypeError(`阅卷质量接口 ${fieldName} 格式错误`)
  }
  return value
}

function requireFiniteNumber(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`阅卷质量接口 ${fieldName} 格式错误`)
  }
  return value
}

function optionalFiniteNumber(value: unknown, fieldName: string): number | undefined {
  if (value === undefined || value === null) {
    return undefined
  }
  return requireFiniteNumber(value, fieldName)
}

function requireReviewerMetricStatus(value: unknown): ReviewerMetricStatusCode {
  if (value !== 'NORMAL' && value !== 'WARNING' && value !== 'SUSPENDED') {
    throw new TypeError('阅卷质量接口 metricStatus 格式错误')
  }
  return value
}

function requireProgressRiskLevel(value: unknown): ProgressRiskLevelCode {
  if (
    value !== 'NORMAL'
    && value !== 'LOW_RISK'
    && value !== 'MEDIUM_RISK'
    && value !== 'HIGH_RISK'
  ) {
    throw new TypeError('阅卷质量接口 riskLevel 格式错误')
  }
  return value
}

function requireProgressRiskItems(value: unknown): ProgressRiskItemVO[] {
  if (!Array.isArray(value)) {
    throw new TypeError('阅卷质量接口 riskItems 格式错误')
  }
  return value.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new TypeError(`阅卷质量接口 riskItems[${index}] 格式错误`)
    }
    const record = item as Record<string, unknown>
    return {
      riskCode: requireString(record.riskCode, `riskItems[${index}].riskCode`),
      riskLabel: requireString(record.riskLabel, `riskItems[${index}].riskLabel`),
      riskDescription: requireString(
        record.riskDescription,
        `riskItems[${index}].riskDescription`,
      ),
      riskLevel: requireProgressRiskLevel(record.riskLevel),
    }
  })
}

function requireMyPendingSpotCheckStatus(value: unknown): MyPendingSpotCheckStatusCode {
  if (value !== 'PENDING' && value !== 'IN_PROGRESS') {
    throw new TypeError('当前教师待处理抽检接口 spotCheckStatus 格式错误')
  }
  return value
}

function validateReviewerQualityMetric(value: unknown): ReviewerQualityMetricVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('阅卷教师质量指标接口返回格式错误')
  }
  const record = value as Record<string, unknown>
  return {
    id: optionalString(record.id, 'id'),
    tenantId: optionalString(record.tenantId, 'tenantId'),
    examId: requireString(record.examId, 'examId'),
    organizationId: optionalString(record.organizationId, 'organizationId'),
    groupId: optionalString(record.groupId, 'groupId'),
    reviewerUserId: requireString(record.reviewerUserId, 'reviewerUserId'),
    totalTasks: requireFiniteNumber(record.totalTasks, 'totalTasks'),
    submittedTasks: requireFiniteNumber(record.submittedTasks, 'submittedTasks'),
    avgScore: optionalFiniteNumber(record.avgScore, 'avgScore'),
    scoreStddev: optionalFiniteNumber(record.scoreStddev, 'scoreStddev'),
    consistencyRate: requireFiniteNumber(record.consistencyRate, 'consistencyRate'),
    avgTimeSeconds: optionalFiniteNumber(record.avgTimeSeconds, 'avgTimeSeconds'),
    returnCount: requireFiniteNumber(record.returnCount, 'returnCount'),
    scoreBias: requireFiniteNumber(record.scoreBias, 'scoreBias'),
    metricStatus: requireReviewerMetricStatus(record.metricStatus),
    snapshotTime: requireString(record.snapshotTime, 'snapshotTime'),
  }
}

function validatePageResult<T>(
  value: unknown,
  itemValidator: (item: unknown) => T,
  fieldName: string,
): PageResult<T> {
  if (!value || typeof value !== 'object') {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  const result = value as Record<string, unknown>
  if (!Array.isArray(result.list)) {
    throw new TypeError(`${fieldName} 列表接口返回格式错误`)
  }
  return {
    list: result.list.map(itemValidator),
    total: requireFiniteNumber(result.total, `${fieldName} 总数`),
    pageNum: requireFiniteNumber(result.pageNum, `${fieldName} 页码`),
    pageSize: requireFiniteNumber(result.pageSize, `${fieldName} 每页数量`),
    pages: requireFiniteNumber(result.pages, `${fieldName} 总页数`),
  }
}

function validateProgressMonitorRecord(value: unknown): ProgressMonitorRecordVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('阅卷进度快照接口返回格式错误')
  }
  const record = value as Record<string, unknown>
  return {
    id: optionalString(record.id, 'id'),
    tenantId: optionalString(record.tenantId, 'tenantId'),
    examId: requireString(record.examId, 'examId'),
    organizationId: optionalString(record.organizationId, 'organizationId'),
    groupId: optionalString(record.groupId, 'groupId'),
    totalTasks: requireFiniteNumber(record.totalTasks, 'totalTasks'),
    allocatedTasks: requireFiniteNumber(record.allocatedTasks, 'allocatedTasks'),
    inProgressTasks: requireFiniteNumber(record.inProgressTasks, 'inProgressTasks'),
    submittedTasks: requireFiniteNumber(record.submittedTasks, 'submittedTasks'),
    finalizedTasks: requireFiniteNumber(record.finalizedTasks, 'finalizedTasks'),
    recycledTasks: requireFiniteNumber(record.recycledTasks, 'recycledTasks'),
    completionRate: requireFiniteNumber(record.completionRate, 'completionRate'),
    estimatedRemainingMinutes: optionalFiniteNumber(
      record.estimatedRemainingMinutes,
      'estimatedRemainingMinutes',
    ),
    riskLevel: requireProgressRiskLevel(record.riskLevel),
    riskItems: requireProgressRiskItems(record.riskItems),
    snapshotTime: requireString(record.snapshotTime, 'snapshotTime'),
  }
}

function validateNullableProgressMonitorRecord(value: unknown): ProgressMonitorRecordVO | null {
  if (value === null) {
    return null
  }
  return validateProgressMonitorRecord(value)
}

function validateMyPendingSpotCheckItem(value: unknown): MyPendingSpotCheckItemVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('当前教师待处理抽检列表项接口返回格式错误')
  }
  const record = value as Record<string, unknown>
  return {
    id: requireString(record.id, 'id'),
    examId: requireString(record.examId, 'examId'),
    examName: requireString(record.examName, 'examName'),
    examNo: requireString(record.examNo, 'examNo'),
    organizationId: requireString(record.organizationId, 'organizationId'),
    groupId: requireString(record.groupId, 'groupId'),
    markingTaskId: requireString(record.markingTaskId, 'markingTaskId'),
    questionTemplateId: requireString(record.questionTemplateId, 'questionTemplateId'),
    questionNo: requireString(record.questionNo, 'questionNo'),
    paperInstanceId: requireString(record.paperInstanceId, 'paperInstanceId'),
    reviewerUserId: requireString(record.reviewerUserId, 'reviewerUserId'),
    originalScore: requireFiniteNumber(record.originalScore, 'originalScore'),
    spotCheckStatus: requireMyPendingSpotCheckStatus(record.spotCheckStatus),
    createTime: requireString(record.createTime, 'createTime'),
  }
}

function validateMyPendingSpotCheckList(value: unknown): MyPendingSpotCheckItemVO[] {
  if (!Array.isArray(value)) {
    throw new TypeError('当前教师待处理抽检列表接口返回格式错误')
  }
  return value.map(validateMyPendingSpotCheckItem)
}
