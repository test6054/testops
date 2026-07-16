export enum PortfolioTitleCriteriaChangeActionCode {
  ADDED = 'ADDED',
  DELETED = 'DELETED',
  MODIFIED = 'MODIFIED',
}

export const PortfolioTitleCriteriaChangeActionDescription: Record<
  PortfolioTitleCriteriaChangeActionCode,
  string
> = {
  [PortfolioTitleCriteriaChangeActionCode.ADDED]: '新增',
  [PortfolioTitleCriteriaChangeActionCode.DELETED]: '删除',
  [PortfolioTitleCriteriaChangeActionCode.MODIFIED]: '修改',
}
