/** 教师质量指标状态 */
export enum ReviewerMetricStatusCode {
  NORMAL = 'NORMAL',
  WARNING = 'WARNING',
  SUSPENDED = 'SUSPENDED',
}

export const ALL_REVIEWER_METRIC_STATUS_CODES: readonly ReviewerMetricStatusCode[] = [
  ReviewerMetricStatusCode.NORMAL,
  ReviewerMetricStatusCode.WARNING,
  ReviewerMetricStatusCode.SUSPENDED,
]

export const ReviewerMetricStatusDescription: Record<ReviewerMetricStatusCode, string> = {
  [ReviewerMetricStatusCode.NORMAL]: '正常',
  [ReviewerMetricStatusCode.WARNING]: '预警',
  [ReviewerMetricStatusCode.SUSPENDED]: '暂停',
}

