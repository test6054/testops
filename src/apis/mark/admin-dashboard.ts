/**
 * 阅卷管理员 Dashboard API - 对接 edu-mark 模块 MarkDashboardController。
 *
 * 后端规则：
 * - 路径前缀 /api/mark/admin/dashboard
 * - 全部为 GET 查询，租户身份从 UserHold 注入
 * - 后端 Long ID 统一以 string 表达到前端
 * - 通用租户/用户/系统公告/存储统计能力由 edu-practice-web-vue 提供，本文件不重复
 */
import type { ExamStatusCode } from '@/apis/mark/exam'
import type { FinalScoreStatusCode } from '@/apis/mark/student-exam'
import type { BadgeTone } from '@/components/ui-guide/ui/types'

import http from '@/config/axios'

/** 阅卷规模指标 - 对应 MarkDashboardResponse.ExamMetrics */
export interface DashboardExamMetricsVO {
  totalExamCount: number
  activeExamCount: number
  closedExamCount: number
  recentExamCount: number
  totalCandidateCount: number
}

/** 批改进度指标 - 对应 MarkDashboardResponse.GradingMetrics */
export interface DashboardGradingMetricsVO {
  publishedScoreCount: number
  pendingScoreCount: number
  confirmedScoreCount: number
  withdrawnScoreCount: number
  confirmedQuestionResultCount: number
  openReviewTaskCount: number
  openProcessingTaskCount: number
}

/** 异常告警指标 - 对应 MarkDashboardResponse.IncidentMetrics */
export interface DashboardIncidentMetricsVO {
  unresolvedIncidentCount: number
  pendingDuplicateCount: number
}

/** 最近考试列表项 - 对应 MarkDashboardRecentExamItem */
export interface DashboardRecentExamItemVO {
  examId: string
  examName: string
  examNo: string
  status: ExamStatusCode
  createTime?: string
  examStartTime?: string
  candidateCount: number
  openProcessingTaskCount: number
  publishedScoreCount: number
}

/** 重大事件级别 - 对应后端 IncidentLevel 枚举 */
export type IncidentLevelCode = 'BLOCKING' | 'REVIEW_REQUIRED' | 'WARNING' | 'INFO'

/** 重大事件级别文案映射 */
export const INCIDENT_LEVEL_LABEL: Record<IncidentLevelCode, string> = {
  BLOCKING: '阻断',
  REVIEW_REQUIRED: '需复核',
  WARNING: '警告',
  INFO: '提示',
}

/** 重大事件级别徽标颜色（统一 BadgeTone） */
export const INCIDENT_LEVEL_COLOR: Record<IncidentLevelCode, BadgeTone> = {
  BLOCKING: 'red',
  REVIEW_REQUIRED: 'orange',
  WARNING: 'orange',
  INFO: 'blue',
}

/** 重大事件级别 BadgeTone 映射（UiTag/UiBadge） */
export const INCIDENT_LEVEL_TONE: Record<IncidentLevelCode, BadgeTone> = {
  BLOCKING: 'red',
  REVIEW_REQUIRED: 'orange',
  WARNING: 'orange',
  INFO: 'blue',
}

/** 重大事件类型 - 对应后端 IncidentType 枚举 */
export type IncidentTypeCode
  = | 'DUPLICATE_DETECTED'
    | 'BINDING_CONFLICT'
    | 'SCAN_BATCH_REPROCESS'
    | 'SCORE_ANOMALY'

/** 重大事件类型文案映射 */
export const INCIDENT_TYPE_LABEL: Record<IncidentTypeCode, string> = {
  DUPLICATE_DETECTED: '重复检测',
  BINDING_CONFLICT: '绑定冲突',
  SCAN_BATCH_REPROCESS: '异常批次重处理',
  SCORE_ANOMALY: '分数异常',
}

/** 重大事件记录 - 对应 ExamIncidentRecord */
export interface IncidentRecordVO {
  id: string
  tenantId?: string
  examId: string
  incidentLevel?: IncidentLevelCode
  incidentType: IncidentTypeCode
  sourceType?: string
  sourceId?: string
  summary: string
  detail?: string
  resolved?: boolean
  resolvedBy?: string
  resolvedTime?: string
  resolveNote?: string
  createUser?: string
  updateUser?: string
  createTime?: string
  updateTime?: string
}

