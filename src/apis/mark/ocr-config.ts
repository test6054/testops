import type { MarkOcrHealthStatusCode, MarkOcrProviderTypeCode } from './ocr-types'
import http from '@/config/axios'

export interface MarkOcrConfigResponse {
  id?: string
  tenantId?: string
  providerType?: MarkOcrProviderTypeCode
  providerName?: string
  enabled: boolean
  healthStatus: MarkOcrHealthStatusCode
  lastHealthCheckTime?: string
  lastHealthMessage?: string
}

export interface MarkOcrConfigHealthCheckRequest {
  tenantId: string
}

export interface MarkOcrConfigHealthCheckResponse {
  providerType: MarkOcrProviderTypeCode
  healthStatus: MarkOcrHealthStatusCode
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
