/** 指标快照重算状态 - PortfolioMetricRecomputeStatusEnum */
export enum PortfolioMetricRecomputeStatusCode {
  READY = 'READY',
  RECOMPUTING = 'RECOMPUTING',
  FAILED = 'FAILED',
}

export const ALL_PORTFOLIO_METRIC_RECOMPUTE_STATUS_CODES: readonly PortfolioMetricRecomputeStatusCode[] = [
  PortfolioMetricRecomputeStatusCode.READY,
  PortfolioMetricRecomputeStatusCode.RECOMPUTING,
  PortfolioMetricRecomputeStatusCode.FAILED,
]

export const PortfolioMetricRecomputeStatusDescription: Record<
  PortfolioMetricRecomputeStatusCode,
  string
> = {
  [PortfolioMetricRecomputeStatusCode.READY]: '就绪',
  [PortfolioMetricRecomputeStatusCode.RECOMPUTING]: '重算中',
  [PortfolioMetricRecomputeStatusCode.FAILED]: '失败',
}
