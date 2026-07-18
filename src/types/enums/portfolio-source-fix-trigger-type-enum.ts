/** §8.52 源修复触发类型 */
export enum PortfolioSourceFixTriggerTypeCode {
  CORRECTION_CLOSED = 'CORRECTION_CLOSED',
  SOURCE_FIXED = 'SOURCE_FIXED',
  IMPORT_ROLLBACK = 'IMPORT_ROLLBACK',
  AUDIT_CONCLUSION_CHANGED = 'AUDIT_CONCLUSION_CHANGED',
  MANUAL_BATCH = 'MANUAL_BATCH',
}

export const PORTFOLIO_SOURCE_FIX_TRIGGER_TYPE_LABEL: Record<
  PortfolioSourceFixTriggerTypeCode,
  string
> = {
  [PortfolioSourceFixTriggerTypeCode.CORRECTION_CLOSED]: '纠错关闭',
  [PortfolioSourceFixTriggerTypeCode.SOURCE_FIXED]: '源系统修复',
  [PortfolioSourceFixTriggerTypeCode.IMPORT_ROLLBACK]: '导入回滚',
  [PortfolioSourceFixTriggerTypeCode.AUDIT_CONCLUSION_CHANGED]: '审核结论变更',
  [PortfolioSourceFixTriggerTypeCode.MANUAL_BATCH]: '管理端批量',
}
