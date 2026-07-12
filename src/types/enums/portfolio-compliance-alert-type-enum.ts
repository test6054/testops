/** 结构合规预警类型 - PortfolioComplianceAlertTypeEnum */
export enum PortfolioComplianceAlertTypeCode {
  DUAL_TEACHER_RATIO = 'DUAL_TEACHER_RATIO',
}

export const PortfolioComplianceAlertTypeDescription: Record<PortfolioComplianceAlertTypeCode, string> = {
  [PortfolioComplianceAlertTypeCode.DUAL_TEACHER_RATIO]: '双师比例',
}
