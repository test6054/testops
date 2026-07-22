/** 教材类型 - PortfolioTextbookTypeEnum */
export enum PortfolioTextbookTypeCode {
  NATIONAL_PLAN = 'NATIONAL_PLAN',
  LOOSE_LEAF = 'LOOSE_LEAF',
  WORK_MANUAL = 'WORK_MANUAL',
  NEW_FORM = 'NEW_FORM',
  SCHOOL_ENTERPRISE = 'SCHOOL_ENTERPRISE',
  SCHOOL_BASED = 'SCHOOL_BASED',
}

export const ALL_PORTFOLIO_TEXTBOOK_TYPE_CODES: readonly PortfolioTextbookTypeCode[] = [
  PortfolioTextbookTypeCode.NATIONAL_PLAN,
  PortfolioTextbookTypeCode.LOOSE_LEAF,
  PortfolioTextbookTypeCode.WORK_MANUAL,
  PortfolioTextbookTypeCode.NEW_FORM,
  PortfolioTextbookTypeCode.SCHOOL_ENTERPRISE,
  PortfolioTextbookTypeCode.SCHOOL_BASED,
]

export const PortfolioTextbookTypeDescription: Record<PortfolioTextbookTypeCode, string> = {
  [PortfolioTextbookTypeCode.NATIONAL_PLAN]: '国家规划教材',
  [PortfolioTextbookTypeCode.LOOSE_LEAF]: '活页式教材',
  [PortfolioTextbookTypeCode.WORK_MANUAL]: '工作手册式教材',
  [PortfolioTextbookTypeCode.NEW_FORM]: '新形态/数字教材',
  [PortfolioTextbookTypeCode.SCHOOL_ENTERPRISE]: '校企双元教材',
  [PortfolioTextbookTypeCode.SCHOOL_BASED]: '校本教材',
}
