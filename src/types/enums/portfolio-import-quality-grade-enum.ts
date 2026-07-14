/** 教学档案袋离线导入质量等级（PRD §8.33） */
export enum PortfolioImportQualityGradeCode {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
}

export const ALL_PORTFOLIO_IMPORT_QUALITY_GRADE_CODES: readonly PortfolioImportQualityGradeCode[] = [
  PortfolioImportQualityGradeCode.A,
  PortfolioImportQualityGradeCode.B,
  PortfolioImportQualityGradeCode.C,
  PortfolioImportQualityGradeCode.D,
]

export const PortfolioImportQualityGradeDescription: Record<PortfolioImportQualityGradeCode, string> = {
  [PortfolioImportQualityGradeCode.A]: 'A级',
  [PortfolioImportQualityGradeCode.B]: 'B级',
  [PortfolioImportQualityGradeCode.C]: 'C级',
  [PortfolioImportQualityGradeCode.D]: 'D级',
}
