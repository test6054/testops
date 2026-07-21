/** 教师身份归属血缘变更类型 - 与后端 PortfolioAffiliationChangeTypeEnum 逐值对齐 */
export enum PortfolioAffiliationChangeTypeCode {
  IDENTITY_OPEN = 'IDENTITY_OPEN',
  STAFF_NO_CHANGE = 'STAFF_NO_CHANGE',
  DEPT_ADJUST = 'DEPT_ADJUST',
  ORG_ADJUST = 'ORG_ADJUST',
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT',
  IDENTITY_CLOSE = 'IDENTITY_CLOSE',
}

export const ALL_PORTFOLIO_AFFILIATION_CHANGE_TYPE_CODES: readonly PortfolioAffiliationChangeTypeCode[] = [
  PortfolioAffiliationChangeTypeCode.IDENTITY_OPEN,
  PortfolioAffiliationChangeTypeCode.STAFF_NO_CHANGE,
  PortfolioAffiliationChangeTypeCode.DEPT_ADJUST,
  PortfolioAffiliationChangeTypeCode.ORG_ADJUST,
  PortfolioAffiliationChangeTypeCode.TRANSFER_IN,
  PortfolioAffiliationChangeTypeCode.TRANSFER_OUT,
  PortfolioAffiliationChangeTypeCode.IDENTITY_CLOSE,
]

export const PortfolioAffiliationChangeTypeDescription: Record<PortfolioAffiliationChangeTypeCode, string> = {
  [PortfolioAffiliationChangeTypeCode.IDENTITY_OPEN]: '身份登记开通',
  [PortfolioAffiliationChangeTypeCode.STAFF_NO_CHANGE]: '工号变更',
  [PortfolioAffiliationChangeTypeCode.DEPT_ADJUST]: '院系调整',
  [PortfolioAffiliationChangeTypeCode.ORG_ADJUST]: '扩展组织调整',
  [PortfolioAffiliationChangeTypeCode.TRANSFER_IN]: '调入',
  [PortfolioAffiliationChangeTypeCode.TRANSFER_OUT]: '调出',
  [PortfolioAffiliationChangeTypeCode.IDENTITY_CLOSE]: '身份关闭',
}
