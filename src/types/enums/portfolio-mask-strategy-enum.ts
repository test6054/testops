/** 脱敏策略 - PortfolioMaskStrategyEnum */
export enum PortfolioMaskStrategyCode {
  FULL = 'FULL',
  LAST_FOUR = 'LAST_FOUR',
  HIDDEN = 'HIDDEN',
  SUMMARY = 'SUMMARY',
}

export const ALL_PORTFOLIO_MASK_STRATEGY_CODES: readonly PortfolioMaskStrategyCode[] = [
  PortfolioMaskStrategyCode.FULL,
  PortfolioMaskStrategyCode.LAST_FOUR,
  PortfolioMaskStrategyCode.HIDDEN,
  PortfolioMaskStrategyCode.SUMMARY,
]

export const PortfolioMaskStrategyDescription: Record<PortfolioMaskStrategyCode, string> = {
  [PortfolioMaskStrategyCode.FULL]: '完整可见',
  [PortfolioMaskStrategyCode.LAST_FOUR]: '保留末四位',
  [PortfolioMaskStrategyCode.HIDDEN]: '不可见',
  [PortfolioMaskStrategyCode.SUMMARY]: '摘要展示',
}
