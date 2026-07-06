/**
 * 阅卷管理员 Dashboard API - 对接 edu-mark 模块 MarkDashboardController。
 *
 * 后端规则：
 * - 路径前缀 /api/mark/admin/dashboard
 * - 全部为 POST 查询，租户身份从 UserHold 注入
 * - 后端 Long ID 统一以 string 表达到前端
 * - 通用租户/用户/系统公告/存储统计能力由 edu-practice-web-vue 提供，本文件不重复
 */
import type { ExamStatusCode } from '@/apis/mark/exam'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { IncidentSourceTypeCode } from '@/types/enums/incident-source-type-enum'
import type { IncidentTypeCode } from '@/types/enums/incident-type-enum'
import http from '@/config/axios'
import { IncidentLevelCode } from '@/types/enums/incident-level-enum'

export {
  ALL_INCIDENT_LEVEL_CODES,
  IncidentLevelCode,
  IncidentLevelDescription,
} from '@/types/enums/incident-level-enum'
export {
  ALL_INCIDENT_SOURCE_TYPE_CODES,
  IncidentSourceTypeCode,
  IncidentSourceTypeDescription,
} from '@/types/enums/incident-source-type-enum'
export {
  ALL_INCIDENT_TYPE_CODES,
  IncidentTypeCode,
  IncidentTypeDescription,
} from '@/types/enums/incident-type-enum'

/** 重大事件级别 BadgeTone 映射（UiTag/UiBadge） */
export const INCIDENT_LEVEL_TONE: Record<IncidentLevelCode, BadgeTone> = {
  [IncidentLevelCode.BLOCKING]: 'red',
  [IncidentLevelCode.REVIEW_REQUIRED]: 'orange',
  [IncidentLevelCode.WARNING]: 'orange',
  [IncidentLevelCode.INFO]: 'blue',
}

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
  resolvedUserId?: string
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

/** Dashboard 聚合响应 - 对应 MarkDashboardResponse */
export interface MarkDashboardOverviewVO {
  examMetrics?: DashboardExamMetricsVO
  gradingMetrics: DashboardGradingMetricsVO
  incidentMetrics: DashboardIncidentMetricsVO
  recentExams: DashboardRecentExamItemVO[]
  recentIncidents: DashboardIncidentRecordVO[]
}

export function loadDashboardOverview(recentLimit = 5): Promise<MarkDashboardOverviewVO> {
  return http.post<MarkDashboardOverviewVO>('/api/mark/admin/dashboard/overview', {
    recentLimit,
  })
}
