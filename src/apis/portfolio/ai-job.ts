import type {
  PortfolioAiAnalysisDetailVO,
  PortfolioAiAnalysisPageRequest,
  PortfolioAiAnalysisSummaryVO,
  PortfolioAiJobPageRequest,
  PortfolioAiJobSubmitRequest,
  PortfolioAiJobSubmitVO,
  PortfolioAiJobTaskVO,
  PortfolioCandidateConfirmRequest,
  PortfolioCandidateFieldVO,
} from '@/apis/portfolio/types'
import type { PageResult } from '@/types'
import http from '@/config/axios'
import { assertPortfolioAiAnalysisDetailVO, assertPortfolioAiAnalysisSummaryVO } from '@/utils/portfolio-ai-analysis-contract'

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
  getAnalysisByTask: async (id: string) => {
    const detail = await http.post<PortfolioAiAnalysisDetailVO>(`${BASE}/analysis/task/get`, { id })
    assertPortfolioAiAnalysisDetailVO(detail)
    return detail
  },
  pageAnalysis: async (data: PortfolioAiAnalysisPageRequest) => {
    const page = await http.post<PageResult<PortfolioAiAnalysisSummaryVO>>(`${BASE}/analysis/page`, data)
    for (const row of page.list ?? []) {
      assertPortfolioAiAnalysisSummaryVO(row)
    }
    return page
  },
}
