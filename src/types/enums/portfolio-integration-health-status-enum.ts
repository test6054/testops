/** 集成渠道健康状态 - 与后端 PortfolioIntegrationHealthStatusEnum 逐值对齐 */
export enum PortfolioIntegrationHealthStatusEnum {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  OUTAGE = 'OUTAGE',
}

export const ALL_PORTFOLIO_INTEGRATION_HEALTH_STATUS_ENUMS: readonly PortfolioIntegrationHealthStatusEnum[] = [
  PortfolioIntegrationHealthStatusEnum.HEALTHY,
  PortfolioIntegrationHealthStatusEnum.DEGRADED,
  PortfolioIntegrationHealthStatusEnum.OUTAGE,
]

export const PortfolioIntegrationHealthStatusDescription: Record<
  PortfolioIntegrationHealthStatusEnum,
  string
> = {
  [PortfolioIntegrationHealthStatusEnum.HEALTHY]: '健康',
  [PortfolioIntegrationHealthStatusEnum.DEGRADED]: '降级',
  [PortfolioIntegrationHealthStatusEnum.OUTAGE]: '中断',
}
