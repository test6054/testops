/** 规划成果关联状态 - PortfolioPlanningAchievementLinkStatusEnum */
export enum PortfolioPlanningAchievementLinkStatusCode {
  DRAFT = 'DRAFT',
  LOCKED = 'LOCKED',
}

export const ALL_PORTFOLIO_PLANNING_ACHIEVEMENT_LINK_STATUS_CODES:
  readonly PortfolioPlanningAchievementLinkStatusCode[] = [
    PortfolioPlanningAchievementLinkStatusCode.DRAFT,
    PortfolioPlanningAchievementLinkStatusCode.LOCKED,
  ]

export const PortfolioPlanningAchievementLinkStatusDescription: Record<
  PortfolioPlanningAchievementLinkStatusCode,
  string
> = {
  [PortfolioPlanningAchievementLinkStatusCode.DRAFT]: '草稿',
  [PortfolioPlanningAchievementLinkStatusCode.LOCKED]: '已锁定',
}

export function isPortfolioPlanningAchievementLinkStatusCode(
  value: unknown,
): value is PortfolioPlanningAchievementLinkStatusCode {
  return typeof value === 'string'
    && ALL_PORTFOLIO_PLANNING_ACHIEVEMENT_LINK_STATUS_CODES.map(String).includes(value)
}
