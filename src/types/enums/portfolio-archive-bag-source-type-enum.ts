/** 教学档案袋汇编来源类型 */
export enum PortfolioArchiveBagSourceTypeCode {
  ARCHIVE = 'ARCHIVE',
  ACHIEVEMENT = 'ACHIEVEMENT',
  MATERIAL = 'MATERIAL',
}

export const ALL_PORTFOLIO_ARCHIVE_BAG_SOURCE_TYPE_CODES: readonly PortfolioArchiveBagSourceTypeCode[] = [
  PortfolioArchiveBagSourceTypeCode.ARCHIVE,
  PortfolioArchiveBagSourceTypeCode.ACHIEVEMENT,
  PortfolioArchiveBagSourceTypeCode.MATERIAL,
]

export const PortfolioArchiveBagSourceTypeDescription: Record<PortfolioArchiveBagSourceTypeCode, string> = {
  [PortfolioArchiveBagSourceTypeCode.ARCHIVE]: '正式档案',
  [PortfolioArchiveBagSourceTypeCode.ACHIEVEMENT]: '成果库',
  [PortfolioArchiveBagSourceTypeCode.MATERIAL]: '材料库',
}
