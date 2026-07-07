/** AI 输出校验结果 - AiOutputValidationEnum */
export enum AiOutputValidationCode {
  PASSED = 'PASSED',
  REJECTED = 'REJECTED',
  WARN = 'WARN',
}

export const ALL_AI_OUTPUT_VALIDATION_CODES: readonly AiOutputValidationCode[] = [
  AiOutputValidationCode.PASSED,
  AiOutputValidationCode.REJECTED,
  AiOutputValidationCode.WARN,
]

export const AiOutputValidationDescription: Record<AiOutputValidationCode, string> = {
  [AiOutputValidationCode.PASSED]: '通过',
  [AiOutputValidationCode.REJECTED]: '拒绝',
  [AiOutputValidationCode.WARN]: '警告',
}
