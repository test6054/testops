/**
 * 档案袋材料类型 - PortfolioMaterialTypeEnum
 * 取值与展示文案以后端为真源，须逐值同步。
 */
export enum PortfolioMaterialTypeCode {
  CERTIFICATE = 'CERTIFICATE',
  DOCUMENT = 'DOCUMENT',
  COURSEWARE = 'COURSEWARE',
  POLICY = 'POLICY',
  REPORT = 'REPORT',
}

export const ALL_PORTFOLIO_MATERIAL_TYPE_CODES: readonly PortfolioMaterialTypeCode[] = [
  PortfolioMaterialTypeCode.CERTIFICATE,
  PortfolioMaterialTypeCode.DOCUMENT,
  PortfolioMaterialTypeCode.COURSEWARE,
  PortfolioMaterialTypeCode.POLICY,
  PortfolioMaterialTypeCode.REPORT,
]

export const PortfolioMaterialTypeDescription: Record<PortfolioMaterialTypeCode, string> = {
  [PortfolioMaterialTypeCode.CERTIFICATE]: '证书证明',
  [PortfolioMaterialTypeCode.DOCUMENT]: '通用文档',
  [PortfolioMaterialTypeCode.COURSEWARE]: '课件',
  [PortfolioMaterialTypeCode.POLICY]: '政策材料',
  [PortfolioMaterialTypeCode.REPORT]: '报告材料',
}
