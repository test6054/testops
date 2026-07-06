/** 一核心四能力维度 - PortfolioPortraitDimensionEnum */
export enum PortfolioPortraitDimensionCode {
  DEVELOPMENT_CORE = 'DEVELOPMENT_CORE',
  TEACHING = 'TEACHING',
  RESEARCH = 'RESEARCH',
  TRAINING = 'TRAINING',
  PRACTICE = 'PRACTICE',
}

export const ALL_PORTFOLIO_PORTRAIT_DIMENSION_CODES: readonly PortfolioPortraitDimensionCode[] = [
  PortfolioPortraitDimensionCode.DEVELOPMENT_CORE,
  PortfolioPortraitDimensionCode.TEACHING,
  PortfolioPortraitDimensionCode.RESEARCH,
  PortfolioPortraitDimensionCode.TRAINING,
  PortfolioPortraitDimensionCode.PRACTICE,
]

export const PortfolioPortraitDimensionDescription: Record<PortfolioPortraitDimensionCode, string> = {
  [PortfolioPortraitDimensionCode.DEVELOPMENT_CORE]: '职业发展核心',
  [PortfolioPortraitDimensionCode.TEACHING]: '教学能力',
  [PortfolioPortraitDimensionCode.RESEARCH]: '科研教研',
  [PortfolioPortraitDimensionCode.TRAINING]: '培训发展',
  [PortfolioPortraitDimensionCode.PRACTICE]: '企业实践',
}
