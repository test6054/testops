/** 成绩定稿页 z-score 偏差档位（前端派生展示，无后端 enum） */
export enum ScoreBiasLevelCode {
  NORMAL = 'normal',
  MILD_HIGH = 'mild-high',
  MILD_LOW = 'mild-low',
  SEVERE_HIGH = 'severe-high',
  SEVERE_LOW = 'severe-low',
  INSUFFICIENT = 'insufficient',
}

export const ALL_SCORE_BIAS_LEVEL_CODES: readonly ScoreBiasLevelCode[] = [
  ScoreBiasLevelCode.NORMAL,
  ScoreBiasLevelCode.MILD_HIGH,
  ScoreBiasLevelCode.MILD_LOW,
  ScoreBiasLevelCode.SEVERE_HIGH,
  ScoreBiasLevelCode.SEVERE_LOW,
  ScoreBiasLevelCode.INSUFFICIENT,
]

export const ScoreBiasLevelDescription: Record<ScoreBiasLevelCode, string> = {
  [ScoreBiasLevelCode.NORMAL]: '≈ 正常',
  [ScoreBiasLevelCode.MILD_HIGH]: '↑ 偏高',
  [ScoreBiasLevelCode.MILD_LOW]: '↓ 偏低',
  [ScoreBiasLevelCode.SEVERE_HIGH]: '⇈ 显著偏高',
  [ScoreBiasLevelCode.SEVERE_LOW]: '⇊ 显著偏低',
  [ScoreBiasLevelCode.INSUFFICIENT]: '-',
}

