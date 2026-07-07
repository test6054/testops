/** 达成度结论 - AchievementStatusEnum */
export enum AchievementStatusCode {
  ACHIEVED = 'ACHIEVED',
  PARTIALLY_ACHIEVED = 'PARTIALLY_ACHIEVED',
  NOT_ACHIEVED = 'NOT_ACHIEVED',
  INSUFFICIENT_EVIDENCE = 'INSUFFICIENT_EVIDENCE',
}

export const ALL_ACHIEVEMENT_STATUS_CODES: readonly AchievementStatusCode[] = [
  AchievementStatusCode.ACHIEVED,
  AchievementStatusCode.PARTIALLY_ACHIEVED,
  AchievementStatusCode.NOT_ACHIEVED,
  AchievementStatusCode.INSUFFICIENT_EVIDENCE,
]

export const AchievementStatusDescription: Record<AchievementStatusCode, string> = {
  [AchievementStatusCode.ACHIEVED]: '已达成',
  [AchievementStatusCode.PARTIALLY_ACHIEVED]: '部分达成',
  [AchievementStatusCode.NOT_ACHIEVED]: '未达成',
  [AchievementStatusCode.INSUFFICIENT_EVIDENCE]: '证据不足',
}
