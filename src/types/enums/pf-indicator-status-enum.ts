/** 指标与模板状态 - PfIndicatorStatusEnum */
export enum PfIndicatorStatusCode {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export const ALL_PF_INDICATOR_STATUS_CODES: readonly PfIndicatorStatusCode[] = [
  PfIndicatorStatusCode.ACTIVE,
  PfIndicatorStatusCode.INACTIVE,
]

export const PfIndicatorStatusDescription: Record<PfIndicatorStatusCode, string> = {
  [PfIndicatorStatusCode.ACTIVE]: '启用',
  [PfIndicatorStatusCode.INACTIVE]: '停用',
}
