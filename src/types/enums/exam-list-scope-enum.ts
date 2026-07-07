/** 考试工作台列表范围 */
export enum ExamListScopeCode {
  ALL = 'ALL',
  ONGOING = 'ONGOING',
  PRIORITY = 'PRIORITY',
}

export const ALL_EXAM_LIST_SCOPE_CODES: readonly ExamListScopeCode[] = [
  ExamListScopeCode.ALL,
  ExamListScopeCode.ONGOING,
  ExamListScopeCode.PRIORITY,
]

export const ExamListScopeDescription: Record<ExamListScopeCode, string> = {
  [ExamListScopeCode.ALL]: '全部',
  [ExamListScopeCode.ONGOING]: '进行中',
  [ExamListScopeCode.PRIORITY]: '优先推进',
}

