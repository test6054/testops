/** AI 结果问题严重级别 - AiResultIssueSeverityEnum */
export enum AiResultIssueSeverityCode {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  INFO = 'INFO',
}

export const ALL_AI_RESULT_ISSUE_SEVERITY_CODES: readonly AiResultIssueSeverityCode[] = [
  AiResultIssueSeverityCode.HIGH,
  AiResultIssueSeverityCode.MEDIUM,
  AiResultIssueSeverityCode.LOW,
  AiResultIssueSeverityCode.INFO,
]

export const AiResultIssueSeverityDescription: Record<AiResultIssueSeverityCode, string> = {
  [AiResultIssueSeverityCode.HIGH]: '高影响',
  [AiResultIssueSeverityCode.MEDIUM]: '中影响',
  [AiResultIssueSeverityCode.LOW]: '低影响',
  [AiResultIssueSeverityCode.INFO]: '提示',
}

