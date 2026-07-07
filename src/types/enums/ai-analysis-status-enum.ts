/** AiAnalysisStatus */
export enum AiAnalysisStatusCode {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  BLOCKED = 'BLOCKED',
}

export const ALL_AI_ANALYSIS_STATUS_CODES: readonly AiAnalysisStatusCode[] = [
  AiAnalysisStatusCode.PENDING,
  AiAnalysisStatusCode.SUCCESS,
  AiAnalysisStatusCode.FAILED,
  AiAnalysisStatusCode.BLOCKED,
]

export const AiAnalysisStatusDescription: Record<AiAnalysisStatusCode, string> = {
  [AiAnalysisStatusCode.PENDING]: '待分析',
  [AiAnalysisStatusCode.SUCCESS]: '分析成功',
  [AiAnalysisStatusCode.FAILED]: '分析失败',
  [AiAnalysisStatusCode.BLOCKED]: '分析阻塞',
}
