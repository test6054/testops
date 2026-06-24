import type {
  PortfolioTeacherDetailVO,
  PortfolioTeacherIdentitySaveRequest,
  PortfolioTeacherPageRequest,
  PortfolioTeacherSummaryVO,
} from '@/apis/portfolio/types'
import type { PageResult } from '@/types'
import http from '@/config/axios'

const BASE = '/api/portfolio/teacher'

export const portfolioTeacherApi = {
  page: (data: PortfolioTeacherPageRequest) =>
    http.post<PageResult<PortfolioTeacherSummaryVO>>(`${BASE}/page`, data),
  get: (id: string) => http.post<PortfolioTeacherDetailVO>(`${BASE}/get`, { id }),
  saveIdentity: (data: PortfolioTeacherIdentitySaveRequest) =>
    http.post<string>(`${BASE}/identity/save`, data),
}

export type {
  PortfolioTeacherDetailVO,
  PortfolioTeacherIdentitySaveRequest,
  PortfolioTeacherPageRequest,
  PortfolioTeacherSummaryVO,
}
