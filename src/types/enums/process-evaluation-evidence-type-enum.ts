/** 过程性评价证据类型 - ProcessEvaluationEvidenceTypeEnum */
export enum ProcessEvaluationEvidenceTypeCode {
  SCORE = 'SCORE',
  FILE = 'FILE',
  ATTENDANCE = 'ATTENDANCE',
  TEXT = 'TEXT',
  EXTERNAL_PULL = 'EXTERNAL_PULL',
}

export const ALL_PROCESS_EVALUATION_EVIDENCE_TYPE_CODES: readonly ProcessEvaluationEvidenceTypeCode[] = [
  ProcessEvaluationEvidenceTypeCode.SCORE,
  ProcessEvaluationEvidenceTypeCode.FILE,
  ProcessEvaluationEvidenceTypeCode.ATTENDANCE,
  ProcessEvaluationEvidenceTypeCode.TEXT,
  ProcessEvaluationEvidenceTypeCode.EXTERNAL_PULL,
]

export const ProcessEvaluationEvidenceTypeDescription: Record<ProcessEvaluationEvidenceTypeCode, string> = {
  [ProcessEvaluationEvidenceTypeCode.SCORE]: '成绩分数',
  [ProcessEvaluationEvidenceTypeCode.FILE]: '文件附件',
  [ProcessEvaluationEvidenceTypeCode.ATTENDANCE]: '考勤记录',
  [ProcessEvaluationEvidenceTypeCode.TEXT]: '文本说明',
  [ProcessEvaluationEvidenceTypeCode.EXTERNAL_PULL]: '外部拔取',
}
