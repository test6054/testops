/** 专业群档案袋分区块 - PortfolioMajorGroupPortfolioSectionCodeEnum */
export enum PortfolioMajorGroupSectionCode {
  OVERVIEW = 'OVERVIEW',
  ARCHIVE = 'ARCHIVE',
  TASK = 'TASK',
  MATERIAL_INDEX = 'MATERIAL_INDEX',
}

export const ALL_PORTFOLIO_MAJOR_GROUP_SECTION_CODES: readonly PortfolioMajorGroupSectionCode[] = [
  PortfolioMajorGroupSectionCode.OVERVIEW,
  PortfolioMajorGroupSectionCode.ARCHIVE,
  PortfolioMajorGroupSectionCode.TASK,
  PortfolioMajorGroupSectionCode.MATERIAL_INDEX,
]

export const PortfolioMajorGroupSectionDescription: Record<PortfolioMajorGroupSectionCode, string> = {
  [PortfolioMajorGroupSectionCode.OVERVIEW]: '群像总览',
  [PortfolioMajorGroupSectionCode.ARCHIVE]: '分类档案',
  [PortfolioMajorGroupSectionCode.TASK]: '任务台账',
  [PortfolioMajorGroupSectionCode.MATERIAL_INDEX]: '材料索引',
}
