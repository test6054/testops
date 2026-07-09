import type { CivicDimensionCode } from './types'
/**
 * 毕业要求观测点 API。
 * 后端对象：RequirementIndicatorController /api/quality/requirement-indicators。
 */
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

const INDICATOR = '/api/quality/requirement-indicators'

export interface RequirementIndicatorVO {
  id: string
  requirementId: string
  indicatorCode: string
  indicatorName: string
  description?: string
  requirementWeight: number
  thresholdValue?: number
  civicDimensions?: CivicDimensionCode[]
  sortOrder?: number
  createTime?: string
  updateTime?: string
}

export interface RequirementIndicatorQueryRequest extends QueryDto {
  trainingPlanId?: string
  graduationRequirementId?: string
  keyword?: string
}

export interface RequirementIndicatorSaveRequest {
  id?: string
  requirementId: string
  indicatorCode: string
  indicatorName: string
  description?: string
  requirementWeight: number
  thresholdValue?: number
  civicDimensions?: CivicDimensionCode[]
  sortOrder?: number
}

export const requirementIndicatorApi = {
  page: (data: RequirementIndicatorQueryRequest) =>
    http.post<PageResult<RequirementIndicatorVO>>(`${INDICATOR}/page`, data),
  detail: (id: string) => http.post<RequirementIndicatorVO>(`${INDICATOR}/detail`, { id }),
  create: (data: RequirementIndicatorSaveRequest) => http.post<string>(`${INDICATOR}/create`, data),
  update: (data: RequirementIndicatorSaveRequest) => http.post<void>(`${INDICATOR}/update`, data),
  delete: (id: string) => http.post<void>(`${INDICATOR}/delete`, { id }),
  validateWeights: (requirementId: string) =>
    http.post<void>(`${INDICATOR}/validate-weights`, { id: requirementId }),
}
