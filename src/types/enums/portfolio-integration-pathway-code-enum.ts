/** 数据集成通路编码 - 与后端 PortfolioIntegrationPathwayCodeEnum 逐值对齐 */
export enum PortfolioIntegrationPathwayCodeEnum {
  OPENAPI = 'OPENAPI',
  JDBC = 'JDBC',
  EXCEL_IMPORT = 'EXCEL_IMPORT',
  MESSAGE_PUSH = 'MESSAGE_PUSH',
  SOAP = 'SOAP',
}

export const ALL_PORTFOLIO_INTEGRATION_PATHWAY_CODE_ENUMS: readonly PortfolioIntegrationPathwayCodeEnum[] = [
  PortfolioIntegrationPathwayCodeEnum.OPENAPI,
  PortfolioIntegrationPathwayCodeEnum.JDBC,
  PortfolioIntegrationPathwayCodeEnum.EXCEL_IMPORT,
  PortfolioIntegrationPathwayCodeEnum.MESSAGE_PUSH,
  PortfolioIntegrationPathwayCodeEnum.SOAP,
]

export const PortfolioIntegrationPathwayCodeDescription: Record<
  PortfolioIntegrationPathwayCodeEnum,
  string
> = {
  [PortfolioIntegrationPathwayCodeEnum.OPENAPI]: 'OpenAPI/REST',
  [PortfolioIntegrationPathwayCodeEnum.JDBC]: '中间库 JDBC',
  [PortfolioIntegrationPathwayCodeEnum.EXCEL_IMPORT]: 'Excel/CSV 导入',
  [PortfolioIntegrationPathwayCodeEnum.MESSAGE_PUSH]: '消息推送',
  [PortfolioIntegrationPathwayCodeEnum.SOAP]: 'Web Service (SOAP)',
}
