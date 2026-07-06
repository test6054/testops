/** 教学档案袋汇聚维度 - PortfolioArchiveBagSectionTypeEnum */
export enum PortfolioArchiveBagSectionTypeCode {
  BY_CATEGORY = 'BY_CATEGORY',
  BY_SEMESTER = 'BY_SEMESTER',
  BY_COURSE = 'BY_COURSE',
  BY_ACHIEVEMENT = 'BY_ACHIEVEMENT',
}

export const ALL_PORTFOLIO_ARCHIVE_BAG_SECTION_TYPE_CODES: readonly PortfolioArchiveBagSectionTypeCode[] = [
  PortfolioArchiveBagSectionTypeCode.BY_CATEGORY,
  PortfolioArchiveBagSectionTypeCode.BY_SEMESTER,
  PortfolioArchiveBagSectionTypeCode.BY_COURSE,
  PortfolioArchiveBagSectionTypeCode.BY_ACHIEVEMENT,
]

export const PortfolioArchiveBagSectionTypeDescription: Record<PortfolioArchiveBagSectionTypeCode, string> = {
  [PortfolioArchiveBagSectionTypeCode.BY_CATEGORY]: '按分类',
  [PortfolioArchiveBagSectionTypeCode.BY_SEMESTER]: '按学期',
  [PortfolioArchiveBagSectionTypeCode.BY_COURSE]: '按课程',
  [PortfolioArchiveBagSectionTypeCode.BY_ACHIEVEMENT]: '按成果',
}
