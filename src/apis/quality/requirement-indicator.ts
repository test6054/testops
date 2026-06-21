import type { CivicDimension } from './types'
/**
 * 毕业要求观测点 API。
 * 后端对象：RequirementIndicatorController /api/quality/requirement-indicators。
 */
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
  civicDimensions?: CivicDimension[]
  sortOrder?: number
  createTime?: string
  updateTime?: string
}

export interface RequirementIndicatorSaveRequest {
  id?: string
  requirementId: string
  indicatorCode: string
  indicatorName: string
  description?: string
  requirementWeight: number
  thresholdValue?: number
  civicDimensions?: CivicDimension[]
  sortOrder?: number
}

export const requirementIndicatorApi = {
  listByRequirement: (requirementId: string) =>
    http.post<RequirementIndicatorVO[]>(`${INDICATOR}/list-by-requirement`, { id: requirementId }),
  detail: (id: string) => http.post<RequirementIndicatorVO>(`${INDICATOR}/detail`, { id }),
  create: (data: RequirementIndicatorSaveRequest) => http.post<string>(`${INDICATOR}/create`, data),
  update: (data: RequirementIndicatorSaveRequest) => http.post<void>(`${INDICATOR}/update`, data),
  delete: (id: string) => http.post<void>(`${INDICATOR}/delete`, { id }),
  /** 校验某毕业要求下所有观测点权重之和是否为 1，不满足时抛出 BizException */
  validateWeights: (requirementId: string) =>
    http.post<void>(`${INDICATOR}/validate-weights`, { id: requirementId }),
}
