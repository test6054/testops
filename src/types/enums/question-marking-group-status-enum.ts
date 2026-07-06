/** 题目阅卷小组状态 */
export enum QuestionMarkingGroupStatusCode {
  GROUP_DRAFT = 'GROUP_DRAFT',
  GROUP_CONFIGURED = 'GROUP_CONFIGURED',
  GROUP_ACTIVE = 'GROUP_ACTIVE',
  GROUP_CLOSED = 'GROUP_CLOSED',
}

export const ALL_QUESTION_MARKING_GROUP_STATUS_CODES: readonly QuestionMarkingGroupStatusCode[] = [
  QuestionMarkingGroupStatusCode.GROUP_DRAFT,
  QuestionMarkingGroupStatusCode.GROUP_CONFIGURED,
  QuestionMarkingGroupStatusCode.GROUP_ACTIVE,
  QuestionMarkingGroupStatusCode.GROUP_CLOSED,
]
export const QuestionMarkingGroupStatusDescription: Record<QuestionMarkingGroupStatusCode, string> = {
  [QuestionMarkingGroupStatusCode.GROUP_DRAFT]: '草稿',
  [QuestionMarkingGroupStatusCode.GROUP_CONFIGURED]: '已配置',
  [QuestionMarkingGroupStatusCode.GROUP_ACTIVE]: '启用',
  [QuestionMarkingGroupStatusCode.GROUP_CLOSED]: '已关闭',
}
