/** 学历层级 - PortfolioDegreeLevelEnum */
export enum PortfolioDegreeLevelCode {
  ASSOCIATE = 'ASSOCIATE',
  BACHELOR = 'BACHELOR',
  MASTER = 'MASTER',
  DOCTOR = 'DOCTOR',
}

export const ALL_PORTFOLIO_DEGREE_LEVEL_CODES: readonly PortfolioDegreeLevelCode[] = [
  PortfolioDegreeLevelCode.ASSOCIATE,
  PortfolioDegreeLevelCode.BACHELOR,
  PortfolioDegreeLevelCode.MASTER,
  PortfolioDegreeLevelCode.DOCTOR,
]

export const PortfolioDegreeLevelDescription: Record<PortfolioDegreeLevelCode, string> = {
  [PortfolioDegreeLevelCode.ASSOCIATE]: '专科',
  [PortfolioDegreeLevelCode.BACHELOR]: '学士/本科',
  [PortfolioDegreeLevelCode.MASTER]: '硕士',
  [PortfolioDegreeLevelCode.DOCTOR]: '博士',
}
