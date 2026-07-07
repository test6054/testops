/** MasteryLevel */
export enum MasteryLevelCode {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  MEDIUM = 'MEDIUM',
  WEAK = 'WEAK',
  CRITICAL = 'CRITICAL',
}

export const ALL_MASTERY_LEVEL_CODES: readonly MasteryLevelCode[] = [
  MasteryLevelCode.EXCELLENT,
  MasteryLevelCode.GOOD,
  MasteryLevelCode.MEDIUM,
  MasteryLevelCode.WEAK,
  MasteryLevelCode.CRITICAL,
]

export const MasteryLevelDescription: Record<MasteryLevelCode, string> = {
  [MasteryLevelCode.EXCELLENT]: '优秀',
  [MasteryLevelCode.GOOD]: '良好',
  [MasteryLevelCode.MEDIUM]: '中等',
  [MasteryLevelCode.WEAK]: '薄弱',
  [MasteryLevelCode.CRITICAL]: '严重薄弱',
}

