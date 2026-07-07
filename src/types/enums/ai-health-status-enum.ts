/** AI 模型健康状态 - edu-common AiHealthStatus */
export enum AiHealthStatusCode {
  UNKNOWN = 'UNKNOWN',
  HEALTHY = 'HEALTHY',
  FAILED = 'FAILED',
}

export const ALL_AI_HEALTH_STATUS_CODES: readonly AiHealthStatusCode[] = [
  AiHealthStatusCode.UNKNOWN,
  AiHealthStatusCode.HEALTHY,
  AiHealthStatusCode.FAILED,
]

export const AiHealthStatusDescription: Record<AiHealthStatusCode, string> = {
  [AiHealthStatusCode.UNKNOWN]: '未知',
  [AiHealthStatusCode.HEALTHY]: '健康',
  [AiHealthStatusCode.FAILED]: '失败',
}
