/** 冲突单状态 - 与后端 PortfolioConflictTicketStatusEnum 逐值对齐 */
export enum PortfolioConflictTicketStatusEnum {
  OPEN = 'OPEN',
  RESOLVED_USE_EXTERNAL = 'RESOLVED_USE_EXTERNAL',
  RESOLVED_USE_LOCAL = 'RESOLVED_USE_LOCAL',
  IGNORED = 'IGNORED',
}

export const ALL_PORTFOLIO_CONFLICT_TICKET_STATUS_ENUMS: readonly PortfolioConflictTicketStatusEnum[] = [
  PortfolioConflictTicketStatusEnum.OPEN,
  PortfolioConflictTicketStatusEnum.RESOLVED_USE_EXTERNAL,
  PortfolioConflictTicketStatusEnum.RESOLVED_USE_LOCAL,
  PortfolioConflictTicketStatusEnum.IGNORED,
]

export const PortfolioConflictTicketStatusDescription: Record<
  PortfolioConflictTicketStatusEnum,
  string
> = {
  [PortfolioConflictTicketStatusEnum.OPEN]: '待处理',
  [PortfolioConflictTicketStatusEnum.RESOLVED_USE_EXTERNAL]: '采用外部值',
  [PortfolioConflictTicketStatusEnum.RESOLVED_USE_LOCAL]: '保留本地值',
  [PortfolioConflictTicketStatusEnum.IGNORED]: '已忽略',
}
