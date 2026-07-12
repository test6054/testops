/** 年度报告任务状态 - PortfolioAnnualReportTaskStatusEnum */
export enum PortfolioAnnualReportTaskStatusCode {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export const PortfolioAnnualReportTaskStatusDescription: Record<PortfolioAnnualReportTaskStatusCode, string> = {
  [PortfolioAnnualReportTaskStatusCode.PENDING]: '待生成',
  [PortfolioAnnualReportTaskStatusCode.RUNNING]: '生成中',
  [PortfolioAnnualReportTaskStatusCode.SUCCESS]: '已完成',
  [PortfolioAnnualReportTaskStatusCode.FAILED]: '失败',
}
