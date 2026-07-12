/** 政策层级 - PortfolioPolicyLevelEnum */
export enum PortfolioPolicyLevelCode {
  NATIONAL = 'NATIONAL',
  PROVINCE = 'PROVINCE',
  CITY = 'CITY',
  SCHOOL = 'SCHOOL',
}

export const ALL_PORTFOLIO_POLICY_LEVEL_CODES: readonly PortfolioPolicyLevelCode[] = [
  PortfolioPolicyLevelCode.NATIONAL,
  PortfolioPolicyLevelCode.PROVINCE,
  PortfolioPolicyLevelCode.CITY,
  PortfolioPolicyLevelCode.SCHOOL,
]

export const PortfolioPolicyLevelDescription: Record<PortfolioPolicyLevelCode, string> = {
  [PortfolioPolicyLevelCode.NATIONAL]: '国家',
  [PortfolioPolicyLevelCode.PROVINCE]: '省',
  [PortfolioPolicyLevelCode.CITY]: '市',
  [PortfolioPolicyLevelCode.SCHOOL]: '校',
}
