const METRIC_STATUS_LABEL: Record<string, string> = {
  READY: '已就绪',
  RECOMPUTING: '统计更新中',
  FAILED: '重算失败',
}

export function portfolioMetricStatusLabel(status?: string): string {
  if (!status) {
    return ''
  }
  return METRIC_STATUS_LABEL[status] ?? status
}
