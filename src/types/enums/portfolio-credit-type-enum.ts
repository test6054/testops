/** 学分事实类型 - PortfolioCreditTypeEnum */
export enum PortfolioCreditTypeCode {
  RATED_CREDIT = 'RATED_CREDIT',
}

export const ALL_PORTFOLIO_CREDIT_TYPE_CODES: readonly PortfolioCreditTypeCode[] = [
  PortfolioCreditTypeCode.RATED_CREDIT,
]

export const PortfolioCreditTypeDescription: Record<PortfolioCreditTypeCode, string> = {
  [PortfolioCreditTypeCode.RATED_CREDIT]: '额定学分',
}
