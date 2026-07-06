/** 政策匹配结论 - PortfolioPolicyMatchConclusionEnum */
export enum PortfolioPolicyMatchConclusionCode {
  MATCHED = 'MATCHED',
  PARTIAL = 'PARTIAL',
  NOT_MATCHED = 'NOT_MATCHED',
  INSUFFICIENT_EVIDENCE = 'INSUFFICIENT_EVIDENCE',
}

export const ALL_PORTFOLIO_POLICY_MATCH_CONCLUSION_CODES: readonly PortfolioPolicyMatchConclusionCode[] = [
  PortfolioPolicyMatchConclusionCode.MATCHED,
  PortfolioPolicyMatchConclusionCode.PARTIAL,
  PortfolioPolicyMatchConclusionCode.NOT_MATCHED,
  PortfolioPolicyMatchConclusionCode.INSUFFICIENT_EVIDENCE,
]

export const PortfolioPolicyMatchConclusionDescription: Record<PortfolioPolicyMatchConclusionCode, string> = {
  [PortfolioPolicyMatchConclusionCode.MATCHED]: '已匹配',
  [PortfolioPolicyMatchConclusionCode.PARTIAL]: '部分匹配',
  [PortfolioPolicyMatchConclusionCode.NOT_MATCHED]: '不匹配',
  [PortfolioPolicyMatchConclusionCode.INSUFFICIENT_EVIDENCE]: '证据不足',
}
