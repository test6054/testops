export enum PortfolioArchiveFieldTypeCode {
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  DATE = 'DATE',
  ENUM = 'ENUM',
  SEMESTER = 'SEMESTER',
}

export const ALL_PORTFOLIO_ARCHIVE_FIELD_TYPE_CODES: readonly PortfolioArchiveFieldTypeCode[] = [
  PortfolioArchiveFieldTypeCode.TEXT,
  PortfolioArchiveFieldTypeCode.NUMBER,
  PortfolioArchiveFieldTypeCode.DATE,
  PortfolioArchiveFieldTypeCode.ENUM,
  PortfolioArchiveFieldTypeCode.SEMESTER,
]

export const PortfolioArchiveFieldTypeDescription: Record<PortfolioArchiveFieldTypeCode, string> = {
  [PortfolioArchiveFieldTypeCode.TEXT]: '文本',
  [PortfolioArchiveFieldTypeCode.NUMBER]: '数值',
  [PortfolioArchiveFieldTypeCode.DATE]: '日期',
  [PortfolioArchiveFieldTypeCode.ENUM]: '枚举',
  [PortfolioArchiveFieldTypeCode.SEMESTER]: '学期',
}
