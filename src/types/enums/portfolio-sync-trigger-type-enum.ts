/** 档案袋集成同步触发类型 - PortfolioSyncTriggerTypeEnum */
export enum PortfolioSyncTriggerTypeCode {
  MANUAL = 'MANUAL',
  SCHEDULED = 'SCHEDULED',
  CALLBACK = 'CALLBACK',
  /** 国报待修正重传 */
  RETRANSMIT = 'RETRANSMIT',
}

export const ALL_PORTFOLIO_SYNC_TRIGGER_TYPE_CODES: readonly PortfolioSyncTriggerTypeCode[] = [
  PortfolioSyncTriggerTypeCode.MANUAL,
  PortfolioSyncTriggerTypeCode.SCHEDULED,
  PortfolioSyncTriggerTypeCode.CALLBACK,
  PortfolioSyncTriggerTypeCode.RETRANSMIT,
]

export const PortfolioSyncTriggerTypeDescription: Record<PortfolioSyncTriggerTypeCode, string> = {
  [PortfolioSyncTriggerTypeCode.MANUAL]: '手动触发',
  [PortfolioSyncTriggerTypeCode.SCHEDULED]: '定时任务',
  [PortfolioSyncTriggerTypeCode.CALLBACK]: '回调推送',
  [PortfolioSyncTriggerTypeCode.RETRANSMIT]: '重传',
}
