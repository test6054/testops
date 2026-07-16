import type {
  PortfolioAiAnalysisDetailVO,
  PortfolioReviewAccessScopeVO,
  PortfolioReviewArchiveRecordDetailVO,
  PortfolioReviewArchiveRecordFieldPageRequest,
  PortfolioReviewLogPageRequest,
  PortfolioReviewLogVO,
  PortfolioReviewRecordFieldVO,
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
  getAccessScope: () => http.post<PortfolioReviewAccessScopeVO>(`${BASE}/access-scope`, {}),
  pageTasks: (data: PortfolioReviewTaskPageRequest) =>
    http.post<PageResult<PortfolioReviewTaskSummaryVO>>(`${BASE}/task/page`, data),
  approve: (data: PortfolioReviewTaskApproveRequest) =>
    http.post<void>(`${BASE}/task/approve`, data),
  reject: (data: PortfolioReviewTaskRejectRequest) => http.post<void>(`${BASE}/task/reject`, data),
  dismiss: (data: PortfolioReviewTaskDismissRequest) =>
    http.post<void>(`${BASE}/task/dismiss`, data),
  batchApprove: (data: PortfolioReviewTaskBatchApproveRequest) =>
    http.post<number>(`${BASE}/task/batch-approve`, data),
  batchReject: (data: PortfolioReviewTaskBatchRejectRequest) =>
    http.post<number>(`${BASE}/task/batch-reject`, data),
  escalate: (data: PortfolioReviewTaskEscalateRequest) =>
    http.post<void>(`${BASE}/task/escalate`, data),
  pageLogs: (data: PortfolioReviewLogPageRequest) =>
    http.post<PageResult<PortfolioReviewLogVO>>(`${BASE}/log/page`, data),
  pageArchiveRecordFields: (data: PortfolioReviewArchiveRecordFieldPageRequest) =>
    http.post<PageResult<PortfolioReviewRecordFieldVO>>(`${BASE}/archive-record/field/page`, data),
  getArchiveRecord: (archiveRecordId: string) =>
    http.post<PortfolioReviewArchiveRecordDetailVO>(`${BASE}/archive-record/get`, {
      id: archiveRecordId,
    }),
  getAiPreReview: (reviewTaskId: string) =>
    http.post<PortfolioAiAnalysisDetailVO>(`${BASE}/ai-pre-review/get`, { id: reviewTaskId }),
}
