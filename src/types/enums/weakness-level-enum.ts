/** 班级薄弱程度（由得分率/错误率推导，非后端独立字段） */
export enum WeaknessLevelCode {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
}

export const ALL_WEAKNESS_LEVEL_CODES: readonly WeaknessLevelCode[] = [
  WeaknessLevelCode.HIGH,
  WeaknessLevelCode.MEDIUM,
]

export const WeaknessLevelDescription: Record<WeaknessLevelCode, string> = {
  [WeaknessLevelCode.HIGH]: '薄弱',
  [WeaknessLevelCode.MEDIUM]: '一般',
}
