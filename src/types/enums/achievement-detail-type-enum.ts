/** 达成度明细类型 - AchievementDetailTypeEnum */
export enum AchievementDetailTypeCode {
  ASSESSMENT_ITEM = 'ASSESSMENT_ITEM',
  INDIRECT_AGGREGATE = 'INDIRECT_AGGREGATE',
  COURSE_GOAL = 'COURSE_GOAL',
  REQUIREMENT_INDICATOR = 'REQUIREMENT_INDICATOR',
  GRADUATION_REQUIREMENT = 'GRADUATION_REQUIREMENT',
}

export const ALL_ACHIEVEMENT_DETAIL_TYPE_CODES: readonly AchievementDetailTypeCode[] = [
  AchievementDetailTypeCode.ASSESSMENT_ITEM,
  AchievementDetailTypeCode.INDIRECT_AGGREGATE,
  AchievementDetailTypeCode.COURSE_GOAL,
  AchievementDetailTypeCode.REQUIREMENT_INDICATOR,
  AchievementDetailTypeCode.GRADUATION_REQUIREMENT,
]

export const AchievementDetailTypeDescription: Record<AchievementDetailTypeCode, string> = {
  [AchievementDetailTypeCode.ASSESSMENT_ITEM]: '考核环节',
  [AchievementDetailTypeCode.INDIRECT_AGGREGATE]: '间接评价聚合',
  [AchievementDetailTypeCode.COURSE_GOAL]: '课程目标',
  [AchievementDetailTypeCode.REQUIREMENT_INDICATOR]: '毕业要求观测点',
  [AchievementDetailTypeCode.GRADUATION_REQUIREMENT]: '毕业要求',
}