/** 用于在 finalScore 文案上复用学生侧映射 */
export type DashboardFinalScoreStatusCode = FinalScoreStatusCode

/**
 * Dashboard 聚合响应 - 对应 MarkDashboardResponse
 *
 * 字段契约：
 * - examMetrics 当前 UI 未消费，保留为可选；
 * - gradingMetrics / incidentMetrics / recentExams / recentIncidents 为前端必需字段，
 *   缺失会在 validateDashboardOverview 抛 TypeError，由调用方 catch 走错误面板。
 */
export interface MarkDashboardOverviewVO {
  examMetrics?: DashboardExamMetricsVO
  gradingMetrics: DashboardGradingMetricsVO
  incidentMetrics: DashboardIncidentMetricsVO
  recentExams: DashboardRecentExamItemVO[]
  recentIncidents: IncidentRecordVO[]
}

/**
 * 加载阅卷管理员 Dashboard 概览。
 * GET /api/mark/admin/dashboard/overview?recentLimit=
 */
export function loadDashboardOverview(recentLimit = 5): Promise<MarkDashboardOverviewVO> {
  return http
    .get<unknown>('/api/mark/admin/dashboard/overview', {
      params: { recentLimit },
    })
    .then(validateDashboardOverview)
}

function requireRecord(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== 'object') {
    throw new TypeError(message)
  }
  return value as Record<string, unknown>
}

function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`Dashboard 接口缺少 ${fieldName}`)
  }
  return value
}

function optionalString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  if (typeof value !== 'string') {
    throw new TypeError(`Dashboard 接口 ${fieldName} 格式错误`)
  }
  return value
}

function requireExamStatus(value: unknown, fieldName: string): ExamStatusCode {
  if (value === 'ACTIVE' || value === 'CLOSED') {
    return value
  }
  throw new TypeError(`Dashboard 接口 ${fieldName} 格式错误`)
}

function requireIncidentType(value: unknown): IncidentTypeCode {
  if (
    value !== 'DUPLICATE_DETECTED'
    && value !== 'BINDING_CONFLICT'
    && value !== 'SCAN_BATCH_REPROCESS'
    && value !== 'SCORE_ANOMALY'
  ) {
    throw new TypeError('Dashboard 接口 incidentType 格式错误')
  }
  return value
}

function optionalIncidentLevel(value: unknown): IncidentLevelCode | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  if (
    value !== 'BLOCKING'
    && value !== 'REVIEW_REQUIRED'
    && value !== 'WARNING'
    && value !== 'INFO'
  ) {
    throw new TypeError('Dashboard 接口 incidentLevel 格式错误')
  }
  return value
}

function optionalBoolean(value: unknown, fieldName: string): boolean | undefined {
  if (value === undefined || value === null) {
    return undefined
  }
  if (typeof value !== 'boolean') {
    throw new TypeError(`Dashboard 接口 ${fieldName} 格式错误`)
  }
  return value
}

function validateIncidentRecord(value: unknown): IncidentRecordVO {
  const record = requireRecord(value, 'Dashboard 最近事件返回格式错误')
  return {
    id: requireString(record.id, 'recentIncidents.id'),
    tenantId: optionalString(record.tenantId, 'recentIncidents.tenantId'),
    examId: requireString(record.examId, 'recentIncidents.examId'),
    incidentLevel: optionalIncidentLevel(record.incidentLevel),
    incidentType: requireIncidentType(record.incidentType),
    sourceType: optionalString(record.sourceType, 'recentIncidents.sourceType'),
    sourceId: optionalString(record.sourceId, 'recentIncidents.sourceId'),
    summary: requireString(record.summary, 'recentIncidents.summary'),
    detail: optionalString(record.detail, 'recentIncidents.detail'),
    resolved: optionalBoolean(record.resolved, 'recentIncidents.resolved'),
    resolvedBy: optionalString(record.resolvedBy, 'recentIncidents.resolvedBy'),
    resolvedTime: optionalString(record.resolvedTime, 'recentIncidents.resolvedTime'),
    resolveNote: optionalString(record.resolveNote, 'recentIncidents.resolveNote'),
    createUser: optionalString(record.createUser, 'recentIncidents.createUser'),
    updateUser: optionalString(record.updateUser, 'recentIncidents.updateUser'),
    createTime: optionalString(record.createTime, 'recentIncidents.createTime'),
    updateTime: optionalString(record.updateTime, 'recentIncidents.updateTime'),
  }
}

