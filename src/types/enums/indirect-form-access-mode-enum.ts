/** 间接评价问卷访问模式 - IndirectFormAccessMode */
export enum IndirectFormAccessModeCode {
  PUBLIC_LINK = 'PUBLIC_LINK',
  AUTHENTICATED = 'AUTHENTICATED',
  BOTH = 'BOTH',
}

export const ALL_INDIRECT_FORM_ACCESS_MODE_CODES: readonly IndirectFormAccessModeCode[] = [
  IndirectFormAccessModeCode.PUBLIC_LINK,
  IndirectFormAccessModeCode.AUTHENTICATED,
  IndirectFormAccessModeCode.BOTH,
]

export const IndirectFormAccessModeDescription: Record<IndirectFormAccessModeCode, string> = {
  [IndirectFormAccessModeCode.PUBLIC_LINK]: '公开链接',
  [IndirectFormAccessModeCode.AUTHENTICATED]: '登录用户',
  [IndirectFormAccessModeCode.BOTH]: '公开链接或登录',
}
