import type { QualityAuditEvidenceItem } from './audit-evidence'
/**
 * 审核评估整改任务 API - 对接 AuditRectificationController
 *
 * 后端路径：/api/quality/audit-evaluation/rectifications
 */
import type { AuditIssueSeverity } from './audit-issue'
import type { AuditIssueStatus, AuditRectificationStatus } from './types'
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

const BASE = '/api/quality/audit-evaluation/rectifications'

export interface AuditRectificationVO {
  id: string
  tenantId?: string
  auditIssueId: string
  auditIssueCode: string
  auditIssueTitle: string
  auditIssueSeverity: AuditIssueSeverity
  auditIssueStatus: AuditIssueStatus
  rectificationCode: string
  rectificationTitle: string
  rectificationAction: string
  ownerUserId: string
  /** 责任人用户名称，ownerUserId 非空时后端必填 */
  ownerUserName: string
  ownerRole?: string
  /** yyyy-MM-dd */
  dueDate: string
  status: AuditRectificationStatus
  progressRemark?: string
  evidenceItems?: QualityAuditEvidenceItem[]
  submittedAt?: string
  verifiedAt?: string
  verifiedBy?: string
  verifyDecision?: string
  verifyRemark?: string
  closedAt?: string
  createUser?: string
  updateUser?: string
  createTime?: string
  updateTime?: string
}

export interface AuditRectificationSaveRequest {
  id?: string
  auditIssueId: string
  rectificationCode: string
  rectificationTitle: string
  rectificationAction: string
  ownerUserId: string
  ownerRole?: string
  dueDate: string
}

export interface AuditRectificationQueryRequest extends QueryDto {
  auditIssueId?: string
  ownerUserId?: string
  status?: AuditRectificationStatus
  keyword?: string
}

export interface AuditRectificationProgressRequest {
  id: string
  targetStatus: 'IN_PROGRESS' | 'SUBMITTED'
  progressRemark?: string
  evidenceItems?: QualityAuditEvidenceItem[]
}

export interface AuditRectificationVerifyRequest {
  id: string
  decision: 'APPROVED' | 'REJECTED'
  remark?: string
}

export const auditRectificationApi = {
  page: (data: AuditRectificationQueryRequest) =>
    http.post<PageResult<AuditRectificationVO>>(`${BASE}/page`, data),
  detail: (id: string) => http.post<AuditRectificationVO>(`${BASE}/detail`, { id }),
  create: (data: AuditRectificationSaveRequest) => http.post<string>(`${BASE}/create`, data),
  update: (data: AuditRectificationSaveRequest) => http.post<void>(`${BASE}/update`, data),
  delete: (id: string) => http.post<void>(`${BASE}/delete`, { id }),
  /** PLANNED -> IN_PROGRESS / IN_PROGRESS -> SUBMITTED / RETURNED -> IN_PROGRESS */
  updateProgress: (data: AuditRectificationProgressRequest) =>
    http.post<void>(`${BASE}/update-progress`, data),
  /** 复核：APPROVED -> VERIFIED / REJECTED -> RETURNED */
  verify: (data: AuditRectificationVerifyRequest) => http.post<void>(`${BASE}/verify`, data),
  /** 闭环：VERIFIED -> CLOSED */
  close: (id: string) => http.post<void>(`${BASE}/close`, { id }),
}
