/** 模板版本状态 */
export enum PortfolioArchiveTemplateVersionStatusCode {
  DRAFT = 'DRAFT',
  TRIAL = 'TRIAL',
  PUBLISHED = 'PUBLISHED',
  DEPRECATED = 'DEPRECATED',
}

export const ALL_PORTFOLIO_ARCHIVE_TEMPLATE_VERSION_STATUS_CODES: readonly PortfolioArchiveTemplateVersionStatusCode[] = [
  PortfolioArchiveTemplateVersionStatusCode.DRAFT,
  PortfolioArchiveTemplateVersionStatusCode.TRIAL,
  PortfolioArchiveTemplateVersionStatusCode.PUBLISHED,
  PortfolioArchiveTemplateVersionStatusCode.DEPRECATED,
]

export const PortfolioArchiveTemplateVersionStatusDescription: Record<PortfolioArchiveTemplateVersionStatusCode, string> = {
  [PortfolioArchiveTemplateVersionStatusCode.DRAFT]: '草稿',
  [PortfolioArchiveTemplateVersionStatusCode.TRIAL]: '试算中',
  [PortfolioArchiveTemplateVersionStatusCode.PUBLISHED]: '已发布',
  [PortfolioArchiveTemplateVersionStatusCode.DEPRECATED]: '已停用',
}
