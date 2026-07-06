export enum PortfolioArchiveFieldSourceTypeCode {
  S1 = 'S1',
  S2 = 'S2',
  MANUAL = 'MANUAL',
}

export const ALL_PORTFOLIO_ARCHIVE_FIELD_SOURCE_TYPE_CODES: readonly PortfolioArchiveFieldSourceTypeCode[] = [
  PortfolioArchiveFieldSourceTypeCode.S1,
  PortfolioArchiveFieldSourceTypeCode.S2,
  PortfolioArchiveFieldSourceTypeCode.MANUAL,
]

export const PortfolioArchiveFieldSourceTypeDescription: Record<PortfolioArchiveFieldSourceTypeCode, string> = {
  [PortfolioArchiveFieldSourceTypeCode.S1]: '权威源 S1',
  [PortfolioArchiveFieldSourceTypeCode.S2]: '权威源 S2',
  [PortfolioArchiveFieldSourceTypeCode.MANUAL]: '手工填报',
}
