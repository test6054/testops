/** 成绩合成策略 */
export enum ExamScorePolicyCode {
  FULL = 'FULL',
  DAILY_PLUS_PAPER = 'DAILY_PLUS_PAPER',
  MAKEUP_CAP60 = 'MAKEUP_CAP60',
  ACTUAL_ONLY = 'ACTUAL_ONLY',
}

export const ALL_EXAM_SCORE_POLICY_CODES: readonly ExamScorePolicyCode[] = [
  ExamScorePolicyCode.FULL,
  ExamScorePolicyCode.DAILY_PLUS_PAPER,
  ExamScorePolicyCode.MAKEUP_CAP60,
  ExamScorePolicyCode.ACTUAL_ONLY,
]

export const ExamScorePolicyDescription: Record<ExamScorePolicyCode, string> = {
  [ExamScorePolicyCode.FULL]: '卷面加日常',
  [ExamScorePolicyCode.DAILY_PLUS_PAPER]: '卷面加日常',
  [ExamScorePolicyCode.MAKEUP_CAP60]: '补考封顶60分',
  [ExamScorePolicyCode.ACTUAL_ONLY]: '仅卷面实际分',
}

