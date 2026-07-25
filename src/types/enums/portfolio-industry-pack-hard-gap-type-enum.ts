/** 行业包硬性达标缺口类型 - PortfolioIndustryPackHardGapTypeEnum */
export enum PortfolioIndustryPackHardGapTypeCode {
  REQUIRED_MATERIAL = 'REQUIRED_MATERIAL',
  REQUIRED_FIELD = 'REQUIRED_FIELD',
}

export const ALL_PORTFOLIO_INDUSTRY_PACK_HARD_GAP_TYPE_CODES: readonly PortfolioIndustryPackHardGapTypeCode[] = [
  PortfolioIndustryPackHardGapTypeCode.REQUIRED_MATERIAL,
  PortfolioIndustryPackHardGapTypeCode.REQUIRED_FIELD,
]

export const PortfolioIndustryPackHardGapTypeDescription: Record<PortfolioIndustryPackHardGapTypeCode, string> = {
  [PortfolioIndustryPackHardGapTypeCode.REQUIRED_MATERIAL]: '必选材料缺口',
  [PortfolioIndustryPackHardGapTypeCode.REQUIRED_FIELD]: '必填字段缺口',
}
