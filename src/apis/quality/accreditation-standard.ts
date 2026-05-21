import type { AccreditationType } from './types'
/**
 * 认证标准配置 API - 对应 AccreditationStandardController
 * 后端路径：/api/quality/accreditation-standards
 */
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

const BASE = '/api/quality/accreditation-standards'

export interface AccreditationStandardVO {
  id: string
  standardCode: string
  standardName: string
  accreditationType: AccreditationType
  standardYear?: string
  issuingAuthority?: string
  documentNumber?: string
  sourceUrl?: string
  summary?: string
  enabled: boolean
  isPilotOnly?: boolean
  createTime?: string
  updateTime?: string
}

export interface AccreditationStandardSavePayload {
  id?: string
  standardCode: string
  standardName: string
  accreditationType: AccreditationType
  standardYear?: string
  issuingAuthority?: string
  documentNumber?: string
  sourceUrl?: string
  summary?: string
  enabled?: boolean
  isPilotOnly?: boolean
}

export interface AccreditationStandardQueryPayload extends QueryDto {
  accreditationType?: AccreditationType
  standardYear?: string
  enabled?: boolean
  keyword?: string
}

export const accreditationStandardApi = {
  page: (data: AccreditationStandardQueryPayload) =>
    http.post<PageResult<AccreditationStandardVO>>(`${BASE}/page`, data),
  detail: (id: string) =>
    http.post<AccreditationStandardVO>(`${BASE}/detail`, { id }),
  create: (data: AccreditationStandardSavePayload) =>
    http.post<string>(`${BASE}/create`, data),
  update: (data: AccreditationStandardSavePayload) =>
    http.post<void>(`${BASE}/update`, data),
  delete: (id: string) =>
    http.post<void>(`${BASE}/delete`, { id }),
}
