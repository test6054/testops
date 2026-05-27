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
  enabled: boolean
  healthStatus: MarkOcrHealthStatusCode
  lastHealthCheckAt?: string
  lastHealthMessage?: string
}

export interface MarkOcrConfigSavePayload {
  providerType: MarkOcrProviderTypeCode
  enabled: boolean
}

export interface MarkOcrConfigHealthCheckVO {
  providerType: MarkOcrProviderTypeCode
  healthStatus: MarkOcrHealthStatusCode
  healthMessage: string
}

export interface MarkOcrRecognizePayload {
  examId: string
  paperInstanceId?: string
  questionTemplateId?: string
  responseSliceId?: string
  fileId?: string
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
  return http
    .get<unknown>('/api/mark/ocr/config/current')
    .then(validateMarkOcrConfig)
}

export function saveMarkOcrConfig(payload: MarkOcrConfigSavePayload): Promise<string> {
  return http.post<string>('/api/mark/ocr/config/save', payload)
}

export function checkMarkOcrHealth(): Promise<MarkOcrConfigHealthCheckVO> {
  return http
    .post<unknown>('/api/mark/ocr/config/health-check')
    .then(validateMarkOcrHealthCheck)
}

export function recognizeMarkOcr(payload: MarkOcrRecognizePayload): Promise<MarkOcrRecognizeVO> {
  return http
    .post<unknown>('/api/mark/ocr/recognize', payload)
    .then(validateMarkOcrRecognize)
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
  return http
    .get<unknown>('/api/mark/ocr/paddle/instance/list')
    .then(validatePaddleOcrInstanceList)
}

function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`OCR 接口缺少 ${fieldName}`)
  }
  return value
}

function requireText(value: unknown, fieldName: string): string {
  if (typeof value !== 'string') {
    throw new TypeError(`OCR 接口缺少 ${fieldName}`)
  }
  return value
}

function requireBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value !== 'boolean') {
    throw new TypeError(`OCR 接口缺少 ${fieldName}`)
  }
  return value
}

function requireNumber(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`OCR 接口缺少 ${fieldName}`)
  }
  return value
}

function optionalString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string') {
    throw new TypeError(`OCR 接口 ${fieldName} 格式错误`)
  }
  return value
}

function requireProviderType(value: unknown): MarkOcrProviderTypeCode {
  if (value !== 'TENCENT' && value !== 'BAIDU' && value !== 'PADDLE') {
    throw new TypeError('OCR 接口 providerType 格式错误')
  }
  return value
}

function requireHealthStatus(value: unknown): MarkOcrHealthStatusCode {
  if (value !== 'UNKNOWN' && value !== 'HEALTHY' && value !== 'FAILED') {
    throw new TypeError('OCR 接口 healthStatus 格式错误')
  }
  return value
}

function validateMarkOcrConfig(value: unknown): MarkOcrConfigVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('OCR 配置响应格式错误')
  }
  const record = value as Record<string, unknown>
  const id = optionalString(record.id, 'id')
  const providerType = record.providerType === undefined || record.providerType === null
    ? undefined
    : requireProviderType(record.providerType)
  const providerName = optionalString(record.providerName, 'providerName')
  const enabled = requireBoolean(record.enabled, 'enabled')
  if (id && (!providerType || !providerName)) {
    throw new TypeError('OCR 配置响应缺少已保存渠道信息')
  }
  if (enabled && !providerType) {
    throw new TypeError('OCR 配置响应缺少已启用渠道类型')
  }
  return {
    id,
    providerType,
    providerName,
    enabled,
    healthStatus: requireHealthStatus(record.healthStatus),
    lastHealthCheckAt: optionalString(record.lastHealthCheckAt, 'lastHealthCheckAt'),
    lastHealthMessage: optionalString(record.lastHealthMessage, 'lastHealthMessage'),
  }
}

function validateMarkOcrHealthCheck(value: unknown): MarkOcrConfigHealthCheckVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('OCR 健康检查响应格式错误')
  }
  const record = value as Record<string, unknown>
  return {
    providerType: requireProviderType(record.providerType),
    healthStatus: requireHealthStatus(record.healthStatus),
    healthMessage: requireString(record.healthMessage, 'healthMessage'),
  }
}

function validateMarkOcrRecognize(value: unknown): MarkOcrRecognizeVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('OCR 识别响应格式错误')
  }
  const record = value as Record<string, unknown>
  return {
    providerType: requireProviderType(record.providerType),
    recognizedText: requireText(record.recognizedText, 'recognizedText'),
    engineTraceId: requireString(record.engineTraceId, 'engineTraceId'),
    diagnostic: requireString(record.diagnostic, 'diagnostic'),
  }
}

function validatePaddleOcrInstanceList(value: unknown): PaddleOcrInstanceVO[] {
  if (!Array.isArray(value)) {
    throw new TypeError('PaddleOCR 实例列表响应格式错误')
  }
  return value.map((item) => {
    if (!item || typeof item !== 'object') {
      throw new TypeError('PaddleOCR 实例响应格式错误')
    }
    const record = item as Record<string, unknown>
    return {
      id: requireString(record.id, 'id'),
      instanceName: requireString(record.instanceName, 'instanceName'),
      serviceUrl: requireString(record.serviceUrl, 'serviceUrl'),
      deviceType: requireString(record.deviceType, 'deviceType'),
      healthStatus: requireHealthStatus(record.healthStatus),
      lastHealthCheckAt: optionalString(record.lastHealthCheckAt, 'lastHealthCheckAt'),
      lastHealthMessage: optionalString(record.lastHealthMessage, 'lastHealthMessage'),
      consecutiveFailures: requireNumber(record.consecutiveFailures, 'consecutiveFailures'),
      localAutoDeploy: requireBoolean(record.localAutoDeploy, 'localAutoDeploy'),
    }
  })
}
