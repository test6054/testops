/** 政策匹配/AI 分析结论 - 与后端 PortfolioPolicyMatchConclusionEnum 一致 */
export enum PortfolioPolicyMatchConclusionCode {
  MATCHED = 'MATCHED',
  PARTIAL = 'PARTIAL',
  NEED_SUPPLEMENT = 'NEED_SUPPLEMENT',
  NOT_MATCHED = 'NOT_MATCHED',
  INSUFFICIENT_EVIDENCE = 'INSUFFICIENT_EVIDENCE',
}

export const ALL_PORTFOLIO_POLICY_MATCH_CONCLUSION_CODES: readonly PortfolioPolicyMatchConclusionCode[] = [
  PortfolioPolicyMatchConclusionCode.MATCHED,
  PortfolioPolicyMatchConclusionCode.PARTIAL,
  PortfolioPolicyMatchConclusionCode.NEED_SUPPLEMENT,
  PortfolioPolicyMatchConclusionCode.NOT_MATCHED,
  PortfolioPolicyMatchConclusionCode.INSUFFICIENT_EVIDENCE,
]

export const PortfolioPolicyMatchConclusionDescription: Record<
  PortfolioPolicyMatchConclusionCode,
  string
> = {
  [PortfolioPolicyMatchConclusionCode.MATCHED]: '已匹配',
  [PortfolioPolicyMatchConclusionCode.PARTIAL]: '部分匹配',
  [PortfolioPolicyMatchConclusionCode.NEED_SUPPLEMENT]: '需补证',
  [PortfolioPolicyMatchConclusionCode.NOT_MATCHED]: '不匹配',
  [PortfolioPolicyMatchConclusionCode.INSUFFICIENT_EVIDENCE]: '证据不足',
}

export const PORTFOLIO_POLICY_MATCH_CONCLUSION_LABEL = PortfolioPolicyMatchConclusionDescription
