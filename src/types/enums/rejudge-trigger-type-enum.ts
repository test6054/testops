/** RejudgeTriggerType */
export enum RejudgeTriggerTypeCode {
  ANSWER_CHANGE = 'ANSWER_CHANGE',
  POLICY_CHANGE = 'POLICY_CHANGE',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
}

export const ALL_REJUDGE_TRIGGER_TYPE_CODES: readonly RejudgeTriggerTypeCode[] = [
  RejudgeTriggerTypeCode.ANSWER_CHANGE,
  RejudgeTriggerTypeCode.POLICY_CHANGE,
  RejudgeTriggerTypeCode.SYSTEM_ERROR,
]

export const RejudgeTriggerTypeDescription: Record<RejudgeTriggerTypeCode, string> = {
  [RejudgeTriggerTypeCode.ANSWER_CHANGE]: '答案变更',
  [RejudgeTriggerTypeCode.POLICY_CHANGE]: '策略变更',
  [RejudgeTriggerTypeCode.SYSTEM_ERROR]: '系统错误',
}

