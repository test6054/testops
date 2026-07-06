/** AiExecutionStatus */
export enum AiExecutionStatusCode {
  SUCCESS = 'SUCCESS',
  BLOCKED = 'BLOCKED',
  FAILED = 'FAILED',
}

export const ALL_AI_EXECUTION_STATUS_CODES: readonly AiExecutionStatusCode[] = [
  AiExecutionStatusCode.SUCCESS,
  AiExecutionStatusCode.BLOCKED,
  AiExecutionStatusCode.FAILED,
]

export const AiExecutionStatusDescription: Record<AiExecutionStatusCode, string> = {
  [AiExecutionStatusCode.SUCCESS]: '成功',
  [AiExecutionStatusCode.BLOCKED]: '阻断',
  [AiExecutionStatusCode.FAILED]: '失败',
}

