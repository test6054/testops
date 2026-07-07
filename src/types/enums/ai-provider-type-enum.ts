/** AI 供应商类型 - edu-common AiProviderType */
export enum AiProviderTypeCode {
  DEEPSEEK = 'DEEPSEEK',
  QWEN = 'QWEN',
}

export const ALL_AI_PROVIDER_TYPE_CODES: readonly AiProviderTypeCode[] = [
  AiProviderTypeCode.DEEPSEEK,
  AiProviderTypeCode.QWEN,
]

export const AiProviderTypeDescription: Record<AiProviderTypeCode, string> = {
  [AiProviderTypeCode.DEEPSEEK]: 'DeepSeek',
  [AiProviderTypeCode.QWEN]: '通义千问',
}

