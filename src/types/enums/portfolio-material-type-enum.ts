/** 档案袋材料类型 - PortfolioMaterialTypeEnum */
export enum PortfolioMaterialTypeCode {
  CERTIFICATE = 'CERTIFICATE',
  DOCUMENT = 'DOCUMENT',
  POLICY = 'POLICY',
  REPORT = 'REPORT',
}

export const ALL_PORTFOLIO_MATERIAL_TYPE_CODES: readonly PortfolioMaterialTypeCode[] = [
  PortfolioMaterialTypeCode.CERTIFICATE,
  PortfolioMaterialTypeCode.DOCUMENT,
  PortfolioMaterialTypeCode.POLICY,
  PortfolioMaterialTypeCode.REPORT,
]

export const PortfolioMaterialTypeDescription: Record<PortfolioMaterialTypeCode, string> = {
  [PortfolioMaterialTypeCode.CERTIFICATE]: '证书证明',
  [PortfolioMaterialTypeCode.DOCUMENT]: '通用文档',
  [PortfolioMaterialTypeCode.POLICY]: '政策材料',
  [PortfolioMaterialTypeCode.REPORT]: '报告材料',
}
