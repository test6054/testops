/** 职称申报申请状态 - PortfolioTitlePromotionApplicationStatusEnum */
export enum PortfolioTitlePromotionApplicationStatusCode {
  DRAFT = 'DRAFT',
  COLLEGE_PENDING = 'COLLEGE_PENDING',
  COLLEGE_RETURNED = 'COLLEGE_RETURNED',
  HR_PENDING = 'HR_PENDING',
  HR_RETURNED = 'HR_RETURNED',
  ASSISTED_READY = 'ASSISTED_READY',
  EXPERT_PENDING = 'EXPERT_PENDING',
  PUBLICITY = 'PUBLICITY',
  ARCHIVED = 'ARCHIVED',
  REJECTED = 'REJECTED',
}

export const ALL_PORTFOLIO_TITLE_PROMOTION_APPLICATION_STATUS_CODES: readonly PortfolioTitlePromotionApplicationStatusCode[] = [
  PortfolioTitlePromotionApplicationStatusCode.DRAFT,
  PortfolioTitlePromotionApplicationStatusCode.COLLEGE_PENDING,
  PortfolioTitlePromotionApplicationStatusCode.COLLEGE_RETURNED,
  PortfolioTitlePromotionApplicationStatusCode.HR_PENDING,
  PortfolioTitlePromotionApplicationStatusCode.HR_RETURNED,
  PortfolioTitlePromotionApplicationStatusCode.ASSISTED_READY,
  PortfolioTitlePromotionApplicationStatusCode.EXPERT_PENDING,
  PortfolioTitlePromotionApplicationStatusCode.PUBLICITY,
  PortfolioTitlePromotionApplicationStatusCode.ARCHIVED,
  PortfolioTitlePromotionApplicationStatusCode.REJECTED,
]

export const PortfolioTitlePromotionApplicationStatusDescription: Record<
  PortfolioTitlePromotionApplicationStatusCode,
  string
> = {
  [PortfolioTitlePromotionApplicationStatusCode.DRAFT]: '草稿',
  [PortfolioTitlePromotionApplicationStatusCode.COLLEGE_PENDING]: '待院审',
  [PortfolioTitlePromotionApplicationStatusCode.COLLEGE_RETURNED]: '院审退回',
  [PortfolioTitlePromotionApplicationStatusCode.HR_PENDING]: '待人事复审',
  [PortfolioTitlePromotionApplicationStatusCode.HR_RETURNED]: '人事退回',
  [PortfolioTitlePromotionApplicationStatusCode.ASSISTED_READY]: '辅助核验完成',
  [PortfolioTitlePromotionApplicationStatusCode.EXPERT_PENDING]: '待专家评审',
  [PortfolioTitlePromotionApplicationStatusCode.PUBLICITY]: '公示中',
  [PortfolioTitlePromotionApplicationStatusCode.ARCHIVED]: '已归档',
  [PortfolioTitlePromotionApplicationStatusCode.REJECTED]: '已驳回',
}
