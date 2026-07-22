export enum PortfolioTitleEvidenceTypeCode {
  OFFICIAL_RECORD = 'OFFICIAL_RECORD',
  COMMITMENT = 'COMMITMENT',
  INTEGRATION_FACT = 'INTEGRATION_FACT',
  MANUAL_NOTE = 'MANUAL_NOTE',
}

export const PortfolioTitleEvidenceTypeDescription: Record<
  PortfolioTitleEvidenceTypeCode,
  string
> = {
  [PortfolioTitleEvidenceTypeCode.OFFICIAL_RECORD]: '正式档案',
  [PortfolioTitleEvidenceTypeCode.COMMITMENT]: '承诺勾选',
  [PortfolioTitleEvidenceTypeCode.INTEGRATION_FACT]: '集成同步权威事实',
  [PortfolioTitleEvidenceTypeCode.MANUAL_NOTE]: '人工备注',
}
