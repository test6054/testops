/** 同群体对比展示模式 - PortfolioPortraitCohortDisplayModeEnum */
export enum PortfolioPortraitCohortDisplayModeCode {
  INSUFFICIENT = 'INSUFFICIENT',
  LIMITED = 'LIMITED',
  FULL = 'FULL',
}

export const ALL_PORTFOLIO_PORTRAIT_COHORT_DISPLAY_MODE_CODES: readonly PortfolioPortraitCohortDisplayModeCode[] = [
  PortfolioPortraitCohortDisplayModeCode.INSUFFICIENT,
  PortfolioPortraitCohortDisplayModeCode.LIMITED,
  PortfolioPortraitCohortDisplayModeCode.FULL,
]

export const PortfolioPortraitCohortDisplayModeDescription: Record<PortfolioPortraitCohortDisplayModeCode, string> = {
  [PortfolioPortraitCohortDisplayModeCode.INSUFFICIENT]: '样本不足',
  [PortfolioPortraitCohortDisplayModeCode.LIMITED]: '样本量有限',
  [PortfolioPortraitCohortDisplayModeCode.FULL]: '正常展示',
}
