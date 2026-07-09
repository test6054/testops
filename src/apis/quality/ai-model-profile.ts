import type { AiHealthStatusCode, AiProviderTypeCode } from './types'
/**
 * AI 模型配置 API - 对齐 AiModelProfileController。
 *
 * 后端路径：/api/quality/ai/model-profiles
 */
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

const BASE = '/api/quality/ai/model-profiles'

/**
 * AI 模型配置 VO - 对齐后端 AiModelProfileVO。
 *
 * 业务规则：平台同一供应商最多一条 enabled=true 记录。
 * abilityCode / defaultProfile 不属于当前后端下行契约。
 */
export interface AiModelProfileVO {
  id: string
  profileName: string
  providerType: AiProviderTypeCode
  modelName: string
  apiHost: string
  /** API Key 普通列表不下行明文；后端仅返回配置状态 */
  apiKeyConfigured: boolean
  /** API Key 掩码；已配置时后端返回 ****，未配置时返回 null */
  apiKeyMasked: string | null
  temperature?: number
  maxTokens?: number
  maxInputChars: number
  connectTimeoutSecs: number
  readTimeoutSecs: number
  enabled?: boolean
  healthStatus?: AiHealthStatusCode
  lastHealthCheckTime?: string
  lastHealthMessage?: string
}

/**
 * AI 模型配置查询请求 - 对齐后端 AiModelProfileQueryRequest。
 * 后端继承 QueryDto，分页字段必传；仅支持 enabledOnly 过滤，不接收 abilityCode / defaultProfile / keyword。
 */
export interface AiModelProfileQueryRequest extends QueryDto {
  /** true 仅返回当前启用的唯一配置 */
  enabledOnly?: boolean
}

/**
 * AI 模型配置保存请求 - 对齐后端 AiModelProfileSaveRequest。
 *
 * 业务规则：提交 enabled=true 后端会按 providerType advisory lock 串行化并将
 * 平台同供应商其他配置置为停用；apiKey 留空表示保留原密钥。
 */
export interface AiModelProfileSaveRequest {
  id?: string
  profileName: string
  providerType: AiProviderTypeCode
  modelName: string
  apiHost: string
  apiKey?: string
  temperature?: number
  maxTokens?: number
  maxInputChars: number
  connectTimeoutSecs: number
  readTimeoutSecs: number
  enabled?: boolean
}

/**
 * 健康检查请求 - 对齐后端 AiModelProfileHealthCheckRequest。
 * 后端仅接收 profileId；不再按租户或能力码参与模型选择。
 */
export interface AiModelProfileHealthCheckRequest {
  profileId: string
}

/** 健康检查响应 - 对齐后端 AiModelProfileHealthCheckVO */
export interface AiModelProfileHealthCheckVO {
  profileId: string
  /** UNKNOWN / HEALTHY / FAILED */
  healthStatus: AiHealthStatusCode
  /** 健康检查诊断消息 */
  healthMessage: string
  /** 模型处理摘要（截断后） */
  responseSummary?: string
}

/** SignalBand 汇总响应 - 对齐后端 AiModelProfileSignalSummaryVO */
export interface AiModelProfileSignalSummaryVO {
  totalCount: number
  enabledCount: number
  healthyCount: number
  failedCount: number
  keyMissingCount: number
}

export const aiModelProfileApi = {
  /** 列表分页查询 */
  page: (data: AiModelProfileQueryRequest) =>
    http.post<PageResult<AiModelProfileVO>>(`${BASE}/page`, data),
  signalSummary: (data: AiModelProfileQueryRequest) =>
    http.post<AiModelProfileSignalSummaryVO>(`${BASE}/signal-summary`, data),
  /** 新建或更新 */
  save: (data: AiModelProfileSaveRequest) => http.post<string>(`${BASE}/save`, data),
  /** 健康检查 */
  healthCheck: (data: AiModelProfileHealthCheckRequest) =>
    http.post<AiModelProfileHealthCheckVO>(`${BASE}/health-check`, data),
}
