/** 画像优势标签类型 - PortfolioPortraitStrengthTagTypeEnum */
export enum PortfolioPortraitStrengthTagTypeCode {
  DIMENSION = 'DIMENSION',
  INDICATOR = 'INDICATOR',
}

export const ALL_PORTFOLIO_PORTRAIT_STRENGTH_TAG_TYPE_CODES: readonly PortfolioPortraitStrengthTagTypeCode[] = [
  PortfolioPortraitStrengthTagTypeCode.DIMENSION,
  PortfolioPortraitStrengthTagTypeCode.INDICATOR,
]

export const PortfolioPortraitStrengthTagTypeDescription: Record<PortfolioPortraitStrengthTagTypeCode, string> = {
  [PortfolioPortraitStrengthTagTypeCode.DIMENSION]: '维度',
  [PortfolioPortraitStrengthTagTypeCode.INDICATOR]: '指标',
}
