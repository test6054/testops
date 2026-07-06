/** CourseAchievementStatus */
export enum CourseAchievementStatusCode {
  ACHIEVED = 'ACHIEVED',
  PARTIALLY = 'PARTIALLY',
  NOT_ACHIEVED = 'NOT_ACHIEVED',
}

export const ALL_COURSE_ACHIEVEMENT_STATUS_CODES: readonly CourseAchievementStatusCode[] = [
  CourseAchievementStatusCode.ACHIEVED,
  CourseAchievementStatusCode.PARTIALLY,
  CourseAchievementStatusCode.NOT_ACHIEVED,
]

export const CourseAchievementStatusDescription: Record<CourseAchievementStatusCode, string> = {
  [CourseAchievementStatusCode.ACHIEVED]: '已达成',
  [CourseAchievementStatusCode.PARTIALLY]: '部分达成',
  [CourseAchievementStatusCode.NOT_ACHIEVED]: '未达成',
}

