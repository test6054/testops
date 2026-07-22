/** AI 敏感信息校验状态 - AiSensitiveCheckStatusEnum */
export enum AiSensitiveCheckStatusCode {
  CLEAN = 'CLEAN',
  LEAK_DETECTED = 'LEAK_DETECTED',
}

export const ALL_AI_SENSITIVE_CHECK_STATUS_CODES: readonly AiSensitiveCheckStatusCode[] = [
  AiSensitiveCheckStatusCode.CLEAN,
  AiSensitiveCheckStatusCode.LEAK_DETECTED,
]

export const AiSensitiveCheckStatusDescription: Record<AiSensitiveCheckStatusCode, string> = {
  [AiSensitiveCheckStatusCode.CLEAN]: '未发现敏感信息',
  [AiSensitiveCheckStatusCode.LEAK_DETECTED]: '需要人工复核',
}
