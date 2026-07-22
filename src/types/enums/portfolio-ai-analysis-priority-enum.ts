/** AI 分析建议优先级 - PortfolioAiAnalysisPriorityEnum */
export enum PortfolioAiAnalysisPriorityCode {
  URGENT = 'URGENT',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export const ALL_PORTFOLIO_AI_ANALYSIS_PRIORITY_CODES: readonly PortfolioAiAnalysisPriorityCode[] = [
  PortfolioAiAnalysisPriorityCode.URGENT,
  PortfolioAiAnalysisPriorityCode.HIGH,
  PortfolioAiAnalysisPriorityCode.MEDIUM,
  PortfolioAiAnalysisPriorityCode.LOW,
]

export const PortfolioAiAnalysisPriorityDescription: Record<PortfolioAiAnalysisPriorityCode, string> = {
  [PortfolioAiAnalysisPriorityCode.URGENT]: '紧急',
  [PortfolioAiAnalysisPriorityCode.HIGH]: '高',
  [PortfolioAiAnalysisPriorityCode.MEDIUM]: '中',
  [PortfolioAiAnalysisPriorityCode.LOW]: '低',
}
