/** 主观题 AI 评分风险码 - SubjectiveAiRiskCodeEnum */
export enum SubjectiveAiRiskCode {
  OCR_NOISE = 'OCR_NOISE',
  OCR_MANUAL_REVIEW = 'OCR_MANUAL_REVIEW',
  OCR_PREPROCESS_ABNORMAL = 'OCR_PREPROCESS_ABNORMAL',
  OCR_REGION_ABNORMAL = 'OCR_REGION_ABNORMAL',
  EMPTY_ANSWER = 'EMPTY_ANSWER',
  RUBRIC_MISSING = 'RUBRIC_MISSING',
  REFERENCE_MISSING = 'REFERENCE_MISSING',
  ANSWER_TOO_SHORT = 'ANSWER_TOO_SHORT',
  OFF_TOPIC = 'OFF_TOPIC',
  AMBIGUOUS_EVIDENCE = 'AMBIGUOUS_EVIDENCE',
  OUT_OF_SCOPE_KNOWLEDGE = 'OUT_OF_SCOPE_KNOWLEDGE',
  QUESTION_CONTEXT_MISSING = 'QUESTION_CONTEXT_MISSING',
}

export const ALL_SUBJECTIVE_AI_RISK_CODES: readonly SubjectiveAiRiskCode[] = [
  SubjectiveAiRiskCode.OCR_NOISE,
  SubjectiveAiRiskCode.OCR_MANUAL_REVIEW,
  SubjectiveAiRiskCode.OCR_PREPROCESS_ABNORMAL,
  SubjectiveAiRiskCode.OCR_REGION_ABNORMAL,
  SubjectiveAiRiskCode.EMPTY_ANSWER,
  SubjectiveAiRiskCode.RUBRIC_MISSING,
  SubjectiveAiRiskCode.REFERENCE_MISSING,
  SubjectiveAiRiskCode.ANSWER_TOO_SHORT,
  SubjectiveAiRiskCode.OFF_TOPIC,
  SubjectiveAiRiskCode.AMBIGUOUS_EVIDENCE,
  SubjectiveAiRiskCode.OUT_OF_SCOPE_KNOWLEDGE,
  SubjectiveAiRiskCode.QUESTION_CONTEXT_MISSING,
]

export const SubjectiveAiRiskCodeDescription: Record<SubjectiveAiRiskCode, string> = {
  [SubjectiveAiRiskCode.OCR_NOISE]: 'OCR 噪声',
  [SubjectiveAiRiskCode.OCR_MANUAL_REVIEW]: 'OCR 需人工复核',
  [SubjectiveAiRiskCode.OCR_PREPROCESS_ABNORMAL]: 'OCR 预处理异常',
  [SubjectiveAiRiskCode.OCR_REGION_ABNORMAL]: 'OCR 区域异常',
  [SubjectiveAiRiskCode.EMPTY_ANSWER]: '空白作答',
  [SubjectiveAiRiskCode.RUBRIC_MISSING]: '评分细则缺失',
  [SubjectiveAiRiskCode.REFERENCE_MISSING]: '参考答案缺失',
  [SubjectiveAiRiskCode.ANSWER_TOO_SHORT]: '作答过短',
  [SubjectiveAiRiskCode.OFF_TOPIC]: '偏题',
  [SubjectiveAiRiskCode.AMBIGUOUS_EVIDENCE]: '证据歧义',
  [SubjectiveAiRiskCode.OUT_OF_SCOPE_KNOWLEDGE]: '超范围知识',
  [SubjectiveAiRiskCode.QUESTION_CONTEXT_MISSING]: '题目上下文缺失',
}
