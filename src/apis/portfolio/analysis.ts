import type {
  PortfolioTeacherCompletenessGetRequest,
  PortfolioTeacherCompletenessVO,
  PortfolioTeacherPortraitCohortCompareVO,
  PortfolioTeacherPortraitGetRequest,
  PortfolioTeacherPortraitIndicatorDetailRequest,
  PortfolioTeacherPortraitIndicatorDetailVO,
  PortfolioTeacherPortraitTrendGetRequest,
  PortfolioTeacherPortraitTrendVO,
  PortfolioTeacherPortraitVO,
} from '@/apis/portfolio/types'
import http from '@/config/axios'

export const portfolioAnalysisApi = {
  getCompleteness: (data: PortfolioTeacherCompletenessGetRequest = {}) =>
    http.post<PortfolioTeacherCompletenessVO>('/api/portfolio/analysis/completeness/get', data),
  getPortrait: (data: PortfolioTeacherPortraitGetRequest = {}) =>
    http.post<PortfolioTeacherPortraitVO>('/api/portfolio/portrait/teacher/get', data),
  getPortraitCohortCompare: (data: PortfolioTeacherPortraitGetRequest = {}) =>
    http.post<PortfolioTeacherPortraitCohortCompareVO>('/api/portfolio/portrait/teacher/cohort-compare', data),
  getPortraitTrend: (data: PortfolioTeacherPortraitTrendGetRequest = {}) =>
    http.post<PortfolioTeacherPortraitTrendVO>('/api/portfolio/portrait/teacher/trend', data),
  getPortraitIndicatorDetail: (data: PortfolioTeacherPortraitIndicatorDetailRequest) =>
    http.post<PortfolioTeacherPortraitIndicatorDetailVO>('/api/portfolio/portrait/teacher/indicator-detail', data),
}
