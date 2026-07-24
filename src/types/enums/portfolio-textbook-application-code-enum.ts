/** 教材应用证明 - PortfolioTextbookApplicationCodeEnum */
export enum PortfolioTextbookApplicationCode {
  PROVEN = 'PROVEN',
  PARTIAL = 'PARTIAL',
  MINIMAL = 'MINIMAL',
}

export const ALL_PORTFOLIO_TEXTBOOK_APPLICATION_CODES: readonly PortfolioTextbookApplicationCode[] = [
  PortfolioTextbookApplicationCode.PROVEN,
  PortfolioTextbookApplicationCode.PARTIAL,
  PortfolioTextbookApplicationCode.MINIMAL,
]

export const PortfolioTextbookApplicationDescription: Record<PortfolioTextbookApplicationCode, string> = {
  [PortfolioTextbookApplicationCode.PROVEN]: '已应用/选用证明齐全',
  [PortfolioTextbookApplicationCode.PARTIAL]: '有描述或日期部分应用',
  [PortfolioTextbookApplicationCode.MINIMAL]: '最低应用系数',
}
