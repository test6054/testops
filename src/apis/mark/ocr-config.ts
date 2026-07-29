import type { MarkOcrProviderTypeCode } from './ocr-types'
import http from '@/config/axios'
import {
  AiHealthStatusCode,
  ALL_AI_HEALTH_STATUS_CODES,
  ALL_MARK_OCR_PROVIDER_TYPE_CODES,
} from './ocr-types'

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

/** 校验租户 OCR 配置身份、互斥渠道及健康状态，禁止残缺配置进入工作台。 */
function assertMarkOcrConfigContract(
  response: MarkOcrConfigResponse,
  requestedTenantId?: string,
): void {
  const providerConfigured = response.providerType != null
  if (
    !response.tenantId
    || (requestedTenantId != null && response.tenantId !== requestedTenantId)
    || typeof response.enabled !== 'boolean'
    || !ALL_AI_HEALTH_STATUS_CODES.includes(response.healthStatus)
    || (providerConfigured && !ALL_MARK_OCR_PROVIDER_TYPE_CODES.includes(response.providerType!))
    || (providerConfigured && !response.id)
    || (!providerConfigured
      && (response.id != null
        || response.enabled !== false
        || response.healthStatus !== AiHealthStatusCode.UNKNOWN))
  ) {
    throw new TypeError('文字识别配置合同异常：租户、渠道或健康状态不可用')
  }
}

/** 查询当前会话目标租户的互斥文字识别渠道配置。 */
export async function getCurrentMarkOcrConfig(tenantId?: string): Promise<MarkOcrConfigResponse> {
  const response = await http.post<MarkOcrConfigResponse>(
    '/api/mark/ocr/config/current',
    tenantId ? { tenantId } : {},
  )
  assertMarkOcrConfigContract(response, tenantId)
  return response
}

/** 对指定租户当前渠道执行健康检查并校验诊断回执。 */
export async function checkMarkOcrHealth(tenantId: string): Promise<MarkOcrConfigHealthCheckResponse> {
  const response = await http.post<MarkOcrConfigHealthCheckResponse>('/api/mark/ocr/config/health-check', {
    tenantId,
  })
  if (
    !ALL_MARK_OCR_PROVIDER_TYPE_CODES.includes(response.providerType)
    || !ALL_AI_HEALTH_STATUS_CODES.includes(response.healthStatus)
    || typeof response.healthMessage !== 'string'
    || !response.healthMessage.trim()
  ) {
    throw new TypeError('文字识别健康检查合同异常：渠道、健康状态或诊断不可用')
  }
  return response
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
export async function saveMarkOcrConfig(request: MarkOcrConfigSaveRequest): Promise<string> {
  const configId = await http.post<string>('/api/mark/ocr/config/save', request)
  if (!configId) {
    throw new TypeError('文字识别渠道保存回执异常：配置 ID 不可用')
  }
  return configId
}
