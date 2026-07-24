/** 行业包硬缺口类型 - PortfolioIndustryPackHardGapTypeEnum */
export enum PortfolioIndustryPackHardGapTypeCode {
  REQUIRED_MATERIAL = 'REQUIRED_MATERIAL',
  REQUIRED_FIELD = 'REQUIRED_FIELD',
}

export const PortfolioIndustryPackHardGapTypeDescription: Record<
  PortfolioIndustryPackHardGapTypeCode,
  string
> = {
  [PortfolioIndustryPackHardGapTypeCode.REQUIRED_MATERIAL]: '必选材料',
  [PortfolioIndustryPackHardGapTypeCode.REQUIRED_FIELD]: '必填字段',
}
