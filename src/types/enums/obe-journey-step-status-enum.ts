/** OBE 旅程步骤状态 - ObeJourneyStepStatusEnum */
export enum ObeJourneyStepStatusCode {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
}

export const ALL_OBE_JOURNEY_STEP_STATUS_CODES: readonly ObeJourneyStepStatusCode[] = [
  ObeJourneyStepStatusCode.PENDING,
  ObeJourneyStepStatusCode.ACTIVE,
  ObeJourneyStepStatusCode.COMPLETED,
]

export const ObeJourneyStepStatusDescription: Record<ObeJourneyStepStatusCode, string> = {
  [ObeJourneyStepStatusCode.PENDING]: '待开始',
  [ObeJourneyStepStatusCode.ACTIVE]: '当前阶段',
  [ObeJourneyStepStatusCode.COMPLETED]: '已完成',
}
