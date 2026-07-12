/** 画像指标下钻依据类型 - PortfolioPortraitIndicatorEvidenceTypeEnum */
export enum PortfolioPortraitIndicatorEvidenceTypeCode {
  OFFICIAL_ARCHIVE = 'OFFICIAL_ARCHIVE',
  HR_MASTER = 'HR_MASTER',
  INDICATOR_SCORE = 'INDICATOR_SCORE',
  INDICATOR_SKIP = 'INDICATOR_SKIP',
}

export const ALL_PORTFOLIO_PORTRAIT_INDICATOR_EVIDENCE_TYPE_CODES: readonly PortfolioPortraitIndicatorEvidenceTypeCode[] = [
  PortfolioPortraitIndicatorEvidenceTypeCode.OFFICIAL_ARCHIVE,
  PortfolioPortraitIndicatorEvidenceTypeCode.HR_MASTER,
  PortfolioPortraitIndicatorEvidenceTypeCode.INDICATOR_SCORE,
  PortfolioPortraitIndicatorEvidenceTypeCode.INDICATOR_SKIP,
]

export const PortfolioPortraitIndicatorEvidenceTypeDescription: Record<PortfolioPortraitIndicatorEvidenceTypeCode, string> = {
  [PortfolioPortraitIndicatorEvidenceTypeCode.OFFICIAL_ARCHIVE]: '正式档案',
  [PortfolioPortraitIndicatorEvidenceTypeCode.HR_MASTER]: '人事主数据',
  [PortfolioPortraitIndicatorEvidenceTypeCode.INDICATOR_SCORE]: '指标计分',
  [PortfolioPortraitIndicatorEvidenceTypeCode.INDICATOR_SKIP]: '指标未采集',
}
