/** 过程性评价校验结果 - ProcessEvaluationValidationResultEnum */
export enum ProcessEvaluationValidationResultCode {
  VALID = 'VALID',
  INVALID = 'INVALID',
}

export const ALL_PROCESS_EVALUATION_VALIDATION_RESULT_CODES: readonly ProcessEvaluationValidationResultCode[] = [
  ProcessEvaluationValidationResultCode.VALID,
  ProcessEvaluationValidationResultCode.INVALID,
]

export const ProcessEvaluationValidationResultDescription: Record<ProcessEvaluationValidationResultCode, string> = {
  [ProcessEvaluationValidationResultCode.VALID]: '通过',
  [ProcessEvaluationValidationResultCode.INVALID]: '不通过',
}
