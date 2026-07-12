/** 合规预警范围 - PortfolioComplianceScopeTypeEnum */
export enum PortfolioComplianceScopeTypeCode {
  SCHOOL = 'SCHOOL',
  DEPARTMENT = 'DEPARTMENT',
}

export const PortfolioComplianceScopeTypeDescription: Record<PortfolioComplianceScopeTypeCode, string> = {
  [PortfolioComplianceScopeTypeCode.SCHOOL]: '全校',
  [PortfolioComplianceScopeTypeCode.DEPARTMENT]: '院系',
}
