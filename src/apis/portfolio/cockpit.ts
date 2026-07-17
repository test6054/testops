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
  portfolioOrgId?: string
  teachingGroupId?: string
  /** 校区组织 ID（orgType=CAMPUS），学校驾驶舱按校区筛选 */
  campusOrgId?: string
}

export const portfolioCockpitApi = {
  deptSummary: (data: PortfolioCockpitSummaryGetRequest) =>
    http.post<PortfolioCockpitSummaryVO>(`${COCKPIT_BASE}/dept/summary/get`, data),
  schoolSummary: (data: PortfolioCockpitSummaryGetRequest = {}) =>
    http.post<PortfolioCockpitSummaryVO>(`${COCKPIT_BASE}/school/summary/get`, data),
  ask: (data: PortfolioAiCockpitAskRequest) =>
    http.post<PortfolioAiJobSubmitVO>(`${AI_BASE}/cockpit-ask`, data),
}
