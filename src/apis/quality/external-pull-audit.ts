/**
 * 外部数据拔取审计流水 API - 对接 ExternalPullAuditController
 *
 * 后端路径：/api/quality/external-pull-audits
 */
import type { ExternalPullAuditCheckStatus, ExternalPullAuditEvent } from './types'
import http from '@/config/axios'

const BASE = '/api/quality/external-pull-audits'

export interface ExternalPullAuditVO {
  id: string
  tenantId?: string
  pullTaskId: string
  queryScopeStatus?: ExternalPullAuditCheckStatus
  queryScopeDetail?: string
  fieldScopeStatus?: ExternalPullAuditCheckStatus
  fieldScopeDetail?: string
  maskPreviewStatus?: ExternalPullAuditCheckStatus
  operatorUserId?: string
  auditEvent: ExternalPullAuditEvent
  auditDetail?: string
  auditedTime: string
  createTime?: string
  updateTime?: string
}

export const externalPullAuditApi = {
  listByTask: (pullTaskId: string) =>
    http.post<ExternalPullAuditVO[]>(`${BASE}/list-by-task`, { id: pullTaskId }),
}
