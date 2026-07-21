/** 集成消息收件箱处理状态 - 与后端 PortfolioIntegrationMessageInboxStatusEnum 逐值对齐 */
export enum PortfolioIntegrationMessageInboxStatusEnum {
  PENDING = 'PENDING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
}

export const ALL_PORTFOLIO_INTEGRATION_MESSAGE_INBOX_STATUS_ENUMS: readonly PortfolioIntegrationMessageInboxStatusEnum[] = [
  PortfolioIntegrationMessageInboxStatusEnum.PENDING,
  PortfolioIntegrationMessageInboxStatusEnum.PROCESSED,
  PortfolioIntegrationMessageInboxStatusEnum.FAILED,
]

export const PortfolioIntegrationMessageInboxStatusDescription: Record<
  PortfolioIntegrationMessageInboxStatusEnum,
  string
> = {
  [PortfolioIntegrationMessageInboxStatusEnum.PENDING]: '待处理',
  [PortfolioIntegrationMessageInboxStatusEnum.PROCESSED]: '已处理',
  [PortfolioIntegrationMessageInboxStatusEnum.FAILED]: '处理失败',
}
