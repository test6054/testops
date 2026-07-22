/** OBE 旅程步骤状态 - ObeJourneyStepStatusEnum；wire code 为小写 */
export enum ObeJourneyStepStatusCode {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  /** 培养方案未发布锁定，点击须回到培养方案工作台 */
  LOCKED = 'locked',
}

export const ALL_OBE_JOURNEY_STEP_STATUS_CODES: readonly ObeJourneyStepStatusCode[] = [
  ObeJourneyStepStatusCode.PENDING,
  ObeJourneyStepStatusCode.ACTIVE,
  ObeJourneyStepStatusCode.COMPLETED,
  ObeJourneyStepStatusCode.LOCKED,
]

export const ObeJourneyStepStatusDescription: Record<ObeJourneyStepStatusCode, string> = {
  [ObeJourneyStepStatusCode.PENDING]: '待开始',
  [ObeJourneyStepStatusCode.ACTIVE]: '当前阶段',
  [ObeJourneyStepStatusCode.COMPLETED]: '已完成',
  [ObeJourneyStepStatusCode.LOCKED]: '已锁定',
}
