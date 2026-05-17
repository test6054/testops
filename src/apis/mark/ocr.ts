import type { BadgeTone } from '@/components/ui-guide/ui/types'
import http from '@/config/axios'

export type MarkOcrProviderTypeCode = 'TENCENT' | 'BAIDU' | 'PADDLE'

export type MarkOcrHealthStatusCode = 'UNKNOWN' | 'HEALTHY' | 'FAILED'

export const MARK_OCR_PROVIDER_LABEL: Record<MarkOcrProviderTypeCode, string> = {
  TENCENT: '腾讯云 OCR',
  BAIDU: '百度 OCR',
  PADDLE: 'PaddleOCR 本地服务',
}

export const MARK_OCR_PROVIDER_DESCRIPTION: Record<MarkOcrProviderTypeCode, string> = {
  TENCENT: '使用平台统一配置的腾讯云企业账号识别题目切片。',
  BAIDU: '使用平台统一配置的百度 OCR 企业账号识别题目切片。',
  PADDLE: '使用平台部署的 PaddleOCR HTTP 服务，图片不出域。',
}

export const MARK_OCR_HEALTH_STATUS_LABEL: Record<MarkOcrHealthStatusCode, string> = {
  UNKNOWN: '未检查',
  HEALTHY: '健康',
  FAILED: '异常',
}

export const MARK_OCR_HEALTH_STATUS_COLOR: Record<MarkOcrHealthStatusCode, BadgeTone> = {
  UNKNOWN: 'gray',
  HEALTHY: 'green',
  FAILED: 'red',
}

export interface MarkOcrConfigVO {
  id?: string
  providerType?: MarkOcrProviderTypeCode
  providerName?: string
  enabled?: boolean
  healthStatus?: MarkOcrHealthStatusCode
  lastHealthCheckAt?: string
  lastHealthMessage?: string
}

export interface MarkOcrConfigSavePayload {
  providerType: MarkOcrProviderTypeCode
  enabled: boolean
}

export interface MarkOcrConfigHealthCheckVO {
  providerType?: MarkOcrProviderTypeCode
  healthStatus?: MarkOcrHealthStatusCode
  healthMessage?: string
}

export interface MarkOcrRecognizePayload {
  examId: string
  paperInstanceId?: string
  questionTemplateId?: string
  responseSliceId?: string
  fileId?: string
}

export interface MarkOcrRecognizeVO {
  providerType?: MarkOcrProviderTypeCode
  recognizedText?: string
  engineTraceId?: string
  diagnostic?: string
}

export function getCurrentMarkOcrConfig(): Promise<MarkOcrConfigVO> {
  return http.get<MarkOcrConfigVO>('/api/mark/ocr/config/current')
}

export function saveMarkOcrConfig(payload: MarkOcrConfigSavePayload): Promise<string> {
  return http.post<string>('/api/mark/ocr/config/save', payload)
}

export function checkMarkOcrHealth(): Promise<MarkOcrConfigHealthCheckVO> {
  return http.post<MarkOcrConfigHealthCheckVO>('/api/mark/ocr/config/health-check')
}

export function recognizeMarkOcr(payload: MarkOcrRecognizePayload): Promise<MarkOcrRecognizeVO> {
  return http.post<MarkOcrRecognizeVO>('/api/mark/ocr/recognize', payload)
}
