import type { ExternalPullConfirmationStatus, ExternalPullTaskStatus, ExternalSourceType } from './types'
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
 * 连接串 / 账号 / 密码均以 **密文 cipher** 传输；后端 AES-256 存储，前端负责加密。
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
  jdbcUrlCipher?: string
  usernameCipher?: string
  passwordCipher?: string
  driverClass: string
  fieldWhitelist: string
  maxRowCount: number
  queryTimeoutSeconds: number
  enabled: boolean
  createTime?: string
  updateTime?: string
}

export interface ExternalDataSourceSavePayload {
  id?: string
  sourceCode: string
  sourceName: string
  sourceType: ExternalSourceType
  /** JDBC URL 密文（前端 AES-256 加密后上传） */
  jdbcUrlCipher: string
  /** 用户名密文 */
  usernameCipher: string
  /** 密码密文 */
  passwordCipher: string
  driverClass: string
  /** 字段白名单 JSON（table -> [columns]） */
  fieldWhitelist: string
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
  sqlTemplate: string
  sqlParameters?: string
  fieldWhitelist?: string
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

export interface ExternalPullTaskCreatePayload {
  sourceId: string
  taskCode: string
  taskName: string
  businessAnchor: string
  businessId: string
  /** 仅允许 SELECT */
  sqlTemplate: string
  sqlParameters?: string
  fieldWhitelist?: string
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
  confirmRemark?: string
}

export interface ExternalPullResultRejectPayload {
  id: string
  rejectReason: string
}

/* =====================================================================
 * 拔取审计流水
 * =================================================================== */

export interface ExternalPullAuditVO {
  id: string
  tenantId?: string
  pullTaskId: string
  sqlSafetyStatus?: string
  sqlSafetyDetail?: string
  fieldWhitelistStatus?: string
  fieldWhitelistDetail?: string
  maskPreviewStatus?: string
  operatorUserId?: string
  auditEvent: string
  auditDetail?: string
  auditedAt: string
  createTime?: string
  updateTime?: string
}

export const externalDataSourceApi = {
  page: (data: ExternalDataSourceQueryPayload) =>
    http.post<PageResult<ExternalDataSourceVO>>(`${SOURCE}/page`, data),
  detail: (id: string) =>
    http.post<ExternalDataSourceVO>(`${SOURCE}/detail`, { id }),
  create: (data: ExternalDataSourceSavePayload) =>
    http.post<string>(`${SOURCE}/create`, data),
  update: (data: ExternalDataSourceSavePayload) =>
    http.post<void>(`${SOURCE}/update`, data),
  delete: (id: string) =>
    http.post<void>(`${SOURCE}/delete`, { id }),
  toggleEnabled: (id: string, enabled: boolean) =>
    http.post<void>(`${SOURCE}/toggle-enabled`, { id, enabled }),
}

export const externalPullTaskApi = {
  page: (data: ExternalPullTaskQueryPayload) =>
    http.post<PageResult<ExternalPullTaskVO>>(`${TASK}/page`, data),
  detail: (id: string) =>
    http.post<ExternalPullTaskVO>(`${TASK}/detail`, { id }),
  create: (data: ExternalPullTaskCreatePayload) =>
    http.post<string>(`${TASK}/create`, data),
  /** 取消未启动 / 进行中的任务 */
  cancel: (id: string, reason?: string) =>
    http.post<void>(`${TASK}/cancel`, { id, reason }),
}

export const externalPullResultApi = {
  listByTask: (pullTaskId: string) =>
    http.post<ExternalPullResultVO[]>(`${RESULT}/list-by-task`, { id: pullTaskId }),
  detail: (id: string) =>
    http.post<ExternalPullResultVO>(`${RESULT}/detail`, { id }),
  /** 确认结果批次：PREVIEW → CONFIRMED */
  confirm: (data: ExternalPullResultConfirmPayload) =>
    http.post<void>(`${RESULT}/confirm`, data),
  /** 驳回结果批次：PREVIEW → REJECTED */
  reject: (data: ExternalPullResultRejectPayload) =>
    http.post<void>(`${RESULT}/reject`, data),
}

export const externalPullAuditApi = {
  listByTask: (pullTaskId: string) =>
    http.post<ExternalPullAuditVO[]>(`${AUDIT}/list-by-task`, { id: pullTaskId }),
}
