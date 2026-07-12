import type { MarkOcrProviderTypeCode } from './ocr-types'
import http from '@/config/axios'

export interface MarkOcrPlatformProviderResponse {
  id?: string
  providerType: MarkOcrProviderTypeCode
  providerName?: string
  enabled: boolean
  appIdConfigured?: boolean
  appIdMasked?: string
  apiKeyConfigured?: boolean
  apiKeyMasked?: string
  secretKeyConfigured?: boolean
  secretKeyMasked?: string
  region?: string
  tokenEndpoint?: string
  ocrEndpoint?: string
  handwritingEndpoint?: string
  docAnalysisEndpoint?: string
  handwritingCompositionCreateTaskEndpoint?: string
  handwritingCompositionGetResultEndpoint?: string
  updateTime?: string
}

export interface MarkOcrPlatformProviderSaveRequest {
  id?: string
  providerType: MarkOcrProviderTypeCode
  enabled: boolean
  appId?: string
  apiKey?: string
  secretKey?: string
  region?: string
  tokenEndpoint?: string
  ocrEndpoint?: string
  handwritingEndpoint?: string
  docAnalysisEndpoint?: string
  handwritingCompositionCreateTaskEndpoint?: string
  handwritingCompositionGetResultEndpoint?: string
}

export interface MarkOcrPlatformProviderHealthCheckRequest {
  providerType: MarkOcrProviderTypeCode
}

export function listMarkOcrPlatformProviders(): Promise<MarkOcrPlatformProviderResponse[]> {
  return http.post<MarkOcrPlatformProviderResponse[]>('/api/mark/ocr/platform-provider/list', {})
}

export function saveMarkOcrPlatformProvider(
  request: MarkOcrPlatformProviderSaveRequest,
): Promise<string> {
  return http.post<string>('/api/mark/ocr/platform-provider/save', request)
}

export function checkMarkOcrPlatformProviderHealth(
  request: MarkOcrPlatformProviderHealthCheckRequest,
): Promise<void> {
  return http.post<void>('/api/mark/ocr/platform-provider/health-check', request)
}
