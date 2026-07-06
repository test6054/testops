import type { AccreditationTypeCode } from './types'
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
  accreditationType: AccreditationTypeCode
  standardYear?: string
  issuingAuthority?: string
  documentNumber?: string
  sourceUrl?: string
  summary?: string
  enabled?: boolean
  isPilotOnly?: boolean
  createTime?: string
  updateTime?: string
}

export interface AccreditationStandardSummaryVO {
  totalCount: number
  enabledCount: number
  disabledCount: number
  pilotOnlyCount: number
  accreditationTypeCount: number
}

export interface AccreditationStandardSaveRequest {
  id?: string
  standardCode: string
  standardName: string
  accreditationType: AccreditationTypeCode
  standardYear?: string
  issuingAuthority?: string
  documentNumber?: string
  sourceUrl?: string
  summary?: string
  enabled?: boolean
  isPilotOnly?: boolean
}

export interface AccreditationStandardQueryRequest extends QueryDto {
  accreditationType?: AccreditationTypeCode
  standardYear?: string
  enabled?: boolean
  keyword?: string
}

export const accreditationStandardApi = {
  page: (data: AccreditationStandardQueryRequest) =>
    http.post<PageResult<AccreditationStandardVO>>(`${BASE}/page`, data),
  summary: () => http.post<AccreditationStandardSummaryVO>(`${BASE}/summary`, {}),
  detail: (id: string) => http.post<AccreditationStandardVO>(`${BASE}/detail`, { id }),
  create: (data: AccreditationStandardSaveRequest) => http.post<string>(`${BASE}/create`, data),
  update: (data: AccreditationStandardSaveRequest) => http.post<void>(`${BASE}/update`, data),
  delete: (id: string) => http.post<void>(`${BASE}/delete`, { id }),
}
