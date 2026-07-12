/** 画像预警类型 - PortfolioAlertTypeEnum */
export enum PortfolioAlertTypeCode {
  PORTRAIT_GAP = 'PORTRAIT_GAP',
  PORTRAIT_STAGE = 'PORTRAIT_STAGE',
}

export const ALL_PORTFOLIO_ALERT_TYPE_CODES: readonly PortfolioAlertTypeCode[] = [
  PortfolioAlertTypeCode.PORTRAIT_GAP,
  PortfolioAlertTypeCode.PORTRAIT_STAGE,
]

export const PortfolioAlertTypeDescription: Record<PortfolioAlertTypeCode, string> = {
  [PortfolioAlertTypeCode.PORTRAIT_GAP]: '画像短板预警',
  [PortfolioAlertTypeCode.PORTRAIT_STAGE]: '职业阶段预警',
}
