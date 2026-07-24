/** 指标解释规则轨道 - PortfolioRuleTrackEnum */
export enum PortfolioRuleTrackCode {
  ELIGIBILITY = 'ELIGIBILITY',
  SCORE = 'SCORE',
}

export const PortfolioRuleTrackDescription: Record<PortfolioRuleTrackCode, string> = {
  [PortfolioRuleTrackCode.ELIGIBILITY]: '资格门槛',
  [PortfolioRuleTrackCode.SCORE]: '计分',
}
