import http from '@/config/axios'
import { ALL_MARK_OCR_PROVIDER_TYPE_CODES, MarkOcrProviderTypeCode } from './ocr-types'

export interface MarkOcrPlatformProviderResponse {
  id?: string
  providerType: MarkOcrProviderTypeCode
  providerName?: string
  enabled: boolean
  appIdConfigured: boolean
  appIdMasked?: string
  apiKeyConfigured: boolean
  apiKeyMasked?: string
  secretKeyConfigured: boolean
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

/** 校验平台供应商唯一性、互斥类型和脱敏凭证标记。 */
function assertPlatformProviderContract(response: MarkOcrPlatformProviderResponse): void {
  const credentialPairs: Array<[boolean | undefined, string | undefined]> = [
    [response.appIdConfigured, response.appIdMasked],
    [response.apiKeyConfigured, response.apiKeyMasked],
    [response.secretKeyConfigured, response.secretKeyMasked],
  ]
  if (
    !ALL_MARK_OCR_PROVIDER_TYPE_CODES.includes(response.providerType)
    || typeof response.enabled !== 'boolean'
    || !response.providerName?.trim()
    || credentialPairs.some(([configured, masked]) =>
      typeof configured !== 'boolean' || Boolean(masked?.trim()) !== configured)
    || (response.providerType === MarkOcrProviderTypeCode.PADDLE
      && credentialPairs.some(([configured, masked]) => configured === true || Boolean(masked)))
    || (!response.id
      && (response.enabled === true
        || credentialPairs.some(([configured, masked]) => configured === true || Boolean(masked))
        || Boolean(response.updateTime)
        || Boolean(response.tokenEndpoint)
        || Boolean(response.ocrEndpoint)
        || Boolean(response.handwritingEndpoint)))
      || (Boolean(response.id) !== Boolean(response.updateTime))
  ) {
    throw new TypeError('平台文字识别供应商合同异常：身份、类型或脱敏凭证不可用')
  }
}

/** 查询全部平台供应商及正式未配置占位行，并校验每种渠道唯一。 */
export async function listMarkOcrPlatformProviders(): Promise<MarkOcrPlatformProviderResponse[]> {
  const response = await http.post<MarkOcrPlatformProviderResponse[]>(
    '/api/mark/ocr/platform-provider/list',
    {},
  )
  if (!Array.isArray(response)) {
    throw new TypeError('平台文字识别供应商合同异常：列表不可用')
  }
  response.forEach(assertPlatformProviderContract)
  if (new Set(response.map((item) => item.providerType)).size !== response.length) {
    throw new TypeError('平台文字识别供应商合同异常：供应商类型重复')
  }
  return response
}

/** 保存单一平台供应商并要求服务端返回持久化配置 ID。 */
export async function saveMarkOcrPlatformProvider(
  request: MarkOcrPlatformProviderSaveRequest,
): Promise<string> {
  const providerId = await http.post<string>('/api/mark/ocr/platform-provider/save', request)
  if (!providerId) {
    throw new TypeError('平台文字识别供应商保存回执异常：配置 ID 不可用')
  }
  return providerId
}

export function checkMarkOcrPlatformProviderHealth(
  request: MarkOcrPlatformProviderHealthCheckRequest,
): Promise<void> {
  return http.post<void>('/api/mark/ocr/platform-provider/health-check', request)
}
