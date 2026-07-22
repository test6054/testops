/** 数据同步清洗动作 - PortfolioIntegrationCleanActionEnum */
export enum PortfolioIntegrationCleanActionCode {
  PASSTHROUGH = 'PASSTHROUGH',
  TRIMMED = 'TRIMMED',
  TRANSFORMED = 'TRANSFORMED',
  COURSE_NORMALIZED = 'COURSE_NORMALIZED',
  DICT_MAPPED = 'DICT_MAPPED',
  EMPTY_SKIPPED = 'EMPTY_SKIPPED',
}

export const ALL_PORTFOLIO_INTEGRATION_CLEAN_ACTION_CODES: readonly PortfolioIntegrationCleanActionCode[] = [
  PortfolioIntegrationCleanActionCode.PASSTHROUGH,
  PortfolioIntegrationCleanActionCode.TRIMMED,
  PortfolioIntegrationCleanActionCode.TRANSFORMED,
  PortfolioIntegrationCleanActionCode.COURSE_NORMALIZED,
  PortfolioIntegrationCleanActionCode.DICT_MAPPED,
  PortfolioIntegrationCleanActionCode.EMPTY_SKIPPED,
]

export const PortfolioIntegrationCleanActionDescription: Record<PortfolioIntegrationCleanActionCode, string> = {
  [PortfolioIntegrationCleanActionCode.PASSTHROUGH]: '透传',
  [PortfolioIntegrationCleanActionCode.TRIMMED]: '去空白',
  [PortfolioIntegrationCleanActionCode.TRANSFORMED]: '已转换',
  [PortfolioIntegrationCleanActionCode.COURSE_NORMALIZED]: '课程归一化',
  [PortfolioIntegrationCleanActionCode.DICT_MAPPED]: '字典对照',
  [PortfolioIntegrationCleanActionCode.EMPTY_SKIPPED]: '空值跳过',
}
