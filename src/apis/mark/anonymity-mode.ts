/** 阅卷匿名模式 - 与后端 AnonymityMode 枚举完全一致 */
export type AnonymityModeCode = 'ANONYMOUS' | 'NAMED'

/** 阅卷匿名模式文案 - 与后端 AnonymityMode.message 完全一致 */
export const ANONYMITY_MODE_LABEL: Record<AnonymityModeCode, string> = {
  ANONYMOUS: '匿名',
  NAMED: '实名',
}

export const ANONYMITY_MODE_OPTIONS: Array<{
  label: string
  value: AnonymityModeCode
}> = [
  { value: 'ANONYMOUS', label: ANONYMITY_MODE_LABEL.ANONYMOUS },
  { value: 'NAMED', label: ANONYMITY_MODE_LABEL.NAMED },
]
