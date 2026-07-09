/**
 * 毕业要求-认证标准条款映射 API。
 * 后端对象：RequirementStandardMappingController /api/quality/requirement-standard-mappings。
 */
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

const MAPPING = '/api/quality/requirement-standard-mappings'

export interface RequirementStandardMappingVO {
  id: string
  requirementId: string
  standardId: string
  standardClause?: string
  coverageNote?: string
  createTime?: string
  updateTime?: string
}

export interface RequirementStandardMappingQueryRequest extends QueryDto {
  graduationRequirementId?: string
  standardId?: string
  keyword?: string
}

export interface RequirementStandardMappingSaveRequest {
  id?: string
  requirementId: string
  standardId: string
  standardClause?: string
  coverageNote?: string
}

export const requirementStandardMappingApi = {
  page: (data: RequirementStandardMappingQueryRequest) =>
    http.post<PageResult<RequirementStandardMappingVO>>(`${MAPPING}/page`, data),
  detail: (id: string) => http.post<RequirementStandardMappingVO>(`${MAPPING}/detail`, { id }),
  create: (data: RequirementStandardMappingSaveRequest) =>
    http.post<string>(`${MAPPING}/create`, data),
  update: (data: RequirementStandardMappingSaveRequest) =>
    http.post<void>(`${MAPPING}/update`, data),
  delete: (id: string) => http.post<void>(`${MAPPING}/delete`, { id }),
}
