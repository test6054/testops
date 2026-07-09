import type { ScaleTypeCode } from './types'
/**
 * 量表换算规则 API - 对应 ScaleConversionRuleController
 * 后端路径：/api/quality/scale-conversion-rules
 *
 * 用于间接评价的量表换算与跨量表归一：原始量表值 → 0~1 分值。
 */
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

const BASE = '/api/quality/scale-conversion-rules'

export interface ScaleConversionRuleItemSaveRequest {
  sourceValue: string
  normalizedScore: number
  sortOrder?: number
}

export interface ScaleConversionRuleItemVO {
  id?: string
  ruleId?: string
  sourceValue: string
  normalizedScore: number
  sortOrder?: number
}

export interface ScaleConversionRuleVO {
  id: string
  ruleCode: string
  ruleName: string
  scaleType: ScaleTypeCode
  items: ScaleConversionRuleItemVO[]
  description?: string
  enabled: boolean
  createTime?: string
  updateTime?: string
}

export interface ScaleConversionRuleSaveRequest {
  id?: string
  ruleCode: string
  ruleName: string
  scaleType: ScaleTypeCode
  items: ScaleConversionRuleItemSaveRequest[]
  description?: string
  enabled?: boolean
}

export interface ScaleConversionRuleQueryRequest extends QueryDto {
  scaleType?: ScaleTypeCode
  enabled?: boolean
}

/** SignalBand 汇总响应 - 对齐后端 ScaleConversionRuleSignalSummaryVO */
export interface ScaleConversionRuleSignalSummaryVO {
  totalCount: number
  enabledCount: number
  disabledCount: number
  scaleTypeCoverageCount: number
}

export const scaleConversionRuleApi = {
  page: (data: ScaleConversionRuleQueryRequest) =>
    http.post<PageResult<ScaleConversionRuleVO>>(`${BASE}/page`, data),
  signalSummary: (data: ScaleConversionRuleQueryRequest) =>
    http.post<ScaleConversionRuleSignalSummaryVO>(`${BASE}/signal-summary`, data),
  detail: (id: string) => http.post<ScaleConversionRuleVO>(`${BASE}/detail`, { id }),
  create: (data: ScaleConversionRuleSaveRequest) => http.post<string>(`${BASE}/create`, data),
  update: (data: ScaleConversionRuleSaveRequest) => http.post<void>(`${BASE}/update`, data),
  delete: (id: string) => http.post<void>(`${BASE}/delete`, { id }),
}
