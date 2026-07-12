import type { MarkOcrHealthStatusCode } from './ocr-types'
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
  healthStatus: MarkOcrHealthStatusCode
  lastHealthCheckTime?: string
  lastHealthMessage?: string
  consecutiveFailures: number
  localAutoDeploy: boolean
}

/** PaddleOCR 实例注册请求 - 对应 PaddleOcrInstanceRegisterRequest */
export interface PaddleOcrInstanceRegisterRequest {
  instanceName: string
  serviceUrl: string
  deviceKind: PaddleOcrDeviceKindCode
  deviceIndex?: number
  localAutoDeploy?: boolean
}

/**
 * 查询全部已注册的 PaddleOCR 服务实例（含健康状态、最近探活、连续失败次数）。
 *
 * 仅当租户当前 OCR 渠道为 PADDLE 时使用：用于在 OCR 设置页内嵌实例列表面板，
 * 供管理员确认后端识别请求实际命中的服务实例。后端按 health_status asc, updated_at desc 排序，
 * 健康实例排在前面。
 */
export function listPaddleOcrInstances(): Promise<PaddleOcrInstanceResponse[]> {
  return http.post<PaddleOcrInstanceResponse[]>('/api/mark/ocr/paddle/instance/list', {})
}

export function pagePaddleOcrInstances(
  request: QueryDto,
): Promise<PageResult<PaddleOcrInstanceResponse>> {
  return http.post<PageResult<PaddleOcrInstanceResponse>>(
    '/api/mark/ocr/paddle/instance/page',
    request,
  )
}

/** 注册 PaddleOCR 服务实例。 */
export function registerPaddleOcrInstance(
  request: PaddleOcrInstanceRegisterRequest,
): Promise<PaddleOcrInstanceResponse> {
  return http.post<PaddleOcrInstanceResponse>('/api/mark/ocr/paddle/instance/register', request)
}
