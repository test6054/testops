import type { AccreditationType, AggregationFunction } from './types'
/**
 * 专业算法模板 API - 对应 ProfessionAlgorithmTemplateController
 * 后端路径：/api/quality/profession-algorithm-templates
 *
 * 设计文档 §7.2 三层结构第 2 层：认证标准 → 专业算法模板 → 专业实例。
 */
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

const BASE = '/api/quality/profession-algorithm-templates'

export interface ProfessionAlgorithmTemplateVO {
  id: string
  tenantId: string
  templateCode: string
  templateName: string
  accreditationType: AccreditationType
  disciplineCategory?: string
  standardId?: string
  standardYear?: string
  description?: string
  defaultRequirementStructure?: string
  defaultIndicatorStructure?: string
  defaultEvidenceTypes?: string
  professionEvidenceRubric?: string
  courseGoalAggregation?: AggregationFunction
  indicatorAggregation?: AggregationFunction
  requirementAggregation?: AggregationFunction
  directWeightDefault?: number
  indirectWeightDefault?: number
  indirectMinValidSampleCount?: number
  indirectCoverageThreshold?: number
  courseGoalThresholdDefault?: number
  indicatorThresholdDefault?: number
  requirementThresholdDefault?: number
  aiLiteracySupported?: boolean
  civicDimensionsSupported?: boolean
  enabled: boolean
  createTime?: string
  updateTime?: string
}

export interface ProfessionAlgorithmTemplateSavePayload {
  id?: string
  templateCode: string
  templateName: string
  accreditationType: AccreditationType
  disciplineCategory?: string
  standardId?: string
  standardYear?: string
  description?: string
  defaultRequirementStructure?: string
  defaultIndicatorStructure?: string
  defaultEvidenceTypes?: string
  professionEvidenceRubric?: string
  courseGoalAggregation?: AggregationFunction
  indicatorAggregation?: AggregationFunction
  requirementAggregation?: AggregationFunction
  directWeightDefault?: number
  indirectWeightDefault?: number
  indirectMinValidSampleCount?: number
  indirectCoverageThreshold?: number
  courseGoalThresholdDefault?: number
  indicatorThresholdDefault?: number
  requirementThresholdDefault?: number
  aiLiteracySupported?: boolean
  civicDimensionsSupported?: boolean
  enabled?: boolean
}

export interface ProfessionAlgorithmTemplateQueryPayload extends QueryDto {
  accreditationType?: AccreditationType
  enabled?: boolean
  keyword?: string
}

export const professionAlgorithmTemplateApi = {
  page: (data: ProfessionAlgorithmTemplateQueryPayload) =>
    http.post<PageResult<ProfessionAlgorithmTemplateVO>>(`${BASE}/page`, data),
  detail: (id: string) =>
    http.post<ProfessionAlgorithmTemplateVO>(`${BASE}/detail`, { id }),
  create: (data: ProfessionAlgorithmTemplateSavePayload) =>
    http.post<string>(`${BASE}/create`, data),
  copyToTenant: (id: string) =>
    http.post<string>(`${BASE}/copy-to-tenant`, { id }),
  update: (data: ProfessionAlgorithmTemplateSavePayload) =>
    http.post<void>(`${BASE}/update`, data),
  delete: (id: string) =>
    http.post<void>(`${BASE}/delete`, { id }),
}
