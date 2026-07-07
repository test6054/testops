/** 课程目标支撑等级 - SupportLevelEnum */
export enum SupportLevelCode {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export const ALL_SUPPORT_LEVEL_CODES: readonly SupportLevelCode[] = [
  SupportLevelCode.HIGH,
  SupportLevelCode.MEDIUM,
  SupportLevelCode.LOW,
]

export const SupportLevelDescription: Record<SupportLevelCode, string> = {
  [SupportLevelCode.HIGH]: '强支撑 H',
  [SupportLevelCode.MEDIUM]: '中支撑 M',
  [SupportLevelCode.LOW]: '弱支撑 L',
}
