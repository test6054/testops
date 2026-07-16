/** 纠错影响重算状态 - PortfolioCorrectionImpactRecomputeStatusEnum */
export enum PortfolioCorrectionImpactRecomputeStatusCode {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  DONE = 'DONE',
  FAILED = 'FAILED',
}

export const ALL_PORTFOLIO_CORRECTION_IMPACT_RECOMPUTE_STATUS_CODES: readonly PortfolioCorrectionImpactRecomputeStatusCode[]
  = [
    PortfolioCorrectionImpactRecomputeStatusCode.PENDING,
    PortfolioCorrectionImpactRecomputeStatusCode.RUNNING,
    PortfolioCorrectionImpactRecomputeStatusCode.DONE,
    PortfolioCorrectionImpactRecomputeStatusCode.FAILED,
  ]

export const PortfolioCorrectionImpactRecomputeStatusDescription: Record<
  PortfolioCorrectionImpactRecomputeStatusCode,
  string
> = {
  [PortfolioCorrectionImpactRecomputeStatusCode.PENDING]: '待重算',
  [PortfolioCorrectionImpactRecomputeStatusCode.RUNNING]: '重算中',
  [PortfolioCorrectionImpactRecomputeStatusCode.DONE]: '已完成',
  [PortfolioCorrectionImpactRecomputeStatusCode.FAILED]: '失败',
}
