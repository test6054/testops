/** 画像模板状态 - PortfolioPortraitTemplateStatusEnum */
export enum PortfolioPortraitTemplateStatusCode {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export const ALL_PORTFOLIO_PORTRAIT_TEMPLATE_STATUS_CODES: readonly PortfolioPortraitTemplateStatusCode[] = [
  PortfolioPortraitTemplateStatusCode.DRAFT,
  PortfolioPortraitTemplateStatusCode.ACTIVE,
  PortfolioPortraitTemplateStatusCode.INACTIVE,
]

export const PortfolioPortraitTemplateStatusDescription: Record<PortfolioPortraitTemplateStatusCode, string> = {
  [PortfolioPortraitTemplateStatusCode.DRAFT]: '草稿',
  [PortfolioPortraitTemplateStatusCode.ACTIVE]: '启用',
  [PortfolioPortraitTemplateStatusCode.INACTIVE]: '停用',
}
