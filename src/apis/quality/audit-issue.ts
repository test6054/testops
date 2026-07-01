import type { AuditIssueStatus } from './types'
/**
 * 审核评估问题 API - 对接 AuditIssueController
 *
 * 后端路径：/api/quality/audit-evaluation/issues
 * 设计文档 §7.10：问题从 OPEN -> IN_RECTIFICATION -> RECTIFIED -> VERIFIED -> CLOSED。
 */
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

const BASE = '/api/quality/audit-evaluation/issues'

/** 审核评估问题来源 - 对应后端 AuditIssueSourceEnum */
export type AuditIssueSource =
  'SELF_AUDIT' | 'EXPERT_AUDIT' | 'ACCREDITATION_AUDIT' | 'EXTERNAL_INSPECTION'

/** 审核评估问题严重度 - 对应后端 AuditIssueSeverityEnum */
export type AuditIssueSeverity = 'MINOR' | 'MAJOR' | 'CRITICAL'

/** 审核问题来源文案 */
export const AUDIT_ISSUE_SOURCE_LABEL: Record<AuditIssueSource, string> = {
  SELF_AUDIT: '自评自查',
  EXPERT_AUDIT: '专家审核',
  ACCREDITATION_AUDIT: '认证审核',
  EXTERNAL_INSPECTION: '外部检查',
}

/** 审核问题严重度文案 */
export const AUDIT_ISSUE_SEVERITY_LABEL: Record<AuditIssueSeverity, string> = {
  MINOR: '轻微',
  MAJOR: '严重',
  CRITICAL: '重大',
}

/** 审核问题严重度徽标色调 */
export const AUDIT_ISSUE_SEVERITY_TONE: Record<AuditIssueSeverity, BadgeTone> = {
  MINOR: 'gray',
  MAJOR: 'orange',
  CRITICAL: 'red',
}

export const AUDIT_ISSUE_SOURCE_OPTIONS = (
  Object.keys(AUDIT_ISSUE_SOURCE_LABEL) as AuditIssueSource[]
).map((value) => ({ value, label: AUDIT_ISSUE_SOURCE_LABEL[value] }))

export const AUDIT_ISSUE_SEVERITY_OPTIONS = (
  Object.keys(AUDIT_ISSUE_SEVERITY_LABEL) as AuditIssueSeverity[]
).map((value) => ({ value, label: AUDIT_ISSUE_SEVERITY_LABEL[value] }))

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
  raisedUserId?: string
  raisedTime?: string
  closedTime?: string
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
  raisedUserId?: string
  raisedTime?: string
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
  page: (data: AuditIssueQueryRequest) => http.post<PageResult<AuditIssueVO>>(`${BASE}/page`, data),
  detail: (id: string) => http.post<AuditIssueVO>(`${BASE}/detail`, { id }),
  create: (data: AuditIssueSaveRequest) => http.post<string>(`${BASE}/create`, data),
  update: (data: AuditIssueSaveRequest) => http.post<void>(`${BASE}/update`, data),
  delete: (id: string) => http.post<void>(`${BASE}/delete`, { id }),
  transitStatus: (id: string, targetStatus: AuditIssueStatus) =>
    http.post<void>(`${BASE}/transit-status`, { id, targetStatus }),
}
