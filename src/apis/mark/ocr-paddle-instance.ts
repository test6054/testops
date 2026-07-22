import type { AiHealthStatusCode } from './ocr-types'
import type { PageResult, QueryDto } from '@/types'
import type { PaddleOcrDeviceKindCode } from '@/types/enums/paddle-ocr-device-kind-enum'
import http from '@/config/axios'

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

export function pagePaddleOcrInstances(
  request: QueryDto,
): Promise<PageResult<PaddleOcrInstanceResponse>> {
  return http.post<PageResult<PaddleOcrInstanceResponse>>(
    '/api/mark/ocr/paddle/instance/page',
    request,
  )
}
