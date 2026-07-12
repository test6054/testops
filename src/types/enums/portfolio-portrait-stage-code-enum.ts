/** 教师职业发展阶段 - PortfolioPortraitStageCodeEnum */
export enum PortfolioPortraitStageCode {
  STARTER = 'STARTER',
  GROWING = 'GROWING',
  MATURE = 'MATURE',
  EXPERT = 'EXPERT',
}

export const ALL_PORTFOLIO_PORTRAIT_STAGE_CODES: readonly PortfolioPortraitStageCode[] = [
  PortfolioPortraitStageCode.STARTER,
  PortfolioPortraitStageCode.GROWING,
  PortfolioPortraitStageCode.MATURE,
  PortfolioPortraitStageCode.EXPERT,
]

export const PortfolioPortraitStageDescription: Record<PortfolioPortraitStageCode, string> = {
  [PortfolioPortraitStageCode.STARTER]: '起步阶段',
  [PortfolioPortraitStageCode.GROWING]: '成长阶段',
  [PortfolioPortraitStageCode.MATURE]: '成熟阶段',
  [PortfolioPortraitStageCode.EXPERT]: '引领阶段',
}
