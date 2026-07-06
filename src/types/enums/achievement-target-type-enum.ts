/** 达成度计算目标类型 - AchievementTargetTypeEnum */
export enum AchievementTargetTypeCode {
  COURSE_GOAL = 'COURSE_GOAL',
  REQUIREMENT_INDICATOR = 'REQUIREMENT_INDICATOR',
  GRADUATION_REQUIREMENT = 'GRADUATION_REQUIREMENT',
  TRAINING_OBJECTIVE = 'TRAINING_OBJECTIVE',
  PROGRAM_SUMMARY = 'PROGRAM_SUMMARY',
  CIVIC_GOAL_AGGREGATE = 'CIVIC_GOAL_AGGREGATE',
  COMPLEX_ENGINEERING_AGGREGATE = 'COMPLEX_ENGINEERING_AGGREGATE',
}

export const ALL_ACHIEVEMENT_TARGET_TYPE_CODES: readonly AchievementTargetTypeCode[] = [
  AchievementTargetTypeCode.COURSE_GOAL,
  AchievementTargetTypeCode.REQUIREMENT_INDICATOR,
  AchievementTargetTypeCode.GRADUATION_REQUIREMENT,
  AchievementTargetTypeCode.TRAINING_OBJECTIVE,
  AchievementTargetTypeCode.PROGRAM_SUMMARY,
  AchievementTargetTypeCode.CIVIC_GOAL_AGGREGATE,
  AchievementTargetTypeCode.COMPLEX_ENGINEERING_AGGREGATE,
]

export const AchievementTargetTypeDescription: Record<AchievementTargetTypeCode, string> = {
  [AchievementTargetTypeCode.COURSE_GOAL]: '课程目标',
  [AchievementTargetTypeCode.REQUIREMENT_INDICATOR]: '毕业要求观测点',
  [AchievementTargetTypeCode.GRADUATION_REQUIREMENT]: '毕业要求',
  [AchievementTargetTypeCode.TRAINING_OBJECTIVE]: '培养目标',
  [AchievementTargetTypeCode.PROGRAM_SUMMARY]: '专业级汇总',
  [AchievementTargetTypeCode.CIVIC_GOAL_AGGREGATE]: '课程思政独立汇总',
  [AchievementTargetTypeCode.COMPLEX_ENGINEERING_AGGREGATE]: '复杂工程问题专项汇总',
}
