import type { AccreditationTypeCode, AggregationFunctionCode } from './types'
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
  accreditationType: AccreditationTypeCode
  disciplineCategory?: string
  standardId?: string
  standardYear?: string
  description?: string
  courseGoalAggregation: AggregationFunctionCode
  indicatorAggregation: AggregationFunctionCode
  requirementAggregation: AggregationFunctionCode
  directWeightDefault: number
  indirectWeightDefault: number
  indirectMinValidSampleCount: number
  indirectCoverageThreshold: number
  courseGoalThresholdDefault: number
  indicatorThresholdDefault: number
  requirementThresholdDefault: number
  aiLiteracySupported: boolean
  civicDimensionsSupported: boolean
  enabled: boolean
  createTime?: string
  updateTime?: string
}

export interface ProfessionAlgorithmTemplateSaveRequest {
  id?: string
  templateCode: string
  templateName: string
  accreditationType: AccreditationTypeCode
  disciplineCategory?: string
  standardId?: string
  standardYear?: string
  description?: string
  courseGoalAggregation: AggregationFunctionCode
  indicatorAggregation: AggregationFunctionCode
  requirementAggregation: AggregationFunctionCode
  directWeightDefault: number
  indirectWeightDefault: number
  indirectMinValidSampleCount: number
  indirectCoverageThreshold: number
  courseGoalThresholdDefault: number
  indicatorThresholdDefault: number
  requirementThresholdDefault: number
  aiLiteracySupported: boolean
  civicDimensionsSupported: boolean
  enabled: boolean
}

export interface ProfessionAlgorithmTemplateQueryRequest extends QueryDto {
  accreditationType?: AccreditationTypeCode
  enabled?: boolean
  keyword?: string
}

/** SignalBand 汇总响应 - 对齐后端 ProfessionAlgorithmTemplateSignalSummaryVO */
export interface ProfessionAlgorithmTemplateSignalSummaryVO {
  totalCount: number
  sharedCount: number
  tenantCount: number
  enabledCount: number
  disabledCount: number
  aiLiteracySupportedCount: number
  civicDimensionsSupportedCount: number
}

export const professionAlgorithmTemplateApi = {
  page: (data: ProfessionAlgorithmTemplateQueryRequest) =>
    http.post<PageResult<ProfessionAlgorithmTemplateVO>>(`${BASE}/page`, data),
  signalSummary: (data: ProfessionAlgorithmTemplateQueryRequest) =>
    http.post<ProfessionAlgorithmTemplateSignalSummaryVO>(`${BASE}/signal-summary`, data),
  detail: (id: string) => http.post<ProfessionAlgorithmTemplateVO>(`${BASE}/detail`, { id }),
  create: (data: ProfessionAlgorithmTemplateSaveRequest) =>
    http.post<string>(`${BASE}/create`, data),
  copyToTenant: (id: string) => http.post<string>(`${BASE}/copy-to-tenant`, { id }),
  update: (data: ProfessionAlgorithmTemplateSaveRequest) => http.post<void>(`${BASE}/update`, data),
  delete: (id: string) => http.post<void>(`${BASE}/delete`, { id }),
}
