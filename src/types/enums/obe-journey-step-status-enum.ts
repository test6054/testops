/** OBE 旅程步骤状态 - ObeJourneyStepStatusEnum */
export enum ObeJourneyStepStatusCode {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  /** 培养方案未发布锁定，点击须回到培养方案工作台 */
  LOCKED = 'LOCKED',
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
