/** 画像优势标签类型 - PortfolioPortraitStrengthTagTypeEnum */
export enum PortfolioPortraitStrengthTagTypeCode {
  DIMENSION = 'DIMENSION',
  INDICATOR = 'INDICATOR',
}

export const PortfolioPortraitStrengthTagTypeDescription: Record<
  PortfolioPortraitStrengthTagTypeCode,
  string
> = {
  [PortfolioPortraitStrengthTagTypeCode.DIMENSION]: '维度优势',
  [PortfolioPortraitStrengthTagTypeCode.INDICATOR]: '指标优势',
}
