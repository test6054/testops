/** §8.52 源修复触发来源模块 - 与后端 PortfolioSourceFixTriggerSourceEnum 一致 */
export enum PortfolioSourceFixTriggerSourceCode {
  PORTFOLIO_CORRECTION = 'PORTFOLIO_CORRECTION',
  PORTFOLIO_INTEGRATION = 'PORTFOLIO_INTEGRATION',
  ARCHIVE_REVIEW = 'ARCHIVE_REVIEW',
  PORTFOLIO_ADMIN = 'PORTFOLIO_ADMIN',
  PORTFOLIO_ADMIN_IT = 'PORTFOLIO_ADMIN_IT',
  HISTORY_PLAN_IMPORT = 'HISTORY_PLAN_IMPORT',
}

export const PORTFOLIO_SOURCE_FIX_TRIGGER_SOURCE_LABEL: Record<
  PortfolioSourceFixTriggerSourceCode,
  string
> = {
  [PortfolioSourceFixTriggerSourceCode.PORTFOLIO_CORRECTION]: '教师纠错',
  [PortfolioSourceFixTriggerSourceCode.PORTFOLIO_INTEGRATION]: '数据集成',
  [PortfolioSourceFixTriggerSourceCode.ARCHIVE_REVIEW]: '档案审核',
  [PortfolioSourceFixTriggerSourceCode.PORTFOLIO_ADMIN]: '管理端',
  [PortfolioSourceFixTriggerSourceCode.PORTFOLIO_ADMIN_IT]: '管理端运维',
  [PortfolioSourceFixTriggerSourceCode.HISTORY_PLAN_IMPORT]: '历史规划导入',
}
