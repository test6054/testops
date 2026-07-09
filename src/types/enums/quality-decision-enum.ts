/** 扫描页质量判定 */
export enum QualityDecisionCode {
  PASS = 'PASS',
  BLOCKED = 'BLOCKED',
}

export const ALL_QUALITY_DECISION_CODES: readonly QualityDecisionCode[] = [
  QualityDecisionCode.PASS,
  QualityDecisionCode.BLOCKED,
]

export const QualityDecisionDescription: Record<QualityDecisionCode, string> = {
  [QualityDecisionCode.PASS]: '质量通过',
  [QualityDecisionCode.BLOCKED]: '质量阻断',
}


