import type { CivicDimension } from './types'
/**
 * 毕业要求观测点 + 观测点-标准映射 API
 *
 * 后端路径：
 * - /api/quality/requirement-indicators           观测点 CRUD + 权重校验
 * - /api/quality/requirement-standard-mappings    观测点-标准条款映射 CRUD
 *
 * 权重约束：同一毕业要求下所有观测点 requirementWeight 之和必须为 1。
 */
import http from '@/config/axios'

const INDICATOR = '/api/quality/requirement-indicators'
const MAPPING = '/api/quality/requirement-standard-mappings'

export interface RequirementIndicatorVO {
  id: string
  requirementId: string
  indicatorCode: string
  indicatorName: string
  description?: string
  requirementWeight: number
  thresholdValue?: number
  /** 五育维度标签集合：逗号分隔的 CivicDimension */
  civicDimensions?: string
  sortOrder?: number
  createTime?: string
  updateTime?: string
}

export interface RequirementIndicatorSavePayload {
  id?: string
  requirementId: string
  indicatorCode: string
  indicatorName: string
  description?: string
  requirementWeight: number
  thresholdValue?: number
  civicDimensions?: string | CivicDimension[]
  sortOrder?: number
}

export interface RequirementStandardMappingVO {
  id: string
  requirementId: string
  standardId: string
  standardClause?: string
  coverageNote?: string
  createTime?: string
  updateTime?: string
}

export interface RequirementStandardMappingSavePayload {
  id?: string
  requirementId: string
  standardId: string
  standardClause?: string
  coverageNote?: string
}

export const requirementIndicatorApi = {
  listByRequirement: (requirementId: string) =>
    http.post<RequirementIndicatorVO[]>(`${INDICATOR}/list-by-requirement`, { id: requirementId }),
  detail: (id: string) =>
    http.post<RequirementIndicatorVO>(`${INDICATOR}/detail`, { id }),
  create: (data: RequirementIndicatorSavePayload) =>
    http.post<string>(`${INDICATOR}/create`, data),
  update: (data: RequirementIndicatorSavePayload) =>
    http.post<void>(`${INDICATOR}/update`, data),
  delete: (id: string) =>
    http.post<void>(`${INDICATOR}/delete`, { id }),
  /** 校验某毕业要求下所有观测点权重之和是否为 1，不满足时抛出 BizException */
  validateWeights: (requirementId: string) =>
    http.post<void>(`${INDICATOR}/validate-weights`, { id: requirementId }),
}

export const requirementStandardMappingApi = {
  listByRequirement: (requirementId: string) =>
    http.post<RequirementStandardMappingVO[]>(`${MAPPING}/list-by-requirement`, { id: requirementId }),
  detail: (id: string) =>
    http.post<RequirementStandardMappingVO>(`${MAPPING}/detail`, { id }),
  create: (data: RequirementStandardMappingSavePayload) =>
    http.post<string>(`${MAPPING}/create`, data),
  update: (data: RequirementStandardMappingSavePayload) =>
    http.post<void>(`${MAPPING}/update`, data),
  delete: (id: string) =>
    http.post<void>(`${MAPPING}/delete`, { id }),
}
