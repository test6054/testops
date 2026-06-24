import type {
  PortfolioAiJobSubmitRequest,
  PortfolioAiJobSubmitVO,
  PortfolioCandidateConfirmRequest,
  PortfolioCandidateFieldVO,
} from '@/apis/portfolio/types'
import type { AiTaskVO } from '@/apis/quality/ai-task'
import http from '@/config/axios'

const BASE = '/api/portfolio/ai/job'

export const portfolioAiJobApi = {
  submit: (data: PortfolioAiJobSubmitRequest) =>
    http.post<PortfolioAiJobSubmitVO>(`${BASE}/submit`, data),
  get: (id: string) => http.post<AiTaskVO>(`${BASE}/get`, { id }),
  listCandidates: (id: string) =>
    http.post<PortfolioCandidateFieldVO[]>(`${BASE}/candidate/list`, { id }),
  confirm: (data: PortfolioCandidateConfirmRequest) =>
    http.post<void>(`${BASE}/confirm`, data),
}
