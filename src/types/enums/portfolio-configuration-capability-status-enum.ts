/** 档案袋配置能力就绪状态 - 与后端 PortfolioConfigurationCapabilityStatusEnum 逐值对齐 */
export enum PortfolioConfigurationCapabilityStatusEnum {
  NOT_CONFIGURED = 'NOT_CONFIGURED',
  READY = 'READY',
  ATTENTION = 'ATTENTION',
  OPERATIONAL = 'OPERATIONAL',
}

export const ALL_PORTFOLIO_CONFIGURATION_CAPABILITY_STATUS_ENUMS: readonly PortfolioConfigurationCapabilityStatusEnum[] = [
  PortfolioConfigurationCapabilityStatusEnum.NOT_CONFIGURED,
  PortfolioConfigurationCapabilityStatusEnum.READY,
  PortfolioConfigurationCapabilityStatusEnum.ATTENTION,
  PortfolioConfigurationCapabilityStatusEnum.OPERATIONAL,
]

export const PortfolioConfigurationCapabilityStatusDescription: Record<
  PortfolioConfigurationCapabilityStatusEnum,
  string
> = {
  [PortfolioConfigurationCapabilityStatusEnum.NOT_CONFIGURED]: '未配置',
  [PortfolioConfigurationCapabilityStatusEnum.READY]: '已就绪',
  [PortfolioConfigurationCapabilityStatusEnum.ATTENTION]: '需关注',
  [PortfolioConfigurationCapabilityStatusEnum.OPERATIONAL]: '可运维',
}
