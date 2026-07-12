import type { AuditIssueStatusCode } from './types'
/**
 * 审核评估问题 API - 对接 AuditIssueController
 *
 * 后端路径：/api/quality/audit-evaluation/issues
 * 设计文档 §7.10：问题从 OPEN -> IN_RECTIFICATION -> RECTIFIED -> VERIFIED -> CLOSED。
 */
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { PageResult, QueryDto } from '@/types'
import type { AuditIssueSourceCode } from '@/types/enums/audit-issue-source-enum'
import http from '@/config/axios'
import {
  ALL_AUDIT_ISSUE_SEVERITY_CODES,
  AuditIssueSeverityCode,
  AuditIssueSeverityDescription,
} from '@/types/enums/audit-issue-severity-enum'
import {
  ALL_AUDIT_ISSUE_SOURCE_CODES,
  AuditIssueSourceDescription,
} from '@/types/enums/audit-issue-source-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

const BASE = '/api/quality/audit-evaluation/issues'

export {
  ALL_AUDIT_ISSUE_SEVERITY_CODES,
  AuditIssueSeverityCode,
  AuditIssueSeverityDescription,
} from '@/types/enums/audit-issue-severity-enum'

export {
  ALL_AUDIT_ISSUE_SOURCE_CODES,
  AuditIssueSourceCode,
  AuditIssueSourceDescription,
} from '@/types/enums/audit-issue-source-enum'

/** 审核问题严重度徽标色调 */
export const AUDIT_ISSUE_SEVERITY_TONE: Record<AuditIssueSeverityCode, BadgeTone> = {
  [AuditIssueSeverityCode.MINOR]: 'gray',
  [AuditIssueSeverityCode.MAJOR]: 'orange',
  [AuditIssueSeverityCode.CRITICAL]: 'red',
}

export const AUDIT_ISSUE_SOURCE_OPTIONS: Array<{ value: AuditIssueSourceCode, label: string }>
  = ALL_AUDIT_ISSUE_SOURCE_CODES.map((value) => ({
    value,
    label: strictEnumLabel(AuditIssueSourceDescription, value, '审核问题来源'),
  }))

export const AUDIT_ISSUE_SEVERITY_OPTIONS: Array<{ value: AuditIssueSeverityCode, label: string }>
  = ALL_AUDIT_ISSUE_SEVERITY_CODES.map((value) => ({
    value,
    label: strictEnumLabel(AuditIssueSeverityDescription, value, '审核问题严重级别'),
  }))

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
  issueSource: AuditIssueSourceCode
  severity: AuditIssueSeverityCode
  auditRound?: string
  auditYear?: string
  status: AuditIssueStatusCode
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
  issueSource: AuditIssueSourceCode
  severity: AuditIssueSeverityCode
  auditRound?: string
  auditYear?: string
  raisedUserId?: string
  raisedTime?: string
}

export interface AuditIssueQueryRequest extends QueryDto {
  programId?: string
  trainingPlanId?: string
  qualityCourseId?: string
  issueSource?: AuditIssueSourceCode
  severity?: AuditIssueSeverityCode
  status?: AuditIssueStatusCode
  auditYear?: string
  keyword?: string
}

export interface AuditIssueStatusUpdateRequest {
  id: string
  targetStatus: AuditIssueStatusCode
}

export const auditIssueApi = {
  page: (data: AuditIssueQueryRequest) => http.post<PageResult<AuditIssueVO>>(`${BASE}/page`, data),
  detail: (id: string) => http.post<AuditIssueVO>(`${BASE}/detail`, { id }),
  create: (data: AuditIssueSaveRequest) => http.post<string>(`${BASE}/create`, data),
  update: (data: AuditIssueSaveRequest) => http.post<void>(`${BASE}/update`, data),
  delete: (id: string) => http.post<void>(`${BASE}/delete`, { id }),
  transitStatus: (data: AuditIssueStatusUpdateRequest) =>
    http.post<void>(`${BASE}/transit-status`, data),
}
