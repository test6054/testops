/** 人事来校年限分档 - PortfolioTenureBandEnum */
export enum PortfolioTenureBandCode {
  UNDER_3Y = 'UNDER_3Y',
  TENURE_3_5Y = 'TENURE_3_5Y',
  TENURE_5_10Y = 'TENURE_5_10Y',
  TENURE_10_20Y = 'TENURE_10_20Y',
  TENURE_20Y_PLUS = 'TENURE_20Y_PLUS',
  UNKNOWN = 'UNKNOWN',
}

export const ALL_PORTFOLIO_TENURE_BAND_CODES: readonly PortfolioTenureBandCode[] = [
  PortfolioTenureBandCode.UNDER_3Y,
  PortfolioTenureBandCode.TENURE_3_5Y,
  PortfolioTenureBandCode.TENURE_5_10Y,
  PortfolioTenureBandCode.TENURE_10_20Y,
  PortfolioTenureBandCode.TENURE_20Y_PLUS,
  PortfolioTenureBandCode.UNKNOWN,
]

export const PortfolioTenureBandDescription: Record<PortfolioTenureBandCode, string> = {
  [PortfolioTenureBandCode.UNDER_3Y]: '来校不足3年',
  [PortfolioTenureBandCode.TENURE_3_5Y]: '来校3-5年',
  [PortfolioTenureBandCode.TENURE_5_10Y]: '来校5-10年',
  [PortfolioTenureBandCode.TENURE_10_20Y]: '来校10-20年',
  [PortfolioTenureBandCode.TENURE_20Y_PLUS]: '来校20年及以上',
  [PortfolioTenureBandCode.UNKNOWN]: '未填报',
}
