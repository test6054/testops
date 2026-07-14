/** 结构合规指标状态 - PortfolioComplianceMetricStatusEnum */
export enum PortfolioComplianceMetricStatusCode {
  COMPUTED = 'COMPUTED',
  THRESHOLD_MISSING = 'THRESHOLD_MISSING',
  DENOMINATOR_MISSING = 'DENOMINATOR_MISSING',
}

export const PortfolioComplianceMetricStatusDescription: Record<
  PortfolioComplianceMetricStatusCode,
  string
> = {
  [PortfolioComplianceMetricStatusCode.COMPUTED]: '已计算',
  [PortfolioComplianceMetricStatusCode.THRESHOLD_MISSING]: '阈值未配置',
  [PortfolioComplianceMetricStatusCode.DENOMINATOR_MISSING]: '分母未配置',
}
