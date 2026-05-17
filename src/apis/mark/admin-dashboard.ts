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
  examName?: string
  examNo?: string
  status?: ExamStatusCode
  createTime?: string
  examStartTime?: string
  candidateCount: number
  openProcessingTaskCount: number
  publishedScoreCount: number
}

/** 重大事件级别 */
export type IncidentLevelCode = 'BLOCKING' | 'CRITICAL' | 'WARNING' | 'INFO'

/** 重大事件级别文案映射 */
export const INCIDENT_LEVEL_LABEL: Record<IncidentLevelCode, string> = {
  BLOCKING: '阻断',
  CRITICAL: '严重',
  WARNING: '警告',
  INFO: '提示',
}

/** 重大事件级别徽标颜色（统一 BadgeTone） */
export const INCIDENT_LEVEL_COLOR: Record<IncidentLevelCode, BadgeTone> = {
  BLOCKING: 'red',
  CRITICAL: 'red',
  WARNING: 'orange',
  INFO: 'blue',
}

/** 重大事件级别 BadgeTone 映射（UiTag/UiBadge） */
export const INCIDENT_LEVEL_TONE: Record<IncidentLevelCode, BadgeTone> = {
  BLOCKING: 'red',
  CRITICAL: 'red',
  WARNING: 'orange',
  INFO: 'blue',
}

/** 重大事件记录 - 对应 ExamIncidentRecord */
export interface IncidentRecordVO {
  id: string
  tenantId?: string
  examId: string
  incidentLevel?: IncidentLevelCode
  incidentType?: string
  sourceType?: string
  sourceId?: string
  summary?: string
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

/** Dashboard 聚合响应 - 对应 MarkDashboardResponse */
export interface MarkDashboardOverviewVO {
  examMetrics?: DashboardExamMetricsVO
  gradingMetrics?: DashboardGradingMetricsVO
  incidentMetrics?: DashboardIncidentMetricsVO
  recentExams?: DashboardRecentExamItemVO[]
  recentIncidents?: IncidentRecordVO[]
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
