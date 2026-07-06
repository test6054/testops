/** AI 人工干预状态 - AiManualHandlingStatusEnum */
export enum AiManualHandlingStatusCode {
  NONE = 'NONE',
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  IGNORED = 'IGNORED',
  RESET_TO_PENDING = 'RESET_TO_PENDING',
}

export const ALL_AI_MANUAL_HANDLING_STATUS_CODES: readonly AiManualHandlingStatusCode[] = [
  AiManualHandlingStatusCode.NONE,
  AiManualHandlingStatusCode.PENDING,
  AiManualHandlingStatusCode.IN_PROGRESS,
  AiManualHandlingStatusCode.RESOLVED,
  AiManualHandlingStatusCode.IGNORED,
  AiManualHandlingStatusCode.RESET_TO_PENDING,
]

export const AiManualHandlingStatusDescription: Record<AiManualHandlingStatusCode, string> = {
  [AiManualHandlingStatusCode.NONE]: '无需干预',
  [AiManualHandlingStatusCode.PENDING]: '待处置',
  [AiManualHandlingStatusCode.IN_PROGRESS]: '处置中',
  [AiManualHandlingStatusCode.RESOLVED]: '已解决',
  [AiManualHandlingStatusCode.IGNORED]: '已忽略',
  [AiManualHandlingStatusCode.RESET_TO_PENDING]: '已重置为待处理',
}
