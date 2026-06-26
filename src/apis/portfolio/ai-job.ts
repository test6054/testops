import type {
  PortfolioAiAnalysisDetailVO,
  PortfolioAiJobPageRequest,
  PortfolioAiJobSubmitRequest,
  PortfolioAiJobSubmitVO,
  PortfolioAiJobTaskVO,
  PortfolioCandidateConfirmRequest,
  PortfolioCandidateFieldVO,
} from '@/apis/portfolio/types'
import type { PageResult } from '@/types'
import http from '@/config/axios'

const BASE = '/api/portfolio/ai/job'

export const portfolioAiJobApi = {
  submit: (data: PortfolioAiJobSubmitRequest) =>
    http.post<PortfolioAiJobSubmitVO>(`${BASE}/submit`, data),
  get: (id: string) => http.post<PortfolioAiJobTaskVO>(`${BASE}/get`, { id }),
  page: (data: PortfolioAiJobPageRequest) =>
    http.post<PageResult<PortfolioAiJobTaskVO>>(`${BASE}/page`, data),
  listCandidates: (id: string) =>
    http.post<PortfolioCandidateFieldVO[]>(`${BASE}/candidate/list`, { id }),
  confirm: (data: PortfolioCandidateConfirmRequest) =>
    http.post<void>(`${BASE}/confirm`, data),
  getAnalysisByTask: (id: string) =>
    http.post<PortfolioAiAnalysisDetailVO>(`${BASE}/analysis/task/get`, { id }),
}
