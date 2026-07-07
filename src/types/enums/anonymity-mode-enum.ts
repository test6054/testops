/** 阅卷匿名模式 */
export enum AnonymityModeCode {
  ANONYMOUS = 'ANONYMOUS',
  NAMED = 'NAMED',
}

export const ALL_ANONYMITY_MODE_CODES: readonly AnonymityModeCode[] = [
  AnonymityModeCode.ANONYMOUS,
  AnonymityModeCode.NAMED,
]
export const AnonymityModeDescription: Record<AnonymityModeCode, string> = {
  [AnonymityModeCode.ANONYMOUS]: '匿名',
  [AnonymityModeCode.NAMED]: '实名',
}
