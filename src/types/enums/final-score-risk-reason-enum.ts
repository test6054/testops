/** 最终成绩风险原因编码，与后端 FinalScoreRiskReviewServiceImpl 风险常量逐值一致 */
export enum FinalScoreRiskReasonCode {
  ABNORMAL_PAPER = 'ABNORMAL_PAPER',
  UNRECONCILED_ABSENCE = 'UNRECONCILED_ABSENCE',
  MISSING_QUESTION_GRADE = 'MISSING_QUESTION_GRADE',
  UNCONFIRMED_QUESTION_GRADE = 'UNCONFIRMED_QUESTION_GRADE',
  BLOCKING_INCIDENT = 'BLOCKING_INCIDENT',
  PENDING_DUPLICATE_IMAGE = 'PENDING_DUPLICATE_IMAGE',
  SAFE_CONFIRMABLE = 'SAFE_CONFIRMABLE',
}

export const ALL_FINAL_SCORE_RISK_REASON_CODES: readonly FinalScoreRiskReasonCode[] = [
  FinalScoreRiskReasonCode.ABNORMAL_PAPER,
  FinalScoreRiskReasonCode.UNRECONCILED_ABSENCE,
  FinalScoreRiskReasonCode.MISSING_QUESTION_GRADE,
  FinalScoreRiskReasonCode.UNCONFIRMED_QUESTION_GRADE,
  FinalScoreRiskReasonCode.BLOCKING_INCIDENT,
  FinalScoreRiskReasonCode.PENDING_DUPLICATE_IMAGE,
  FinalScoreRiskReasonCode.SAFE_CONFIRMABLE,
]

export const FinalScoreRiskReasonDescription: Record<FinalScoreRiskReasonCode, string> = {
  [FinalScoreRiskReasonCode.ABNORMAL_PAPER]: '存在未绑定或绑定异常试卷',
  [FinalScoreRiskReasonCode.UNRECONCILED_ABSENCE]: '存在未完成缺考核对学生',
  [FinalScoreRiskReasonCode.MISSING_QUESTION_GRADE]: '存在题目批改结果缺失试卷',
  [FinalScoreRiskReasonCode.UNCONFIRMED_QUESTION_GRADE]: '存在未确认题目得分试卷',
  [FinalScoreRiskReasonCode.BLOCKING_INCIDENT]: '存在未解决阻塞事件',
  [FinalScoreRiskReasonCode.PENDING_DUPLICATE_IMAGE]: '存在未处置重复影像',
  [FinalScoreRiskReasonCode.SAFE_CONFIRMABLE]: '存在可批量确认成绩',
}

