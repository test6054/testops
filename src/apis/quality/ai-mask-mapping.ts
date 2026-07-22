/**
 * AI 脱敏映射 API - 对应 AiMaskMappingController
 * 后端路径：/api/quality/ai-mask-mappings
 *
 * 前端只读取脱敏映射审计摘要，敏感内容不进入页面侧合同。
 */
import type { AiTaskBusinessTypeCode } from './types'
import http from '@/config/axios'

const BASE = '/api/quality/ai-mask-mappings'

export interface AiMaskMappingVO {
  id: string
  tenantId?: string
  aiTaskId: string
  businessType: AiTaskBusinessTypeCode
  businessId: string
  businessLabel: string
  createTime?: string
  updateTime?: string
}

export interface AiMaskMappingAuditItemVO {
  mappingType?: string
  sourceId?: string
  anonymousLabel?: string
}

export interface AiMaskMappingAuditVO {
  id: string
  tenantId?: string
  aiTaskId: string
  businessType: AiTaskBusinessTypeCode
  businessId: string
  businessLabel: string
  mappingItems?: AiMaskMappingAuditItemVO[]
  createTime?: string
  updateTime?: string
}

export const aiMaskMappingApi = {
  detail: (id: string) =>
    http.post<AiMaskMappingVO>(`${BASE}/detail`, { id }),
  /** 按 AI 任务读取脱敏映射审计摘要 */
  getByTask: (aiTaskId: string) =>
    http.post<AiMaskMappingVO | null>(`${BASE}/get-by-task`, { id: aiTaskId }),
  /** 受控读取脱敏映射审计详情 */
  auditDetail: (id: string) =>
    http.post<AiMaskMappingAuditVO>(`${BASE}/audit-detail`, { id }),
  /** 按 AI 任务受控读取脱敏映射审计详情 */
  auditDetailByTask: (aiTaskId: string) =>
    http.post<AiMaskMappingAuditVO | null>(`${BASE}/audit-detail-by-task`, { id: aiTaskId }),
}
