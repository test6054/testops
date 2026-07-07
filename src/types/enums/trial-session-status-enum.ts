/** 试评会话状态 */
export enum TrialSessionStatusCode {
  TRIAL_CREATED = 'TRIAL_CREATED',
  TRIAL_ASSIGNED = 'TRIAL_ASSIGNED',
  TRIAL_SUBMITTED = 'TRIAL_SUBMITTED',
  CALIBRATED = 'CALIBRATED',
  TRIAL_CLOSED = 'TRIAL_CLOSED',
}

export const ALL_TRIAL_SESSION_STATUS_CODES: readonly TrialSessionStatusCode[] = [
  TrialSessionStatusCode.TRIAL_CREATED,
  TrialSessionStatusCode.TRIAL_ASSIGNED,
  TrialSessionStatusCode.TRIAL_SUBMITTED,
  TrialSessionStatusCode.CALIBRATED,
  TrialSessionStatusCode.TRIAL_CLOSED,
]
export const TrialSessionStatusDescription: Record<TrialSessionStatusCode, string> = {
  [TrialSessionStatusCode.TRIAL_CREATED]: '已创建',
  [TrialSessionStatusCode.TRIAL_ASSIGNED]: '已分配样本',
  [TrialSessionStatusCode.TRIAL_SUBMITTED]: '教师已提交',
  [TrialSessionStatusCode.CALIBRATED]: '已校准',
  [TrialSessionStatusCode.TRIAL_CLOSED]: '试评关闭',
}


/** 试评主流程状态链（列表页流程 hint 用） */
export const TRIAL_SESSION_MAIN_FLOW_STATUS_CODES: readonly TrialSessionStatusCode[] = [
  TrialSessionStatusCode.TRIAL_CREATED,
  TrialSessionStatusCode.TRIAL_ASSIGNED,
  TrialSessionStatusCode.TRIAL_SUBMITTED,
  TrialSessionStatusCode.CALIBRATED,
  TrialSessionStatusCode.TRIAL_CLOSED,
]
