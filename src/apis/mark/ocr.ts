import type { BadgeTone } from '@/components/ui-guide/ui/types'
import http from '@/config/axios'

export type MarkOcrProviderTypeCode = 'TENCENT' | 'BAIDU' | 'PADDLE'

export type MarkOcrHealthStatusCode = 'UNKNOWN' | 'HEALTHY' | 'FAILED'

export const MARK_OCR_PROVIDER_LABEL: Record<MarkOcrProviderTypeCode, string> = {
  TENCENT: '腾讯云 OCR',
  BAIDU: '百度 OCR',
  PADDLE: 'PaddleOCR 本地服务',
}

/** OCR 渠道下拉选项，值必须与后端 MarkOcrProviderType 完全一致 */
export const MARK_OCR_PROVIDER_OPTIONS: Array<{
  label: string
  value: MarkOcrProviderTypeCode
}> = [
  { value: 'TENCENT', label: MARK_OCR_PROVIDER_LABEL.TENCENT },
  { value: 'BAIDU', label: MARK_OCR_PROVIDER_LABEL.BAIDU },
  { value: 'PADDLE', label: MARK_OCR_PROVIDER_LABEL.PADDLE },
]

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
  enabled: boolean
  healthStatus: MarkOcrHealthStatusCode
  lastHealthCheckAt?: string
  lastHealthMessage?: string
}

export interface MarkOcrConfigSaveRequest {
  providerType: MarkOcrProviderTypeCode
  enabled: boolean
}

export interface MarkOcrConfigHealthCheckVO {
  providerType: MarkOcrProviderTypeCode
  healthStatus: MarkOcrHealthStatusCode
  healthMessage: string
}

export interface MarkOcrRecognizeRequest {
  examId: string
  paperInstanceId: string
  questionTemplateId: string
}

export interface MarkOcrRecognizeVO {
  providerType: MarkOcrProviderTypeCode
  recognizedText: string
  engineTraceId: string
  diagnostic: string
}

/**
 * PaddleOCR 服务实例视图 - 对应后端 PaddleOcrInstanceResponse。
 *
 * <p>{@code healthStatus} 复用 edu-common 的 AiHealthStatus，与 OCR 主配置健康状态共用枚举
 * （UNKNOWN / HEALTHY / FAILED）。{@code localAutoDeploy} 标识该实例是否为
 * Docker Compose 本地随服务一起自动拉起的实例。</p>
 */
export interface PaddleOcrInstanceVO {
  id: string
  instanceName: string
  serviceUrl: string
  deviceType: string
  healthStatus: MarkOcrHealthStatusCode
  lastHealthCheckAt?: string
  lastHealthMessage?: string
  consecutiveFailures: number
  localAutoDeploy: boolean
}

export function getCurrentMarkOcrConfig(): Promise<MarkOcrConfigVO> {
  return http.get<MarkOcrConfigVO>('/api/mark/ocr/config/current')
}

export function saveMarkOcrConfig(request: MarkOcrConfigSaveRequest): Promise<string> {
  return http.post<string>('/api/mark/ocr/config/save', request)
}

export function checkMarkOcrHealth(): Promise<MarkOcrConfigHealthCheckVO> {
  return http.post<MarkOcrConfigHealthCheckVO>('/api/mark/ocr/config/health-check')
}

export function recognizeMarkOcr(request: MarkOcrRecognizeRequest): Promise<MarkOcrRecognizeVO> {
  return http.post<MarkOcrRecognizeVO>('/api/mark/ocr/recognize', request)
}

/**
 * 查询全部已注册的 PaddleOCR 服务实例（含健康状态、最近探活、连续失败次数）。
 *
 * <p>仅当租户当前 OCR 渠道为 PADDLE 时使用：用于在 OCR 设置页内嵌「实例列表」面板，
 * 供管理员确认后端识别请求实际命中的服务实例。后端按 health_status asc, updated_at desc 排序，
 * 健康实例排在前面。</p>
 *
 * GET /api/mark/ocr/paddle/instance/list
 */
export function listPaddleOcrInstances(): Promise<PaddleOcrInstanceVO[]> {
  return http.get<PaddleOcrInstanceVO[]>('/api/mark/ocr/paddle/instance/list')
}
