export enum PortfolioTitleCriteriaPathCode {
  NORMAL = 'NORMAL',
  EXCEPTION = 'EXCEPTION',
  COMMON = 'COMMON',
}

export const PortfolioTitleCriteriaPathDescription: Record<
  PortfolioTitleCriteriaPathCode,
  string
> = {
  [PortfolioTitleCriteriaPathCode.NORMAL]: '正常路径',
  [PortfolioTitleCriteriaPathCode.EXCEPTION]: '破格路径',
  [PortfolioTitleCriteriaPathCode.COMMON]: '全路径共用',
}
