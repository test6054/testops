import type { AggregationFunctionCode, CivicDimensionCode } from './types'
/**
 * 毕业要求 API - 对接 edu-quality / GraduationRequirementController
 *
 * 后端路径: /api/quality/graduation-requirements
 */
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

const BASE = '/api/quality/graduation-requirements'

/** 毕业要求 VO - 严格对齐后端 GraduationRequirementVO */
export interface GraduationRequirementVO {
  id: string
  trainingPlanId: string
  requirementCode: string
  requirementName: string
  description?: string
  civicDimensions?: CivicDimensionCode[]
  thresholdValue?: number
  aggregation?: AggregationFunctionCode
  sortOrder?: number
  createTime?: string
  updateTime?: string
}

export interface GraduationRequirementQueryRequest extends QueryDto {
  trainingPlanId?: string
  keyword?: string
}

/** 保存请求 - 严格对齐后端 GraduationRequirementSaveRequest */
export interface GraduationRequirementSaveRequest {
  id?: string
  trainingPlanId: string
  requirementCode: string
  requirementName: string
  description?: string
  civicDimensions?: CivicDimensionCode[]
  thresholdValue?: number
  aggregation?: AggregationFunctionCode
  sortOrder?: number
}

export const graduationRequirementApi = {
  page: (data: GraduationRequirementQueryRequest) =>
    http.post<PageResult<GraduationRequirementVO>>(`${BASE}/page`, data),
  detail: (id: string) => http.post<GraduationRequirementVO>(`${BASE}/detail`, { id }),
  create: (data: GraduationRequirementSaveRequest) => http.post<string>(`${BASE}/create`, data),
  update: (data: GraduationRequirementSaveRequest) => http.post<void>(`${BASE}/update`, data),
  delete: (id: string) => http.post<void>(`${BASE}/delete`, { id }),
}
