/** 考试名册纳入方式 */
export enum ExamRosterScopeModeCode {
  BY_CLASS = 'BY_CLASS',
  BY_STUDENT = 'BY_STUDENT',
}

export const ALL_EXAM_ROSTER_SCOPE_MODE_CODES: readonly ExamRosterScopeModeCode[] = [
  ExamRosterScopeModeCode.BY_CLASS,
  ExamRosterScopeModeCode.BY_STUDENT,
]

export const ExamRosterScopeModeDescription: Record<ExamRosterScopeModeCode, string> = {
  [ExamRosterScopeModeCode.BY_CLASS]: '整班纳入',
  [ExamRosterScopeModeCode.BY_STUDENT]: '按人勾选',
}

