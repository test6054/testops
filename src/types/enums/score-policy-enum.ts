/** 缺考成绩处理策略 */
export enum ScorePolicyCode {
  SCORE_ZERO = 'SCORE_ZERO',
  EXCLUDE_STAT = 'EXCLUDE_STAT',
  PENDING_MAKEUP = 'PENDING_MAKEUP',
  PENDING_EXTERNAL = 'PENDING_EXTERNAL',
}

export const ALL_SCORE_POLICY_CODES: readonly ScorePolicyCode[] = [
  ScorePolicyCode.SCORE_ZERO,
  ScorePolicyCode.EXCLUDE_STAT,
  ScorePolicyCode.PENDING_MAKEUP,
  ScorePolicyCode.PENDING_EXTERNAL,
]

export const ScorePolicyDescription: Record<ScorePolicyCode, string> = {
  [ScorePolicyCode.SCORE_ZERO]: '计零分',
  [ScorePolicyCode.EXCLUDE_STAT]: '排除统计',
  [ScorePolicyCode.PENDING_MAKEUP]: '待补考',
  [ScorePolicyCode.PENDING_EXTERNAL]: '待外部确认',
}

