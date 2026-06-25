import type {
  PortfolioGapTaskDetailVO,
  PortfolioGapTaskSubmitRequest,
} from '@/apis/portfolio/types'
import http from '@/config/axios'

const BASE = '/api/portfolio/gap'

export const portfolioGapApi = {
  getTask: (gapTaskId: string) =>
    http.post<PortfolioGapTaskDetailVO>(`${BASE}/task/get`, { id: gapTaskId }),
  submitTask: (data: PortfolioGapTaskSubmitRequest) =>
    http.post<PortfolioGapTaskDetailVO>(`${BASE}/task/submit`, data),
}
