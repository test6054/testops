/** 产教融合项目建设阶段 - PortfolioIndustryEducationProjectStageEnum */
export enum PortfolioIndustryEducationProjectStageCode {
  PLAN = 'PLAN',
  START = 'START',
  RUNNING = 'RUNNING',
  ACCEPT = 'ACCEPT',
}

export const ALL_PORTFOLIO_INDUSTRY_EDUCATION_PROJECT_STAGE_CODES: readonly PortfolioIndustryEducationProjectStageCode[] = [
  PortfolioIndustryEducationProjectStageCode.PLAN,
  PortfolioIndustryEducationProjectStageCode.START,
  PortfolioIndustryEducationProjectStageCode.RUNNING,
  PortfolioIndustryEducationProjectStageCode.ACCEPT,
]

export const PortfolioIndustryEducationProjectStageDescription: Record<
  PortfolioIndustryEducationProjectStageCode,
  string
> = {
  [PortfolioIndustryEducationProjectStageCode.PLAN]: '规划',
  [PortfolioIndustryEducationProjectStageCode.START]: '启动',
  [PortfolioIndustryEducationProjectStageCode.RUNNING]: '建设中',
  [PortfolioIndustryEducationProjectStageCode.ACCEPT]: '验收',
}
