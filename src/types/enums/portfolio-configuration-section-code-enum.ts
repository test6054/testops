/** 档案袋配置中心分区 - 与后端 PortfolioConfigurationSectionCodeEnum 逐值对齐 */
export enum PortfolioConfigurationSectionCodeEnum {
  ORG_AND_DATA = 'ORG_AND_DATA',
  ARCHIVE_AND_RULES = 'ARCHIVE_AND_RULES',
  INDICATOR_AND_PUBLISH = 'INDICATOR_AND_PUBLISH',
  INTEGRATION_LEDGER = 'INTEGRATION_LEDGER',
  SECURITY_AND_AUDIT = 'SECURITY_AND_AUDIT',
}

export const ALL_PORTFOLIO_CONFIGURATION_SECTION_CODE_ENUMS: readonly PortfolioConfigurationSectionCodeEnum[] = [
  PortfolioConfigurationSectionCodeEnum.ORG_AND_DATA,
  PortfolioConfigurationSectionCodeEnum.ARCHIVE_AND_RULES,
  PortfolioConfigurationSectionCodeEnum.INDICATOR_AND_PUBLISH,
  PortfolioConfigurationSectionCodeEnum.INTEGRATION_LEDGER,
  PortfolioConfigurationSectionCodeEnum.SECURITY_AND_AUDIT,
]

export const PortfolioConfigurationSectionCodeDescription: Record<
  PortfolioConfigurationSectionCodeEnum,
  string
> = {
  [PortfolioConfigurationSectionCodeEnum.ORG_AND_DATA]: '组织与数据接入',
  [PortfolioConfigurationSectionCodeEnum.ARCHIVE_AND_RULES]: '档案与评价规则',
  [PortfolioConfigurationSectionCodeEnum.INDICATOR_AND_PUBLISH]: '指标与发布',
  [PortfolioConfigurationSectionCodeEnum.INTEGRATION_LEDGER]: '集成数据台账',
  [PortfolioConfigurationSectionCodeEnum.SECURITY_AND_AUDIT]: '权限与审计',
}
