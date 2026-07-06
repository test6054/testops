/** 教师阅卷概览旅程阶段键 */
export enum MarkTeacherDashboardJourneyKeyCode {
  PREP = 'prep',
  SCAN = 'scan',
  ASSIGN = 'assign',
  MARK = 'mark',
  PUBLISH = 'publish',
  ARCHIVE = 'archive',
}

export const ALL_MARK_TEACHER_DASHBOARD_JOURNEY_KEY_CODES: readonly MarkTeacherDashboardJourneyKeyCode[] = [
  MarkTeacherDashboardJourneyKeyCode.PREP,
  MarkTeacherDashboardJourneyKeyCode.SCAN,
  MarkTeacherDashboardJourneyKeyCode.ASSIGN,
  MarkTeacherDashboardJourneyKeyCode.MARK,
  MarkTeacherDashboardJourneyKeyCode.PUBLISH,
  MarkTeacherDashboardJourneyKeyCode.ARCHIVE,
]
