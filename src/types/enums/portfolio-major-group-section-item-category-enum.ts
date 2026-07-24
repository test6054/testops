/** 专业群分区块条目固定分类 - PortfolioMajorGroupSectionItemCategoryEnum */
export enum PortfolioMajorGroupSectionItemCategoryCode {
  TEACHER = 'TEACHER',
}

export const PortfolioMajorGroupSectionItemCategoryDescription: Record<
  PortfolioMajorGroupSectionItemCategoryCode,
  string
> = {
  [PortfolioMajorGroupSectionItemCategoryCode.TEACHER]: '群内教师',
}
