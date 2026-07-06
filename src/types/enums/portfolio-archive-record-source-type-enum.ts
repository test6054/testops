/** 档案来源 - PortfolioArchiveRecordSourceTypeEnum */
export enum PortfolioArchiveRecordSourceTypeCode {
  AI_EXTRACT = 'AI_EXTRACT',
  MANUAL = 'MANUAL',
  IMPORT = 'IMPORT',
  SYNC = 'SYNC',
}

export const ALL_PORTFOLIO_ARCHIVE_RECORD_SOURCE_TYPE_CODES: readonly PortfolioArchiveRecordSourceTypeCode[] = [
  PortfolioArchiveRecordSourceTypeCode.AI_EXTRACT,
  PortfolioArchiveRecordSourceTypeCode.MANUAL,
  PortfolioArchiveRecordSourceTypeCode.IMPORT,
  PortfolioArchiveRecordSourceTypeCode.SYNC,
]

export const PortfolioArchiveRecordSourceTypeDescription: Record<PortfolioArchiveRecordSourceTypeCode, string> = {
  [PortfolioArchiveRecordSourceTypeCode.AI_EXTRACT]: 'AI 抽取',
  [PortfolioArchiveRecordSourceTypeCode.MANUAL]: '手工填报',
  [PortfolioArchiveRecordSourceTypeCode.IMPORT]: '批量导入',
  [PortfolioArchiveRecordSourceTypeCode.SYNC]: '外部同步',
}
