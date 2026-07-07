import type {
  PortfolioAiAnalysisDetailVO,
  PortfolioAiAnalysisPageRequest,
  PortfolioAiAnalysisSummaryVO,
  PortfolioAiJobPageRequest,
  PortfolioAiJobSubmitRequest,
  PortfolioAiJobSubmitVO,
  PortfolioCandidateConfirmRequest,
  PortfolioCandidateFieldVO,
} from '@/apis/portfolio/types'
import type { AiTaskVO } from '@/apis/quality/ai-task'
import type { PageResult } from '@/types'
import http from '@/config/axios'

const BASE = '/api/portfolio/ai/job'

export const portfolioAiJobApi = {
  submit: (data: PortfolioAiJobSubmitRequest) =>
    http.post<PortfolioAiJobSubmitVO>(`${BASE}/submit`, data),
  get: (id: string) => http.post<AiTaskVO>(`${BASE}/get`, { id }),
  page: (data: PortfolioAiJobPageRequest) =>
    http.post<PageResult<AiTaskVO>>(`${BASE}/page`, data),
  listCandidates: (id: string) =>
    http.post<PortfolioCandidateFieldVO[]>(`${BASE}/candidate/list`, { id }),
  confirm: (data: PortfolioCandidateConfirmRequest) =>
    http.post<void>(`${BASE}/confirm`, data),
  getAnalysis: (id: string) =>
    http.post<PortfolioAiAnalysisDetailVO>(`${BASE}/analysis/get`, { id }),
  getAnalysisByTask: (id: string) =>
    http.post<PortfolioAiAnalysisDetailVO>(`${BASE}/analysis/task/get`, { id }),
  pageAnalysis: (data: PortfolioAiAnalysisPageRequest) =>
    http.post<PageResult<PortfolioAiAnalysisSummaryVO>>(`${BASE}/analysis/page`, data),
}
