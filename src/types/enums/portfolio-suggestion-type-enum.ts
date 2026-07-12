/** 发展建议类型 - PortfolioSuggestionTypeEnum */
export enum PortfolioSuggestionTypeCode {
  GAP_REMEDIATION = 'GAP_REMEDIATION',
  STAGE_DEVELOPMENT = 'STAGE_DEVELOPMENT',
}

export const PortfolioSuggestionTypeDescription: Record<PortfolioSuggestionTypeCode, string> = {
  [PortfolioSuggestionTypeCode.GAP_REMEDIATION]: '短板补采建议',
  [PortfolioSuggestionTypeCode.STAGE_DEVELOPMENT]: '阶段发展建议',
}
