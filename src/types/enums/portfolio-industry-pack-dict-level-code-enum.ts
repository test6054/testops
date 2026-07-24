/** PortfolioIndustryPackDictLevelCodeEnum */
export enum PortfolioIndustryPackDictLevelCode {
  JUNIOR = 'JUNIOR',
  MIDDLE = 'MIDDLE',
  SENIOR = 'SENIOR',
  SPECIAL = 'SPECIAL',
  TECHNICIAN = 'TECHNICIAN',
}

export const ALL_PortfolioIndustryPackDictLevel_CODES: readonly PortfolioIndustryPackDictLevelCode[] = [
  PortfolioIndustryPackDictLevelCode.JUNIOR,
  PortfolioIndustryPackDictLevelCode.MIDDLE,
  PortfolioIndustryPackDictLevelCode.SENIOR,
  PortfolioIndustryPackDictLevelCode.SPECIAL,
  PortfolioIndustryPackDictLevelCode.TECHNICIAN,
]

export const PortfolioIndustryPackDictLevelCodeDescription: Record<PortfolioIndustryPackDictLevelCode, string> = {
  [PortfolioIndustryPackDictLevelCode.JUNIOR]: '初级',
  [PortfolioIndustryPackDictLevelCode.MIDDLE]: '中级',
  [PortfolioIndustryPackDictLevelCode.SENIOR]: '高级',
  [PortfolioIndustryPackDictLevelCode.SPECIAL]: '特级',
  [PortfolioIndustryPackDictLevelCode.TECHNICIAN]: '技师',
}
