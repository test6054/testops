/** 结构合规预警类型 - PortfolioComplianceAlertTypeEnum */
export enum PortfolioComplianceAlertTypeCode {
  C001 = 'C001',
  C002 = 'C002',
  C003 = 'C003',
  C004 = 'C004',
  C005 = 'C005',
  C006 = 'C006',
}

export const PortfolioComplianceAlertTypeDescription: Record<PortfolioComplianceAlertTypeCode, string> = {
  [PortfolioComplianceAlertTypeCode.C001]: '双师型教师占比',
  [PortfolioComplianceAlertTypeCode.C002]: '思政课专职教师配备',
  [PortfolioComplianceAlertTypeCode.C003]: '辅导员师生比',
  [PortfolioComplianceAlertTypeCode.C004]: '党员教师占比',
  [PortfolioComplianceAlertTypeCode.C005]: '骨干教师占比',
  [PortfolioComplianceAlertTypeCode.C006]: '外聘教师比例合规',
}

export const ALL_PORTFOLIO_COMPLIANCE_ALERT_TYPE_CODES = Object.values(PortfolioComplianceAlertTypeCode)
