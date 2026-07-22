/** 培养方案院审状态审计动作 - TrainingPlanStatusActionEnum */
export enum TrainingPlanStatusActionCode {
  SUBMIT = 'SUBMIT',
  CONFIRM = 'CONFIRM',
  RETURN = 'RETURN',
  REVOKE = 'REVOKE',
}

export const ALL_TRAINING_PLAN_STATUS_ACTION_CODES: readonly TrainingPlanStatusActionCode[] = [
  TrainingPlanStatusActionCode.SUBMIT,
  TrainingPlanStatusActionCode.CONFIRM,
  TrainingPlanStatusActionCode.RETURN,
  TrainingPlanStatusActionCode.REVOKE,
]

export const TrainingPlanStatusActionDescription: Record<TrainingPlanStatusActionCode, string> = {
  [TrainingPlanStatusActionCode.SUBMIT]: '提交院审',
  [TrainingPlanStatusActionCode.CONFIRM]: '确认发布',
  [TrainingPlanStatusActionCode.RETURN]: '退回修改',
  [TrainingPlanStatusActionCode.REVOKE]: '撤回发布',
}
