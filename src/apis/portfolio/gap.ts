import type {
  PortfolioGapTaskDetailVO,
  PortfolioGapTaskPageRequest,
  PortfolioGapTaskSubmitRequest,
  PortfolioGapTaskSummaryVO,
  PortfolioGapUrgeRequest,
} from '@/apis/portfolio/types'
import type { PageResult } from '@/types'
import http from '@/config/axios'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'

const BASE = '/api/portfolio/gap'

export const portfolioGapApi = {
  getTask: (gapTaskId: string) =>
    http.post<PortfolioGapTaskDetailVO>(`${BASE}/task/get`, { id: gapTaskId }),
  submitTask: (data: PortfolioGapTaskSubmitRequest) =>
    http.post<PortfolioGapTaskDetailVO>(`${BASE}/task/submit`, data),
  pageTasks: (
    data: PortfolioGapTaskPageRequest = { pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE },
  ) => http.post<PageResult<PortfolioGapTaskSummaryVO>>(`${BASE}/task/page`, data),
  urgeTask: (data: PortfolioGapUrgeRequest) => http.post<void>(`${BASE}/urge`, data),
}
