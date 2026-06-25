import type {
  PortfolioAiAnalysisDetailVO,
  PortfolioReviewArchiveRecordDetailVO,
  PortfolioReviewLogVO,
  PortfolioReviewTaskApproveRequest,
  PortfolioReviewTaskBatchApproveRequest,
  PortfolioReviewTaskBatchRejectRequest,
  PortfolioReviewTaskDismissRequest,
  PortfolioReviewTaskEscalateRequest,
  PortfolioReviewTaskPageRequest,
  PortfolioReviewTaskRejectRequest,
  PortfolioReviewTaskSummaryVO,
} from '@/apis/portfolio/types'
import type { PageResult } from '@/types'
import http from '@/config/axios'

const BASE = '/api/portfolio/review'

export const portfolioReviewApi = {
  pageTasks: (data: PortfolioReviewTaskPageRequest) =>
    http.post<PageResult<PortfolioReviewTaskSummaryVO>>(`${BASE}/task/page`, data),
  approve: (data: PortfolioReviewTaskApproveRequest) =>
    http.post<void>(`${BASE}/task/approve`, data),
  reject: (data: PortfolioReviewTaskRejectRequest) =>
    http.post<void>(`${BASE}/task/reject`, data),
  dismiss: (data: PortfolioReviewTaskDismissRequest) =>
    http.post<void>(`${BASE}/task/dismiss`, data),
  batchApprove: (data: PortfolioReviewTaskBatchApproveRequest) =>
    http.post<number>(`${BASE}/task/batch-approve`, data),
  batchReject: (data: PortfolioReviewTaskBatchRejectRequest) =>
    http.post<number>(`${BASE}/task/batch-reject`, data),
  escalate: (data: PortfolioReviewTaskEscalateRequest) =>
    http.post<void>(`${BASE}/task/escalate`, data),
  listLogs: (reviewTaskId: string) =>
    http.post<PortfolioReviewLogVO[]>(`${BASE}/log/list`, { id: reviewTaskId }),
  getArchiveRecord: (archiveRecordId: string) =>
    http.post<PortfolioReviewArchiveRecordDetailVO>(`${BASE}/archive-record/get`, { id: archiveRecordId }),
  getAiPreReview: (reviewTaskId: string) =>
    http.post<PortfolioAiAnalysisDetailVO>(`${BASE}/ai-pre-review/get`, { id: reviewTaskId }),
}
