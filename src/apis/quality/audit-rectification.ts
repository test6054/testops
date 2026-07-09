import type { AuditEvidenceItemRequest, AuditEvidenceItemVO } from './audit-evidence'
/**
 * 审核评估整改任务 API - 对接 AuditRectificationController
 *
 * 后端路径：/api/quality/audit-evaluation/rectifications
 */
import type { AuditIssueSeverityCode } from './audit-issue'
import type { AuditIssueStatusCode, AuditRectificationStatusCode } from './types'
import type { PageResult, QueryDto } from '@/types'
import type { AuditRectificationVerifyDecisionCode } from '@/types/enums/audit-rectification-verify-decision-enum'
import http from '@/config/axios'

const BASE = '/api/quality/audit-evaluation/rectifications'

export interface AuditRectificationVO {
  id: string
  tenantId?: string
  auditIssueId: string
  auditIssueCode: string
  auditIssueTitle: string
  auditIssueSeverity: AuditIssueSeverityCode
  auditIssueStatus: AuditIssueStatusCode
  rectificationCode: string
  rectificationTitle: string
  rectificationAction: string
  ownerUserId?: string
  /** 责任人用户名称，ownerUserId 非空时后端必填 */
  ownerUserName?: string
  ownerRole?: string
  /** yyyy-MM-dd */
  dueDate?: string
  status: AuditRectificationStatusCode
  progressRemark?: string
  evidenceItems?: AuditEvidenceItemVO[]
  submittedTime?: string
  verifiedTime?: string
  verifiedUserId?: string
  verifyDecision?: AuditRectificationVerifyDecisionCode
  verifyRemark?: string
  closedTime?: string
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
  status?: AuditRectificationStatusCode
  keyword?: string
}

export interface AuditRectificationProgressUpdateRequest {
  id: string
  targetStatus: AuditRectificationStatusCode
  progressRemark?: string
  evidenceItems?: AuditEvidenceItemRequest[]
}

export interface AuditRectificationVerifyRequest {
  id: string
  decision: AuditRectificationVerifyDecisionCode
  remark?: string
}

/** 审核问题整改任务数量项 */
export interface AuditIssueRectificationCountItem {
  auditIssueId: string
  rectificationCount: number
}

/** 审核问题整改任务数量批量查询响应 */
export interface AuditIssueRectificationCountResponse {
  items: AuditIssueRectificationCountItem[]
}

export const auditRectificationApi = {
  page: (data: AuditRectificationQueryRequest) =>
    http.post<PageResult<AuditRectificationVO>>(`${BASE}/page`, data),
  detail: (id: string) => http.post<AuditRectificationVO>(`${BASE}/detail`, { id }),
  create: (data: AuditRectificationSaveRequest) => http.post<string>(`${BASE}/create`, data),
  update: (data: AuditRectificationSaveRequest) => http.post<void>(`${BASE}/update`, data),
  delete: (id: string) => http.post<void>(`${BASE}/delete`, { id }),
  /** PLANNED -> IN_PROGRESS / IN_PROGRESS -> SUBMITTED / RETURNED -> IN_PROGRESS */
  updateProgress: (data: AuditRectificationProgressUpdateRequest) =>
    http.post<void>(`${BASE}/update-progress`, data),
  /** 复核：APPROVED -> VERIFIED / REJECTED -> RETURNED */
  verify: (data: AuditRectificationVerifyRequest) => http.post<void>(`${BASE}/verify`, data),
  /** 闭环：VERIFIED -> CLOSED */
  close: (id: string) => http.post<void>(`${BASE}/close`, { id }),
  countByIssueIds: (auditIssueIds: string[]) =>
    http.post<AuditIssueRectificationCountResponse>(`${BASE}/count-by-issue-ids`, {
      auditIssueIds,
    }),
}
