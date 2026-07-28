/** 人事退休窗口分档 - PortfolioRetirementWindowEnum */
export enum PortfolioRetirementWindowCode {
  WITHIN_1Y = 'WITHIN_1Y',
  WITHIN_3Y = 'WITHIN_3Y',
  WITHIN_5Y = 'WITHIN_5Y',
  BEYOND_5Y = 'BEYOND_5Y',
  UNKNOWN = 'UNKNOWN',
}

export const ALL_PORTFOLIO_RETIREMENT_WINDOW_CODES: readonly PortfolioRetirementWindowCode[] = [
  PortfolioRetirementWindowCode.WITHIN_1Y,
  PortfolioRetirementWindowCode.WITHIN_3Y,
  PortfolioRetirementWindowCode.WITHIN_5Y,
  PortfolioRetirementWindowCode.BEYOND_5Y,
  PortfolioRetirementWindowCode.UNKNOWN,
]

export const PortfolioRetirementWindowDescription: Record<PortfolioRetirementWindowCode, string> = {
  [PortfolioRetirementWindowCode.WITHIN_1Y]: '一年内退休',
  [PortfolioRetirementWindowCode.WITHIN_3Y]: '1-3年内退休',
  [PortfolioRetirementWindowCode.WITHIN_5Y]: '3-5年内退休',
  [PortfolioRetirementWindowCode.BEYOND_5Y]: '5年后退休',
  [PortfolioRetirementWindowCode.UNKNOWN]: '无法预测',
}
