/**
 * 外部数据拔取审计流水 API - 对接 ExternalPullAuditController
 *
 * 后端路径：/api/quality/external-pull-audits
 */
import type { ExternalPullAuditCheckStatusCode, ExternalPullAuditEventCode } from './types'
import http from '@/config/axios'

const BASE = '/api/quality/external-pull-audits'

export interface ExternalPullAuditVO {
  id: string
  tenantId?: string
  pullTaskId: string
  queryScopeStatus?: ExternalPullAuditCheckStatusCode
  queryScopeDetail?: string
  fieldScopeStatus?: ExternalPullAuditCheckStatusCode
  fieldScopeDetail?: string
  maskPreviewStatus?: ExternalPullAuditCheckStatusCode
  operatorUserId?: string
  auditEvent: ExternalPullAuditEventCode
  auditDetail?: string
  auditedTime: string
  createTime?: string
  updateTime?: string
}

export interface ExternalPullAuditSaveRequest {
  pullTaskId: string
  queryScopeStatus?: ExternalPullAuditCheckStatusCode
  queryScopeDetail?: string
  fieldScopeStatus?: ExternalPullAuditCheckStatusCode
  fieldScopeDetail?: string
  maskPreviewStatus?: ExternalPullAuditCheckStatusCode
  auditEvent: ExternalPullAuditEventCode
  auditDetail?: string
  auditedTime?: string
}

export const externalPullAuditApi = {
  listByTask: (pullTaskId: string) =>
    http.post<ExternalPullAuditVO[]>(`${BASE}/list-by-task`, { id: pullTaskId }),
  detail: (id: string) => http.post<ExternalPullAuditVO>(`${BASE}/detail`, { id }),
  create: (data: ExternalPullAuditSaveRequest) => http.post<string>(`${BASE}/create`, data),
}
