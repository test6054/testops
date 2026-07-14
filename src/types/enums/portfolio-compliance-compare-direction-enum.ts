/** 结构合规比较方向 - PortfolioComplianceCompareDirectionEnum */
export enum PortfolioComplianceCompareDirectionCode {
  LOWER_IS_WORSE = 'LOWER_IS_WORSE',
  HIGHER_IS_WORSE = 'HIGHER_IS_WORSE',
}

export const ALL_PORTFOLIO_COMPLIANCE_COMPARE_DIRECTION_CODES: readonly PortfolioComplianceCompareDirectionCode[] = [
  PortfolioComplianceCompareDirectionCode.LOWER_IS_WORSE,
  PortfolioComplianceCompareDirectionCode.HIGHER_IS_WORSE,
]

export const PortfolioComplianceCompareDirectionDescription: Record<
  PortfolioComplianceCompareDirectionCode,
  string
> = {
  [PortfolioComplianceCompareDirectionCode.LOWER_IS_WORSE]: '低于阈值为差',
  [PortfolioComplianceCompareDirectionCode.HIGHER_IS_WORSE]: '高于阈值为差',
}
