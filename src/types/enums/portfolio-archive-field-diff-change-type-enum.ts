/** 档案版本字段变更类型 - PortfolioArchiveFieldDiffChangeTypeEnum */
export enum PortfolioArchiveFieldDiffChangeTypeCode {
  ADDED = 'ADDED',
  REMOVED = 'REMOVED',
  CHANGED = 'CHANGED',
  UNCHANGED = 'UNCHANGED',
}

export const PortfolioArchiveFieldDiffChangeTypeDescription: Record<
  PortfolioArchiveFieldDiffChangeTypeCode,
  string
> = {
  [PortfolioArchiveFieldDiffChangeTypeCode.ADDED]: '新增',
  [PortfolioArchiveFieldDiffChangeTypeCode.REMOVED]: '删除',
  [PortfolioArchiveFieldDiffChangeTypeCode.CHANGED]: '变更',
  [PortfolioArchiveFieldDiffChangeTypeCode.UNCHANGED]: '未变',
}

export const PORTFOLIO_ARCHIVE_FIELD_DIFF_CHANGE_TYPE_TONE = {
  [PortfolioArchiveFieldDiffChangeTypeCode.ADDED]: 'green',
  [PortfolioArchiveFieldDiffChangeTypeCode.REMOVED]: 'red',
  [PortfolioArchiveFieldDiffChangeTypeCode.CHANGED]: 'orange',
  [PortfolioArchiveFieldDiffChangeTypeCode.UNCHANGED]: 'gray',
} as const
