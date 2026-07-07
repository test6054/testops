/** 画像维度就绪状态 - PortfolioPortraitDimensionReadinessEnum */
export enum PortfolioPortraitDimensionReadinessCode {
  READY = 'READY',
  PENDING = 'PENDING',
}

export const ALL_PORTFOLIO_PORTRAIT_DIMENSION_READINESS_CODES: readonly PortfolioPortraitDimensionReadinessCode[] = [
  PortfolioPortraitDimensionReadinessCode.READY,
  PortfolioPortraitDimensionReadinessCode.PENDING,
]

export const PortfolioPortraitDimensionReadinessDescription: Record<PortfolioPortraitDimensionReadinessCode, string> = {
  [PortfolioPortraitDimensionReadinessCode.READY]: '已就绪',
  [PortfolioPortraitDimensionReadinessCode.PENDING]: '待补充',
}
