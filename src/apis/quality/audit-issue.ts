import type { AuditIssueStatus } from './types'
/**
 * 审核评估问题 API - 对接 AuditIssueController
 *
 * 后端路径：/api/quality/audit-evaluation/issues
 * 设计文档 §7.10：问题从 OPEN -> IN_RECTIFICATION -> RECTIFIED -> VERIFIED -> CLOSED。
 */
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

const BASE = '/api/quality/audit-evaluation/issues'

/** 审核评估问题来源 - 对应后端 AuditIssueSourceEnum */
export type AuditIssueSource
  = | 'SELF_AUDIT'
    | 'EXPERT_AUDIT'
    | 'ACCREDITATION_AUDIT'
    | 'EXTERNAL_INSPECTION'

/** 审核评估问题严重度 - 对应后端 AuditIssueSeverityEnum */
export type AuditIssueSeverity = 'MINOR' | 'MAJOR' | 'CRITICAL'

export interface AuditIssueVO {
  id: string
  tenantId?: string
  programId?: string
  trainingPlanId?: string
  qualityCourseId?: string
  requirementIndicatorId?: string
  courseGoalId?: string
  achievementResultId?: string
  issueCode: string
  issueTitle: string
  issueDescription?: string
  issueSource: AuditIssueSource
  severity: AuditIssueSeverity
  auditRound?: string
  auditYear?: string
  status: AuditIssueStatus
  raisedBy?: string
  raisedAt?: string
  closedAt?: string
  createUser?: string
  updateUser?: string
  createTime?: string
  updateTime?: string
}

export interface AuditIssueSaveRequest {
  id?: string
  programId?: string
  trainingPlanId?: string
  qualityCourseId?: string
  requirementIndicatorId?: string
  courseGoalId?: string
  achievementResultId?: string
  issueCode: string
  issueTitle: string
  issueDescription?: string
  issueSource: AuditIssueSource
  severity: AuditIssueSeverity
  auditRound?: string
  auditYear?: string
  raisedBy?: string
  raisedAt?: string
}

export interface AuditIssueQueryRequest extends QueryDto {
  programId?: string
  trainingPlanId?: string
  qualityCourseId?: string
  issueSource?: AuditIssueSource
  severity?: AuditIssueSeverity
  status?: AuditIssueStatus
  auditYear?: string
  keyword?: string
}

export const auditIssueApi = {
  page: (data: AuditIssueQueryRequest) =>
    http.post<PageResult<AuditIssueVO>>(`${BASE}/page`, data),
  detail: (id: string) => http.post<AuditIssueVO>(`${BASE}/detail`, { id }),
  create: (data: AuditIssueSaveRequest) => http.post<string>(`${BASE}/create`, data),
  update: (data: AuditIssueSaveRequest) => http.post<void>(`${BASE}/update`, data),
  delete: (id: string) => http.post<void>(`${BASE}/delete`, { id }),
  transitStatus: (id: string, targetStatus: AuditIssueStatus) =>
    http.post<void>(`${BASE}/transit-status`, { id, targetStatus }),
}
