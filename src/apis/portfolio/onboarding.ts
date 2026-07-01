import type {
  PortfolioTeacherOnboardingReviewContentVO,
  PortfolioTeacherOnboardingStateVO,
} from '@/apis/portfolio/types'
import http from '@/config/axios'

const BASE = '/api/portfolio/teacher/onboarding'

export interface PortfolioTeacherOnboardingTeacherRequest {
  teacherId?: string
}

export interface PortfolioTeacherOnboardingSaveProgressRequest extends PortfolioTeacherOnboardingTeacherRequest {
  currentStep: number
}

export const portfolioOnboardingApi = {
  getState: (data: PortfolioTeacherOnboardingTeacherRequest = {}) =>
    http.post<PortfolioTeacherOnboardingStateVO>(`${BASE}/get-state`, data),
  saveProgress: (data: PortfolioTeacherOnboardingSaveProgressRequest) =>
    http.post<void>(`${BASE}/save-progress`, data),
  complete: (data: PortfolioTeacherOnboardingTeacherRequest = {}) =>
    http.post<void>(`${BASE}/complete`, data),
  dismiss: (data: PortfolioTeacherOnboardingTeacherRequest = {}) =>
    http.post<void>(`${BASE}/dismiss`, data),
  getReviewContent: (data: PortfolioTeacherOnboardingTeacherRequest = {}) =>
    http.post<PortfolioTeacherOnboardingReviewContentVO>(`${BASE}/get-review-content`, data),
}
