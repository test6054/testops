/** 历史规划同步冲突策略 */
export enum PortfolioPlanningSyncConflictStrategyCode {
  SKIP = 'SKIP',
  OVERWRITE_DRAFT = 'OVERWRITE_DRAFT',
  MANUAL_CONFIRM = 'MANUAL_CONFIRM',
}

export const ALL_PORTFOLIO_PLANNING_SYNC_CONFLICT_STRATEGY_CODES: readonly PortfolioPlanningSyncConflictStrategyCode[]
  = [
    PortfolioPlanningSyncConflictStrategyCode.SKIP,
    PortfolioPlanningSyncConflictStrategyCode.OVERWRITE_DRAFT,
    PortfolioPlanningSyncConflictStrategyCode.MANUAL_CONFIRM,
  ]

export const PortfolioPlanningSyncConflictStrategyDescription: Record<
  PortfolioPlanningSyncConflictStrategyCode,
  string
> = {
  [PortfolioPlanningSyncConflictStrategyCode.SKIP]: '跳过',
  [PortfolioPlanningSyncConflictStrategyCode.OVERWRITE_DRAFT]: '覆盖草稿',
  [PortfolioPlanningSyncConflictStrategyCode.MANUAL_CONFIRM]: '人工确认',
}
