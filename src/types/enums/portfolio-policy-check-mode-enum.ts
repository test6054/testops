/** 政策核验模式 - 与后端 PortfolioPolicyCheckModeEnum 一致 */
export enum PortfolioPolicyCheckModeCode {
  INFORMAL_FREE_TEXT = 'INFORMAL_FREE_TEXT',
  FORMAL_PUBLISHED_POLICY = 'FORMAL_PUBLISHED_POLICY',
}

export const ALL_PORTFOLIO_POLICY_CHECK_MODE_CODES: readonly PortfolioPolicyCheckModeCode[] = [
  PortfolioPolicyCheckModeCode.INFORMAL_FREE_TEXT,
  PortfolioPolicyCheckModeCode.FORMAL_PUBLISHED_POLICY,
]

export const PortfolioPolicyCheckModeDescription: Record<PortfolioPolicyCheckModeCode, string> = {
  [PortfolioPolicyCheckModeCode.INFORMAL_FREE_TEXT]: '临时自由文本核验',
  [PortfolioPolicyCheckModeCode.FORMAL_PUBLISHED_POLICY]: '正式已发布政策核验',
}
