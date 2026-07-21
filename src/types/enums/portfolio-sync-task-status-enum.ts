/** 数据集成同步任务状态 - 与后端 PortfolioSyncTaskStatusEnum 逐值对齐 */
export enum PortfolioSyncTaskStatusEnum {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  PARTIAL_SUCCESS = 'PARTIAL_SUCCESS',
  FAILED = 'FAILED',
}

export const ALL_PORTFOLIO_SYNC_TASK_STATUS_ENUMS: readonly PortfolioSyncTaskStatusEnum[] = [
  PortfolioSyncTaskStatusEnum.PENDING,
  PortfolioSyncTaskStatusEnum.RUNNING,
  PortfolioSyncTaskStatusEnum.SUCCESS,
  PortfolioSyncTaskStatusEnum.PARTIAL_SUCCESS,
  PortfolioSyncTaskStatusEnum.FAILED,
]

export const PortfolioSyncTaskStatusDescription: Record<PortfolioSyncTaskStatusEnum, string> = {
  [PortfolioSyncTaskStatusEnum.PENDING]: '待执行',
  [PortfolioSyncTaskStatusEnum.RUNNING]: '执行中',
  [PortfolioSyncTaskStatusEnum.SUCCESS]: '成功',
  [PortfolioSyncTaskStatusEnum.PARTIAL_SUCCESS]: '部分成功',
  [PortfolioSyncTaskStatusEnum.FAILED]: '失败',
}
