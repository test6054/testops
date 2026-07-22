/** 发展建议优先级 - PortfolioSuggestionPriorityEnum */
export enum PortfolioSuggestionPriorityCode {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
}

export const ALL_PORTFOLIO_SUGGESTION_PRIORITY_CODES: readonly PortfolioSuggestionPriorityCode[] = [
  PortfolioSuggestionPriorityCode.HIGH,
  PortfolioSuggestionPriorityCode.MEDIUM,
]

export const PortfolioSuggestionPriorityDescription: Record<PortfolioSuggestionPriorityCode, string> = {
  [PortfolioSuggestionPriorityCode.HIGH]: '高',
  [PortfolioSuggestionPriorityCode.MEDIUM]: '中',
}
