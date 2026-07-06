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
  PortfolioTeacherProgressCockpitGetRequest,
  PortfolioTeacherProgressCockpitVO,
  PortfolioTeacherWorkbenchSummaryVO,
} from '@/apis/portfolio/types'
import http from '@/config/axios'

export const portfolioAnalysisApi = {
  getWorkbenchSummary: (data: PortfolioTeacherCompletenessGetRequest = {}) =>
    http.post<PortfolioTeacherWorkbenchSummaryVO>(
      '/api/portfolio/analysis/workbench-summary/get',
      data,
    ),
  getProgressCockpit: (data: PortfolioTeacherProgressCockpitGetRequest = {}) =>
    http.post<PortfolioTeacherProgressCockpitVO>(
      '/api/portfolio/analysis/progress-cockpit/get',
      data,
    ),
  getCompleteness: (data: PortfolioTeacherCompletenessGetRequest = {}) =>
    http.post<PortfolioTeacherCompletenessVO>('/api/portfolio/analysis/completeness/get', data),
  getPortrait: (data: PortfolioTeacherPortraitGetRequest = {}) =>
    http.post<PortfolioTeacherPortraitVO>('/api/portfolio/portrait/teacher/get', data),
  getPortraitCohortCompare: (data: PortfolioTeacherPortraitGetRequest = {}) =>
    http.post<PortfolioTeacherPortraitCohortCompareVO>(
      '/api/portfolio/portrait/teacher/cohort-compare',
      data,
    ),
  getPortraitTrend: (data: PortfolioTeacherPortraitTrendGetRequest = {}) =>
    http.post<PortfolioTeacherPortraitTrendVO>('/api/portfolio/portrait/teacher/trend', data),
  getPortraitIndicatorDetail: (data: PortfolioTeacherPortraitIndicatorDetailRequest) =>
    http.post<PortfolioTeacherPortraitIndicatorDetailVO>(
      '/api/portfolio/portrait/teacher/indicator-detail',
      data,
    ),
}
