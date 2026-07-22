/** 教师讲授课程来源 - 与 edu-common TeacherTaughtCourseSourceTypeEnum 逐值对齐 */
export enum TeacherTaughtCourseSourceTypeCode {
  SYNC = 'SYNC',
  MANUAL = 'MANUAL',
}

export const ALL_TEACHER_TAUGHT_COURSE_SOURCE_TYPE_CODES: readonly TeacherTaughtCourseSourceTypeCode[] = [
  TeacherTaughtCourseSourceTypeCode.SYNC,
  TeacherTaughtCourseSourceTypeCode.MANUAL,
]

export const TeacherTaughtCourseSourceTypeDescription: Record<TeacherTaughtCourseSourceTypeCode, string> = {
  [TeacherTaughtCourseSourceTypeCode.SYNC]: '教务同步',
  [TeacherTaughtCourseSourceTypeCode.MANUAL]: '手工补充',
}
