/** 驾驶舱问数比较符 - PortfolioCockpitAskOperatorEnum */
export enum PortfolioCockpitAskOperatorCode {
  LT = 'LT',
  LTE = 'LTE',
  GT = 'GT',
  GTE = 'GTE',
  EQ = 'EQ',
}

export const ALL_PORTFOLIO_COCKPIT_ASK_OPERATOR_CODES: readonly PortfolioCockpitAskOperatorCode[] = [
  PortfolioCockpitAskOperatorCode.LT,
  PortfolioCockpitAskOperatorCode.LTE,
  PortfolioCockpitAskOperatorCode.GT,
  PortfolioCockpitAskOperatorCode.GTE,
  PortfolioCockpitAskOperatorCode.EQ,
]

export const PortfolioCockpitAskOperatorDescription: Record<PortfolioCockpitAskOperatorCode, string> = {
  [PortfolioCockpitAskOperatorCode.LT]: '小于',
  [PortfolioCockpitAskOperatorCode.LTE]: '小于等于',
  [PortfolioCockpitAskOperatorCode.GT]: '大于',
  [PortfolioCockpitAskOperatorCode.GTE]: '大于等于',
  [PortfolioCockpitAskOperatorCode.EQ]: '等于',
}
