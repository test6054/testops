import type { ScaleType } from './types'
/**
 * 量表换算规则 API - 对应 ScaleConversionRuleController
 * 后端路径：/api/quality/scale-conversion-rules
 *
 * 用于间接评价的量表换算与跨量表归一：原始量表值 → 0~1 分值。
 * conversionMap 为 JSON：{ 原始值: 换算分值, ... }
 */
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

const BASE = '/api/quality/scale-conversion-rules'

export interface ScaleConversionRuleVO {
  id: string
  ruleCode: string
  ruleName: string
  scaleType: ScaleType
  /** 原始值 → 换算分值（0~1）映射 JSON */
  conversionMap: string
  description?: string
  enabled: boolean
  createTime?: string
  updateTime?: string
}

export interface ScaleConversionRuleSavePayload {
  id?: string
  ruleCode: string
  ruleName: string
  scaleType: ScaleType
  conversionMap: string
  description?: string
  enabled?: boolean
}

export interface ScaleConversionRuleQueryPayload extends QueryDto {
  scaleType?: ScaleType
  enabled?: boolean
}

export const scaleConversionRuleApi = {
  page: (data: ScaleConversionRuleQueryPayload) =>
    http.post<PageResult<ScaleConversionRuleVO>>(`${BASE}/page`, data),
  detail: (id: string) =>
    http.post<ScaleConversionRuleVO>(`${BASE}/detail`, { id }),
  create: (data: ScaleConversionRuleSavePayload) =>
    http.post<string>(`${BASE}/create`, data),
  update: (data: ScaleConversionRuleSavePayload) =>
    http.post<void>(`${BASE}/update`, data),
  delete: (id: string) =>
    http.post<void>(`${BASE}/delete`, { id }),
}
