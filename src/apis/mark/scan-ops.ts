import http from '@/config/axios'

/** 扫描运营概览 KPI，与后端 ScanOpsOverviewResponse 逐字段对应 */
export interface ScanOpsOverviewResponse {
  failedTicketCount?: number
  failedWorkOrderCount?: number
  pageRegisterBlockedCount?: number
  committingWorkOrderCount?: number
  /** 待处置切卷余页批次数 */
  partialTailPendingCount?: number
  pendingDispatchCount?: number
  processingDispatchCount?: number
  suspendedDispatchCount?: number
}

export interface ExamScanOpsOverviewRequest {
  examId: string
}

/** 加载单场考试扫描运营概览 KPI */
export function loadExamScanOpsOverview(examId: string) {
  return http.post<ScanOpsOverviewResponse>('/api/mark/exams/scan-ops/overview', { examId })
}

/** 加载课程考核归档卷扫描运营概览 KPI */
export function loadArchiveScanOpsOverview() {
  return http.post<ScanOpsOverviewResponse>('/api/mark/archive-volumes/scan-ops/overview', {})
}

/** 加载教学档案袋扫描运营概览 KPI */
export function loadPortfolioScanOpsOverview() {
  return http.post<ScanOpsOverviewResponse>('/api/mark/scanner/portfolio-scan-ops/overview', {})
}
