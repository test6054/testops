/** 教材编写角色 - PortfolioTextbookRoleCodeEnum */
export enum PortfolioTextbookRoleCode {
  CHIEF = 'CHIEF',
  DEPUTY = 'DEPUTY',
  MEMBER = 'MEMBER',
  UNSPECIFIED = 'UNSPECIFIED',
}

export const ALL_PORTFOLIO_TEXTBOOK_ROLE_CODES: readonly PortfolioTextbookRoleCode[] = [
  PortfolioTextbookRoleCode.CHIEF,
  PortfolioTextbookRoleCode.DEPUTY,
  PortfolioTextbookRoleCode.MEMBER,
  PortfolioTextbookRoleCode.UNSPECIFIED,
]

export const PortfolioTextbookRoleDescription: Record<PortfolioTextbookRoleCode, string> = {
  [PortfolioTextbookRoleCode.CHIEF]: '主编/总主编',
  [PortfolioTextbookRoleCode.DEPUTY]: '副主编',
  [PortfolioTextbookRoleCode.MEMBER]: '参编/编委',
  [PortfolioTextbookRoleCode.UNSPECIFIED]: '显式未标注',
}
