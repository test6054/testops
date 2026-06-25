import type {
  PortfolioTeacherCompletenessGetRequest,
  PortfolioTeacherCompletenessVO,
  PortfolioTeacherPortraitGetRequest,
  PortfolioTeacherPortraitVO,
} from '@/apis/portfolio/types'
import http from '@/config/axios'

export const portfolioAnalysisApi = {
  getCompleteness: (data: PortfolioTeacherCompletenessGetRequest = {}) =>
    http.post<PortfolioTeacherCompletenessVO>('/api/portfolio/analysis/completeness/get', data),
  getPortrait: (data: PortfolioTeacherPortraitGetRequest = {}) =>
    http.post<PortfolioTeacherPortraitVO>('/api/portfolio/portrait/teacher/get', data),
}
