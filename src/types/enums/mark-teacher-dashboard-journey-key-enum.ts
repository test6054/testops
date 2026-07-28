/** 教师阅卷概览旅程阶段键 - 与后端 MarkTeacherDashboardJourneyKeyEnum 逐值对齐 */
export enum MarkTeacherDashboardJourneyKeyCode {
  PREP = 'PREP',
  SCAN = 'SCAN',
  ASSIGN = 'ASSIGN',
  MARK = 'MARK',
  PUBLISH = 'PUBLISH',
  ARCHIVE = 'ARCHIVE',
}

export const ALL_MARK_TEACHER_DASHBOARD_JOURNEY_KEY_CODES: readonly MarkTeacherDashboardJourneyKeyCode[] = [
  MarkTeacherDashboardJourneyKeyCode.PREP,
  MarkTeacherDashboardJourneyKeyCode.SCAN,
  MarkTeacherDashboardJourneyKeyCode.ASSIGN,
  MarkTeacherDashboardJourneyKeyCode.MARK,
  MarkTeacherDashboardJourneyKeyCode.PUBLISH,
  MarkTeacherDashboardJourneyKeyCode.ARCHIVE,
]
