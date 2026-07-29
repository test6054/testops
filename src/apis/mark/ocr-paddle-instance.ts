import type { AiHealthStatusCode } from './ocr-types'
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'
import { PaddleOcrDeviceKindCode } from '@/types/enums/paddle-ocr-device-kind-enum'
import { ALL_AI_HEALTH_STATUS_CODES } from './ocr-types'

/**
 * PaddleOCR 服务实例视图 - 对应后端 PaddleOcrInstanceResponse。
 *
 * healthStatus 复用 edu-common 的 AiHealthStatus，与 OCR 主配置健康状态共用枚举
 * （UNKNOWN / HEALTHY / FAILED）。localAutoDeploy 标识该实例是否为
 * Docker Compose 本地随服务一起自动拉起的实例。
 */
export interface PaddleOcrInstanceResponse {
  id: string
  instanceName: string
  serviceUrl: string
  deviceKind: PaddleOcrDeviceKindCode
  deviceIndex?: number
  healthStatus: AiHealthStatusCode
  lastHealthCheckTime?: string
  lastHealthMessage?: string
  consecutiveFailures: number
  localAutoDeploy: boolean
}

/** 分页查询 PaddleOCR 实例并校验设备、健康与分页合同。 */
export async function pagePaddleOcrInstances(
  request: QueryDto,
): Promise<PageResult<PaddleOcrInstanceResponse>> {
  const response = await http.post<PageResult<PaddleOcrInstanceResponse>>(
    '/api/mark/ocr/paddle/instance/page',
    request,
  )
  const ids = Array.isArray(response.list)
    ? new Set(response.list.map((item) => item.id))
    : new Set<string>()
  if (
    !Array.isArray(response.list)
    || !Number.isInteger(response.total)
    || response.total < 0
    || !Number.isInteger(response.pageNum)
    || response.pageNum < 1
    || !Number.isInteger(response.pageSize)
    || response.pageSize < 1
    || !Number.isInteger(response.pages)
    || response.pages < 0
    || response.list.length > response.pageSize
    || response.list.length > response.total
    || ids.size !== response.list.length
  ) {
    throw new TypeError('本地文字识别实例分页合同异常：分页字段或实例集合不可用')
  }
  for (const instance of response.list) {
    if (
      !instance.id
      || !instance.instanceName?.trim()
      || !instance.serviceUrl?.trim()
      || !Object.values(PaddleOcrDeviceKindCode).includes(instance.deviceKind)
      || (instance.deviceKind === PaddleOcrDeviceKindCode.GPU
        && (!Number.isInteger(instance.deviceIndex) || instance.deviceIndex! < 0))
      || (instance.deviceKind === PaddleOcrDeviceKindCode.CPU && instance.deviceIndex != null)
      || !ALL_AI_HEALTH_STATUS_CODES.includes(instance.healthStatus)
      || !Number.isInteger(instance.consecutiveFailures)
      || instance.consecutiveFailures < 0
      || typeof instance.localAutoDeploy !== 'boolean'
    ) {
      throw new TypeError('本地文字识别实例合同异常：身份、设备或健康状态不可用')
    }
  }
  return response
}
