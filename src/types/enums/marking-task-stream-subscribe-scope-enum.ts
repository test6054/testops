/** 阅卷任务流订阅范围 */
export enum MarkingTaskStreamSubscribeScopeCode {
  TEACHER = 'TEACHER',
  GROUP_LEADER = 'GROUP_LEADER',
}

export const ALL_MARKING_TASK_STREAM_SUBSCRIBE_SCOPE_CODES: readonly MarkingTaskStreamSubscribeScopeCode[] = [
  MarkingTaskStreamSubscribeScopeCode.TEACHER,
  MarkingTaskStreamSubscribeScopeCode.GROUP_LEADER,
]

export const MarkingTaskStreamSubscribeScopeDescription: Record<MarkingTaskStreamSubscribeScopeCode, string> = {
  [MarkingTaskStreamSubscribeScopeCode.TEACHER]: '教师个人任务',
  [MarkingTaskStreamSubscribeScopeCode.GROUP_LEADER]: '题组组长考试进度',
}
