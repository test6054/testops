/** 政策全文 diff 变更类型 - PortfolioPolicyTextDiffChangeTypeEnum */
export enum PortfolioPolicyTextDiffChangeTypeCode {
  EQUAL = 'EQUAL',
  DELETE = 'DELETE',
  INSERT = 'INSERT',
}

export const PortfolioPolicyTextDiffChangeTypeDescription: Record<
  PortfolioPolicyTextDiffChangeTypeCode,
  string
> = {
  [PortfolioPolicyTextDiffChangeTypeCode.EQUAL]: '相同',
  [PortfolioPolicyTextDiffChangeTypeCode.DELETE]: '删除',
  [PortfolioPolicyTextDiffChangeTypeCode.INSERT]: '新增',
}

export const PORTFOLIO_POLICY_TEXT_DIFF_CHANGE_TYPE_TONE = {
  [PortfolioPolicyTextDiffChangeTypeCode.EQUAL]: 'gray',
  [PortfolioPolicyTextDiffChangeTypeCode.DELETE]: 'red',
  [PortfolioPolicyTextDiffChangeTypeCode.INSERT]: 'green',
} as const
