/**
 * 外部只读数据源 API - 对接 ExternalDataSourceController
 *
 * 后端路径：/api/quality/external-data-sources
 * 连接串 / 账号 / 密码按后端明文请求字段提交，由服务端加密落库。
 */
import type { ExternalSourceTypeCode } from './types'
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

const BASE = '/api/quality/external-data-sources'

export interface ExternalDataSourceVO {
  id: string
  tenantId?: string
  sourceCode: string
  sourceName: string
  sourceType: ExternalSourceTypeCode
  jdbcUrlConfigured?: boolean
  usernameConfigured?: boolean
  passwordConfigured?: boolean
  driverClass?: string
  fieldScopes?: ExternalSourceFieldScope[]
  maxRowCount?: number
  queryTimeoutSeconds?: number
  enabled?: boolean
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

export interface ExternalSourceFieldScopeRequest {
  sourceObjectName: string
  fieldName: string
  fieldLabel: string
  fieldType: string
  fieldOrder: number
}

export interface ExternalDataSourceSaveRequest {
  id?: string
  sourceCode: string
  sourceName: string
  sourceType: ExternalSourceTypeCode
  /** JDBC 连接串明文 */
  jdbcUrl: string
  /** 用户名明文 */
  username: string
  /** 密码明文 */
  password: string
  driverClass: string
  fieldScopes: ExternalSourceFieldScopeRequest[]
  maxRowCount: number
  queryTimeoutSeconds: number
  enabled: boolean
}

export interface ExternalDataSourceQueryRequest extends QueryDto {
  sourceType?: ExternalSourceTypeCode
  enabled?: boolean
  keyword?: string
}

export interface ExternalDataSourceToggleRequest {
  id: string
  enabled: boolean
}

export const externalDataSourceApi = {
  page: (data: ExternalDataSourceQueryRequest) =>
    http.post<PageResult<ExternalDataSourceVO>>(`${BASE}/page`, data),
  detail: (id: string) => http.post<ExternalDataSourceVO>(`${BASE}/detail`, { id }),
  create: (data: ExternalDataSourceSaveRequest) => http.post<string>(`${BASE}/create`, data),
  update: (data: ExternalDataSourceSaveRequest) => http.post<void>(`${BASE}/update`, data),
  delete: (id: string) => http.post<void>(`${BASE}/delete`, { id }),
  toggleEnabled: (data: ExternalDataSourceToggleRequest) =>
    http.post<void>(`${BASE}/toggle-enabled`, data),
}
