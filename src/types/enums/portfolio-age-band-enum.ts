/** 人事年龄分档 - PortfolioAgeBandEnum */
export enum PortfolioAgeBandCode {
  UNDER_35 = 'UNDER_35',
  AGE_35_44 = 'AGE_35_44',
  AGE_45_54 = 'AGE_45_54',
  AGE_55_PLUS = 'AGE_55_PLUS',
  UNKNOWN = 'UNKNOWN',
}

export const ALL_PORTFOLIO_AGE_BAND_CODES: readonly PortfolioAgeBandCode[] = [
  PortfolioAgeBandCode.UNDER_35,
  PortfolioAgeBandCode.AGE_35_44,
  PortfolioAgeBandCode.AGE_45_54,
  PortfolioAgeBandCode.AGE_55_PLUS,
  PortfolioAgeBandCode.UNKNOWN,
]

export const PortfolioAgeBandDescription: Record<PortfolioAgeBandCode, string> = {
  [PortfolioAgeBandCode.UNDER_35]: '35岁以下',
  [PortfolioAgeBandCode.AGE_35_44]: '35-44岁',
  [PortfolioAgeBandCode.AGE_45_54]: '45-54岁',
  [PortfolioAgeBandCode.AGE_55_PLUS]: '55岁及以上',
  [PortfolioAgeBandCode.UNKNOWN]: '未填报',
}
