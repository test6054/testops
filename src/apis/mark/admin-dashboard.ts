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

/** 重大事件来源类型 - 对应后端 IncidentSourceType 枚举 */
export type IncidentSourceTypeCode
  = | 'IMAGE_LEDGER'
    | 'SCAN_BATCH'
    | 'SCANNED_PAGE'
    | 'PROCESSING_TASK'
    | 'DUPLICATE_RESOLUTION'
    | 'GRADE_RESULT'

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
  incidentLevel: IncidentLevelCode
  incidentType: IncidentTypeCode
  sourceType?: IncidentSourceTypeCode
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

/** Dashboard 最近重大事件列表项 - 对应 MarkDashboardIncidentItem */
export interface DashboardIncidentRecordVO {
  id: string
  examId: string
  examName: string
  examNo: string
  incidentLevel: IncidentLevelCode
  incidentType: IncidentTypeCode
  summary: string
  detail?: string
  createTime?: string
}

/** 用于复用学生侧成绩状态文案 */
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
  recentIncidents: DashboardIncidentRecordVO[]
}

/**
 * 加载阅卷管理员 Dashboard 概览。
 * GET /api/mark/admin/dashboard/overview?recentLimit=
 */
export function loadDashboardOverview(recentLimit = 5): Promise<MarkDashboardOverviewVO> {
  return http.get<MarkDashboardOverviewVO>('/api/mark/admin/dashboard/overview', {
    params: { recentLimit },
  })
}
