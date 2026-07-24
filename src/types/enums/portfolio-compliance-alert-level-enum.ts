/** 结构合规预警等级 - PortfolioComplianceAlertLevelEnum */
export enum PortfolioComplianceAlertLevelCode {
  NORMAL = 'NORMAL',
  YELLOW = 'YELLOW',
  RED = 'RED',
}

export const PortfolioComplianceAlertLevelDescription: Record<
  PortfolioComplianceAlertLevelCode,
  string
> = {
  [PortfolioComplianceAlertLevelCode.NORMAL]: '正常',
  [PortfolioComplianceAlertLevelCode.YELLOW]: '重要预警',
  [PortfolioComplianceAlertLevelCode.RED]: '严重预警',
}

export type PortfolioComplianceAlertLevelTone = 'green' | 'yellow' | 'red' | 'gray'

export const PortfolioComplianceAlertLevelToneMap: Record<
  PortfolioComplianceAlertLevelCode,
  PortfolioComplianceAlertLevelTone
> = {
  [PortfolioComplianceAlertLevelCode.NORMAL]: 'green',
  [PortfolioComplianceAlertLevelCode.YELLOW]: 'yellow',
  [PortfolioComplianceAlertLevelCode.RED]: 'red',
}
