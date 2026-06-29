import type { MarkOcrHealthStatusCode, MarkOcrProviderTypeCode } from './ocr-types'
import http from '@/config/axios'

export interface MarkOcrConfigVO {
  id?: string
  tenantId?: string
  providerType?: MarkOcrProviderTypeCode
  providerName?: string
  enabled: boolean
  healthStatus: MarkOcrHealthStatusCode
  lastHealthCheckTime?: string
  lastHealthMessage?: string
}

export interface MarkOcrConfigSaveRequest {
  tenantId: string
  providerType: MarkOcrProviderTypeCode
  enabled: boolean
}

export interface MarkOcrConfigHealthCheckRequest {
  tenantId: string
}

export interface MarkOcrConfigHealthCheckVO {
  providerType: MarkOcrProviderTypeCode
  healthStatus: MarkOcrHealthStatusCode
  healthMessage: string
}

export function getCurrentMarkOcrConfig(tenantId?: string): Promise<MarkOcrConfigVO> {
  return http.post<MarkOcrConfigVO>('/api/mark/ocr/config/current', { tenantId })
}

export function saveMarkOcrConfig(request: MarkOcrConfigSaveRequest): Promise<string> {
  return http.post<string>('/api/mark/ocr/config/save', request)
}

export function checkMarkOcrHealth(tenantId: string): Promise<MarkOcrConfigHealthCheckVO> {
  return http.post<MarkOcrConfigHealthCheckVO>('/api/mark/ocr/config/health-check', { tenantId })
}
