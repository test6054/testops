import type {
  ExternalPullAuditCheckStatus,
  ExternalPullAuditEvent,
  ExternalPullConfirmationStatus,
  ExternalPullTaskStatus,
  ExternalSourceType,
} from './types'
/**
 * 外部数据源 / 拔取任务 / 拔取结果 / 拔取审计 API - 对接 edu-quality
 *
 * 后端路径:
 * - /api/quality/external-data-sources    create / update / delete / detail / page / toggle-enabled
 * - /api/quality/external-pull-tasks      create / detail / page / claim / complete / fail / cancel
 * - /api/quality/external-pull-results    create / detail / list-by-task / confirm / reject
 * - /api/quality/external-pull-audits     create / detail / list-by-task
 *
 * 关键：「确认 / 驳回」流程是对 **拔取结果批次** 操作，不是对任务操作。
 * 连接串 / 账号 / 密码按后端明文请求字段提交，由服务端加密落库。
 */
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

const SOURCE = '/api/quality/external-data-sources'
const TASK = '/api/quality/external-pull-tasks'
const RESULT = '/api/quality/external-pull-results'
const AUDIT = '/api/quality/external-pull-audits'

/* =====================================================================
 * 外部只读数据源
 * =================================================================== */

export interface ExternalDataSourceVO {
  id: string
  tenantId?: string
  sourceCode: string
  sourceName: string
  sourceType: ExternalSourceType
  jdbcUrlConfigured?: boolean
  usernameConfigured?: boolean
  passwordConfigured?: boolean
  driverClass: string
  fieldScopes: ExternalSourceFieldScope[]
  maxRowCount: number
  queryTimeoutSeconds: number
  enabled: boolean
  createTime?: string
  updateTime?: string
}

export interface ExternalSourceFieldScope {
  id?: string
  sourceId?: string
  sourceObjectName: string
  fieldName: string
  fieldLabel: string
  fieldType: string
  fieldOrder: number
}

export interface ExternalDataSourceSavePayload {
  id?: string
  sourceCode: string
  sourceName: string
  sourceType: ExternalSourceType
  /** JDBC 连接串明文 */
  jdbcUrl: string
  /** 用户名明文 */
  username: string
  /** 密码明文 */
  password: string
  driverClass: string
  fieldScopes: ExternalSourceFieldScope[]
  maxRowCount: number
  queryTimeoutSeconds: number
  enabled: boolean
}

export interface ExternalDataSourceQueryPayload extends QueryDto {
  sourceType?: ExternalSourceType
  enabled?: boolean
  keyword?: string
}

/* =====================================================================
 * 拔取任务
 * =================================================================== */

export interface ExternalPullTaskVO {
  id: string
  tenantId?: string
  sourceId: string
  taskCode: string
  taskName: string
  businessAnchor: string
  businessId: string
  sourceObjectName: string
  fields: ExternalPullTaskField[]
  filters?: ExternalPullTaskFilter[]
  sorts?: ExternalPullTaskSort[]
  maxRowCount?: number
  queryTimeoutSeconds?: number
  status: ExternalPullTaskStatus
  startedAt?: string
  finishedAt?: string
  elapsedMs?: number
  returnRows?: number
  failureReason?: string
  operatorUserId?: string
  createTime?: string
  updateTime?: string
}

export interface ExternalPullTaskQueryPayload extends QueryDto {
  sourceId?: string
  status?: ExternalPullTaskStatus
  businessAnchor?: string
  businessId?: string
}

export type ExternalPullFilterOperator = 'EQ' | 'NE' | 'GT' | 'GTE' | 'LT' | 'LTE' | 'LIKE' | 'IN'
export type ExternalPullSortDirection = 'ASC' | 'DESC'

export interface ExternalPullTaskField {
  id?: string
  fieldName: string
  fieldOrder: number
}

export interface ExternalPullTaskFilter {
  id?: string
  fieldName: string
  filterOperator: ExternalPullFilterOperator
  filterValue: string
  valueOrder: number
}

export interface ExternalPullTaskSort {
  id?: string
  fieldName: string
  sortDirection: ExternalPullSortDirection
  sortOrder: number
}

export interface ExternalPullTaskCreatePayload {
  sourceId: string
  taskCode: string
  taskName: string
  businessAnchor: string
  businessId: string
  sourceObjectName: string
  fields: ExternalPullTaskField[]
  filters?: ExternalPullTaskFilter[]
  sorts?: ExternalPullTaskSort[]
  maxRowCount?: number
  queryTimeoutSeconds?: number
}

/* =====================================================================
 * 拔取结果批次
 * =================================================================== */

export interface ExternalPullResultVO {
  id: string
  tenantId?: string
  pullTaskId: string
  businessAnchor: string
  businessId: string
  previewRows?: number
  confirmedRows?: number
  confirmationStatus: ExternalPullConfirmationStatus
  confirmedBy?: string
  confirmedAt?: string
  payloadAnchor?: string
  notes?: string
  createTime?: string
  updateTime?: string
}

export interface ExternalPullResultConfirmPayload {
  id: string
  confirmedRows: number
  notes?: string
}

export interface ExternalPullResultRejectPayload {
  id: string
  notes: string
}

/* =====================================================================
 * 拔取审计流水
 * =================================================================== */

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
  auditedAt: string
  createTime?: string
  updateTime?: string
}

export const externalDataSourceApi = {
  page: (data: ExternalDataSourceQueryPayload) =>
    http.post<PageResult<ExternalDataSourceVO>>(`${SOURCE}/page`, data),
  detail: (id: string) => http.post<ExternalDataSourceVO>(`${SOURCE}/detail`, { id }),
  create: (data: ExternalDataSourceSavePayload) => http.post<string>(`${SOURCE}/create`, data),
  update: (data: ExternalDataSourceSavePayload) => http.post<void>(`${SOURCE}/update`, data),
  delete: (id: string) => http.post<void>(`${SOURCE}/delete`, { id }),
  toggleEnabled: (id: string, enabled: boolean) =>
    http.post<void>(`${SOURCE}/toggle-enabled`, { id, enabled }),
}

export const externalPullTaskApi = {
  page: (data: ExternalPullTaskQueryPayload) =>
    http.post<PageResult<ExternalPullTaskVO>>(`${TASK}/page`, data),
  detail: (id: string) => http.post<ExternalPullTaskVO>(`${TASK}/detail`, { id }),
  create: (data: ExternalPullTaskCreatePayload) => http.post<string>(`${TASK}/create`, data),
  /** 取消未启动 / 进行中的任务 */
  cancel: (id: string, reason?: string) => http.post<void>(`${TASK}/cancel`, { id, reason }),
}

export const externalPullResultApi = {
  listByTask: (pullTaskId: string) =>
    http.post<ExternalPullResultVO[]>(`${RESULT}/list-by-task`, { id: pullTaskId }),
  detail: (id: string) => http.post<ExternalPullResultVO>(`${RESULT}/detail`, { id }),
  /** 确认结果批次：PREVIEW → CONFIRMED */
  confirm: (data: ExternalPullResultConfirmPayload) => http.post<void>(`${RESULT}/confirm`, data),
  /** 驳回结果批次：PREVIEW → REJECTED */
  reject: (data: ExternalPullResultRejectPayload) => http.post<void>(`${RESULT}/reject`, data),
}

export const externalPullAuditApi = {
  listByTask: (pullTaskId: string) =>
    http.post<ExternalPullAuditVO[]>(`${AUDIT}/list-by-task`, { id: pullTaskId }),
}
