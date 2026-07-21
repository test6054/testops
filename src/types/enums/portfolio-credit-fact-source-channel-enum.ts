/** §8.66 学分事实装载通道 - PortfolioCreditFactSourceChannelEnum */
export enum PortfolioCreditFactSourceChannelCode {
  ARCHIVE = 'ARCHIVE',
  TRAINING_ACTIVITY = 'TRAINING_ACTIVITY',
}

export const ALL_PORTFOLIO_CREDIT_FACT_SOURCE_CHANNEL_CODES: readonly PortfolioCreditFactSourceChannelCode[] = [
  PortfolioCreditFactSourceChannelCode.ARCHIVE,
  PortfolioCreditFactSourceChannelCode.TRAINING_ACTIVITY,
]

export const PortfolioCreditFactSourceChannelDescription: Record<PortfolioCreditFactSourceChannelCode, string> = {
  [PortfolioCreditFactSourceChannelCode.ARCHIVE]: '正式档案学分',
  [PortfolioCreditFactSourceChannelCode.TRAINING_ACTIVITY]: '培训活动学分',
}
