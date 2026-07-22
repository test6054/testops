import type { AiHealthStatusCode, MarkOcrProviderTypeCode } from './ocr-types'
import http from '@/config/axios'

export interface MarkOcrConfigResponse {
  id?: string
  tenantId?: string
  providerType?: MarkOcrProviderTypeCode
  providerName?: string
  enabled: boolean
  healthStatus: AiHealthStatusCode
  lastHealthCheckTime?: string
  lastHealthMessage?: string
}

export interface MarkOcrConfigHealthCheckRequest {
  tenantId: string
}

export interface MarkOcrConfigHealthCheckResponse {
  providerType: MarkOcrProviderTypeCode
  healthStatus: AiHealthStatusCode
  healthMessage: string
}

export function getCurrentMarkOcrConfig(tenantId?: string): Promise<MarkOcrConfigResponse> {
  return http.post<MarkOcrConfigResponse>(
    '/api/mark/ocr/config/current',
    tenantId ? { tenantId } : {},
  )
}

export function checkMarkOcrHealth(tenantId: string): Promise<MarkOcrConfigHealthCheckResponse> {
  return http.post<MarkOcrConfigHealthCheckResponse>('/api/mark/ocr/config/health-check', {
    tenantId,
  })
}

export interface MarkOcrConfigSaveRequest {
  /** 目标租户 ID；超级管理员代租户配置时必填 */
  tenantId: string
  /** OCR 供应商类型；百度 / Paddle 互斥 */
  providerType: MarkOcrProviderTypeCode
  /** 是否启用 OCR 渠道 */
  enabled: boolean
}

/**
 * 超级管理员保存指定租户 OCR 渠道配置。
 * 对应 POST /api/mark/ocr/config/save；BE requireOcrConfigWritePermission（仅超管）。
 */
export function saveMarkOcrConfig(request: MarkOcrConfigSaveRequest): Promise<string> {
  return http.post<string>('/api/mark/ocr/config/save', request)
}