function validateRecentExamItem(value: unknown): DashboardRecentExamItemVO {
  const record = requireRecord(value, 'Dashboard 最近考试返回格式错误')
  return {
    examId: requireString(record.examId, 'recentExams.examId'),
    examName: requireString(record.examName, 'recentExams.examName'),
    examNo: requireString(record.examNo, 'recentExams.examNo'),
    status: requireExamStatus(record.status, 'recentExams.status'),
    createTime: optionalString(record.createTime, 'recentExams.createTime'),
    examStartTime: optionalString(record.examStartTime, 'recentExams.examStartTime'),
    candidateCount: requireNumber(record.candidateCount, 'recentExams.candidateCount'),
    openProcessingTaskCount: requireNumber(record.openProcessingTaskCount, 'recentExams.openProcessingTaskCount'),
    publishedScoreCount: requireNumber(record.publishedScoreCount, 'recentExams.publishedScoreCount'),
  }
}

function requireGradingMetrics(value: unknown): DashboardGradingMetricsVO {
  const record = requireRecord(value, 'Dashboard 接口缺少 gradingMetrics')
  return {
    publishedScoreCount: requireNumber(record.publishedScoreCount, 'gradingMetrics.publishedScoreCount'),
    pendingScoreCount: requireNumber(record.pendingScoreCount, 'gradingMetrics.pendingScoreCount'),
    confirmedScoreCount: requireNumber(record.confirmedScoreCount, 'gradingMetrics.confirmedScoreCount'),
    withdrawnScoreCount: requireNumber(record.withdrawnScoreCount, 'gradingMetrics.withdrawnScoreCount'),
    confirmedQuestionResultCount: requireNumber(record.confirmedQuestionResultCount, 'gradingMetrics.confirmedQuestionResultCount'),
    openReviewTaskCount: requireNumber(record.openReviewTaskCount, 'gradingMetrics.openReviewTaskCount'),
    openProcessingTaskCount: requireNumber(record.openProcessingTaskCount, 'gradingMetrics.openProcessingTaskCount'),
  }
}

function requireIncidentMetrics(value: unknown): DashboardIncidentMetricsVO {
  const record = requireRecord(value, 'Dashboard 接口缺少 incidentMetrics')
  return {
    unresolvedIncidentCount: requireNumber(record.unresolvedIncidentCount, 'incidentMetrics.unresolvedIncidentCount'),
    pendingDuplicateCount: requireNumber(record.pendingDuplicateCount, 'incidentMetrics.pendingDuplicateCount'),
  }
}

function requireNumber(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`Dashboard 接口 ${fieldName} 格式错误`)
  }
  return value
}

function requireArray(value: unknown, fieldName: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new TypeError(`Dashboard 接口 ${fieldName} 格式错误`)
  }
  return value
}

function validateDashboardOverview(value: unknown): MarkDashboardOverviewVO {
  const record = requireRecord(value, 'Dashboard 概览返回格式错误')
  return {
    // examMetrics 当前 UI 未消费，保留为软字段
    examMetrics: record.examMetrics as DashboardExamMetricsVO | undefined,
    // 核心 KPI 字段必须存在，缺失即视为后端协议异常 → loadOverview catch 显示错误面板
    gradingMetrics: requireGradingMetrics(record.gradingMetrics),
    incidentMetrics: requireIncidentMetrics(record.incidentMetrics),
    recentExams: requireArray(record.recentExams, 'recentExams').map(validateRecentExamItem),
    recentIncidents: requireArray(record.recentIncidents, 'recentIncidents').map(validateIncidentRecord),
  }
}
