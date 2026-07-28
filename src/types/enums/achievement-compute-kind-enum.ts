/** AchievementComputeKindEnum */
export enum AchievementComputeKindCode {
  COURSE_GOAL = 'COURSE_GOAL',
  REQUIREMENT = 'REQUIREMENT',
  TRAINING_OBJECTIVE = 'TRAINING_OBJECTIVE',
  PROGRAM = 'PROGRAM',
  CIVIC_GOAL_AGGREGATE = 'CIVIC_GOAL_AGGREGATE',
  COMPLEX_ENGINEERING = 'COMPLEX_ENGINEERING',
}

export const ALL_ACHIEVEMENT_COMPUTE_KIND_CODES: readonly AchievementComputeKindCode[] = [
  AchievementComputeKindCode.COURSE_GOAL,
  AchievementComputeKindCode.REQUIREMENT,
  AchievementComputeKindCode.TRAINING_OBJECTIVE,
  AchievementComputeKindCode.PROGRAM,
  AchievementComputeKindCode.CIVIC_GOAL_AGGREGATE,
  AchievementComputeKindCode.COMPLEX_ENGINEERING,
]

export const AchievementComputeKindDescription: Record<AchievementComputeKindCode, string> = {
  [AchievementComputeKindCode.COURSE_GOAL]: '课程目标达成度',
  [AchievementComputeKindCode.REQUIREMENT]: '毕业要求达成度',
  [AchievementComputeKindCode.TRAINING_OBJECTIVE]: '培养目标达成度',
  [AchievementComputeKindCode.PROGRAM]: '专业培养方案达成度',
  [AchievementComputeKindCode.CIVIC_GOAL_AGGREGATE]: '思政目标聚合达成度',
  [AchievementComputeKindCode.COMPLEX_ENGINEERING]: '复杂工程问题聚合达成度',
}
