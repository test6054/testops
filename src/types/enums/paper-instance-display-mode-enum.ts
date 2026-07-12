/** 答卷展示模式 */
export enum PaperInstanceDisplayModeCode {
  REAL_NAME = 'REAL_NAME',
  ANONYMOUS = 'ANONYMOUS',
  UNBOUND = 'UNBOUND',
}

export const ALL_PAPER_INSTANCE_DISPLAY_MODE_CODES: readonly PaperInstanceDisplayModeCode[] = [
  PaperInstanceDisplayModeCode.REAL_NAME,
  PaperInstanceDisplayModeCode.ANONYMOUS,
  PaperInstanceDisplayModeCode.UNBOUND,
]

export const PaperInstanceDisplayModeDescription: Record<PaperInstanceDisplayModeCode, string> = {
  [PaperInstanceDisplayModeCode.REAL_NAME]: '实名展示',
  [PaperInstanceDisplayModeCode.ANONYMOUS]: '匿名展示',
  [PaperInstanceDisplayModeCode.UNBOUND]: '未绑定展示',
}
