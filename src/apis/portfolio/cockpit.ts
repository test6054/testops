import type {
  PortfolioAiCockpitAskRequest,
  PortfolioAiJobSubmitVO,
  PortfolioCockpitSummaryVO,
} from '@/apis/portfolio/types'
import http from '@/config/axios'

const AI_BASE = '/api/portfolio/ai'
const COCKPIT_BASE = '/api/portfolio/cockpit'

export interface PortfolioCockpitSummaryGetRequest {
  departmentId?: string
  planYear?: string
}

export const portfolioCockpitApi = {
  deptSummary: (data: PortfolioCockpitSummaryGetRequest) =>
    http.post<PortfolioCockpitSummaryVO>(`${COCKPIT_BASE}/dept/summary/get`, data),
  schoolSummary: () =>
    http.post<PortfolioCockpitSummaryVO>(`${COCKPIT_BASE}/school/summary/get`, {}),
  ask: (data: PortfolioAiCockpitAskRequest) =>
    http.post<PortfolioAiJobSubmitVO>(`${AI_BASE}/cockpit-ask`, data),
}
