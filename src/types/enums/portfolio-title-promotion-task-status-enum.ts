/** 职称申报任务状态 - PortfolioTitlePromotionTaskStatusEnum */
export enum PortfolioTitlePromotionTaskStatusCode {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  CLOSED = 'CLOSED',
}

export const ALL_PORTFOLIO_TITLE_PROMOTION_TASK_STATUS_CODES: readonly PortfolioTitlePromotionTaskStatusCode[] = [
  PortfolioTitlePromotionTaskStatusCode.DRAFT,
  PortfolioTitlePromotionTaskStatusCode.PUBLISHED,
  PortfolioTitlePromotionTaskStatusCode.CLOSED,
]

export const PortfolioTitlePromotionTaskStatusDescription: Record<
  PortfolioTitlePromotionTaskStatusCode,
  string
> = {
  [PortfolioTitlePromotionTaskStatusCode.DRAFT]: '草稿',
  [PortfolioTitlePromotionTaskStatusCode.PUBLISHED]: '已发布',
  [PortfolioTitlePromotionTaskStatusCode.CLOSED]: '已关闭',
}
