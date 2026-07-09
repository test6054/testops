/** 扫描批次页登记状态（Kiosk / Web 异常看板共用） */
export enum PageRegisterStateCode {
  NOT_APPLICABLE = 'NOT_APPLICABLE',
  PENDING = 'PENDING',
  BLOCKED_RECOVERABLE = 'BLOCKED_RECOVERABLE',
  BLOCKED_FATAL = 'BLOCKED_FATAL',
  COMPLETED = 'COMPLETED',
}

export const ALL_PAGE_REGISTER_STATE_CODES: readonly PageRegisterStateCode[] = [
  PageRegisterStateCode.NOT_APPLICABLE,
  PageRegisterStateCode.PENDING,
  PageRegisterStateCode.BLOCKED_RECOVERABLE,
  PageRegisterStateCode.BLOCKED_FATAL,
  PageRegisterStateCode.COMPLETED,
]

export const PageRegisterStateDescription: Record<PageRegisterStateCode, string> = {
  [PageRegisterStateCode.NOT_APPLICABLE]: '不适用',
  [PageRegisterStateCode.PENDING]: '登记处理中',
  [PageRegisterStateCode.BLOCKED_RECOVERABLE]: '登记待重试',
  [PageRegisterStateCode.BLOCKED_FATAL]: '登记不可恢复',
  [PageRegisterStateCode.COMPLETED]: '登记已完成',
}
