export enum PortfolioTitleCriteriaGateKindCode {
  HARD = 'HARD',
  PERFORMANCE = 'PERFORMANCE',
}

export const PortfolioTitleCriteriaGateKindDescription: Record<
  PortfolioTitleCriteriaGateKindCode,
  string
> = {
  [PortfolioTitleCriteriaGateKindCode.HARD]: '硬门槛',
  [PortfolioTitleCriteriaGateKindCode.PERFORMANCE]: '业绩条件',
}
