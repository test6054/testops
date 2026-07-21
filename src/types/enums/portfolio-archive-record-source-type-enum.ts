/** 档案来源 - PortfolioArchiveRecordSourceTypeEnum */
export enum PortfolioArchiveRecordSourceTypeCode {
  AI_EXTRACT = 'AI_EXTRACT',
  AI_ASSISTANT = 'AI_ASSISTANT',
  MANUAL = 'MANUAL',
  IMPORT = 'IMPORT',
  SYNC = 'SYNC',
}

export const ALL_PORTFOLIO_ARCHIVE_RECORD_SOURCE_TYPE_CODES: readonly PortfolioArchiveRecordSourceTypeCode[] = [
  PortfolioArchiveRecordSourceTypeCode.AI_EXTRACT,
  PortfolioArchiveRecordSourceTypeCode.AI_ASSISTANT,
  PortfolioArchiveRecordSourceTypeCode.MANUAL,
  PortfolioArchiveRecordSourceTypeCode.IMPORT,
  PortfolioArchiveRecordSourceTypeCode.SYNC,
]

export const PortfolioArchiveRecordSourceTypeDescription: Record<PortfolioArchiveRecordSourceTypeCode, string> = {
  [PortfolioArchiveRecordSourceTypeCode.AI_EXTRACT]: 'AI 抽取',
  [PortfolioArchiveRecordSourceTypeCode.AI_ASSISTANT]: '智能助手确认',
  [PortfolioArchiveRecordSourceTypeCode.MANUAL]: '手工填报',
  [PortfolioArchiveRecordSourceTypeCode.IMPORT]: '批量导入',
  [PortfolioArchiveRecordSourceTypeCode.SYNC]: '外部同步',
}

export function isPortfolioArchiveRecordSourceType(
  value: string,
): value is PortfolioArchiveRecordSourceTypeCode {
  return (ALL_PORTFOLIO_ARCHIVE_RECORD_SOURCE_TYPE_CODES as readonly string[]).includes(value)
}
