/** 纠错管理动作 - PortfolioCorrectionHandleActionEnum */
export enum PortfolioCorrectionHandleActionCode {
  ACCEPT = 'ACCEPT',
  REJECT = 'REJECT',
  MARK_ARCHIVE_CORRECTING = 'MARK_ARCHIVE_CORRECTING',
  MARK_SOURCE_FIXING = 'MARK_SOURCE_FIXING',
  CLOSE = 'CLOSE',
}

export const ALL_PORTFOLIO_CORRECTION_HANDLE_ACTION_CODES: readonly PortfolioCorrectionHandleActionCode[] = [
  PortfolioCorrectionHandleActionCode.ACCEPT,
  PortfolioCorrectionHandleActionCode.REJECT,
  PortfolioCorrectionHandleActionCode.MARK_ARCHIVE_CORRECTING,
  PortfolioCorrectionHandleActionCode.MARK_SOURCE_FIXING,
  PortfolioCorrectionHandleActionCode.CLOSE,
]
