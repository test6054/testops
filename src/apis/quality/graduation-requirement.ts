import type { AggregationFunction } from './types'
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
  /** 思政维度原始串（后端 String，例如逗号分隔的代码列表） */
  civicDimensions?: string
  thresholdValue?: number
  aggregation?: AggregationFunction
  sortOrder?: number
  createTime?: string
  updateTime?: string
}

export interface GraduationRequirementQueryPayload extends QueryDto {
  trainingPlanId?: string
  keyword?: string
}

/** 保存请求 - 严格对齐后端 GraduationRequirementSaveRequest */
export interface GraduationRequirementSavePayload {
  id?: string
  trainingPlanId: string
  requirementCode: string
  requirementName: string
  description?: string
  civicDimensions?: string
  thresholdValue?: number
  aggregation?: AggregationFunction
  sortOrder?: number
}

export const graduationRequirementApi = {
  page: (data: GraduationRequirementQueryPayload) =>
    http.post<PageResult<GraduationRequirementVO>>(`${BASE}/page`, data),
  listByPlan: (trainingPlanId: string) =>
    http.post<GraduationRequirementVO[]>(`${BASE}/list-by-plan`, { id: trainingPlanId }),
  detail: (id: string) =>
    http.post<GraduationRequirementVO>(`${BASE}/detail`, { id }),
  create: (data: GraduationRequirementSavePayload) =>
    http.post<string>(`${BASE}/create`, data),
  update: (data: GraduationRequirementSavePayload) =>
    http.post<void>(`${BASE}/update`, data),
  delete: (id: string) =>
    http.post<void>(`${BASE}/delete`, { id }),
}
