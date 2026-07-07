import type {
  PortfolioTeacherOnboardingReviewContentVO,
  PortfolioTeacherOnboardingStateVO,
} from '@/apis/portfolio/types'
import http from '@/config/axios'

const BASE = '/api/portfolio/teacher/onboarding'

export interface PortfolioTeacherOnboardingGetStateRequest {
  teacherId?: string
}

export interface PortfolioTeacherOnboardingCompleteRequest {
  teacherId?: string
}

export interface PortfolioTeacherOnboardingDismissRequest {
  teacherId?: string
}

export interface PortfolioTeacherOnboardingSaveProgressRequest {
  teacherId?: string
  currentStep: number
}

export const portfolioOnboardingApi = {
  getState: (data: PortfolioTeacherOnboardingGetStateRequest = {}) =>
    http.post<PortfolioTeacherOnboardingStateVO>(`${BASE}/get-state`, data),
  saveProgress: (data: PortfolioTeacherOnboardingSaveProgressRequest) =>
    http.post<PortfolioTeacherOnboardingStateVO>(`${BASE}/save-progress`, data),
  complete: (data: PortfolioTeacherOnboardingCompleteRequest = {}) =>
    http.post<PortfolioTeacherOnboardingStateVO>(`${BASE}/complete`, data),
  dismiss: (data: PortfolioTeacherOnboardingDismissRequest = {}) =>
    http.post<PortfolioTeacherOnboardingStateVO>(`${BASE}/dismiss`, data),
  getReviewContent: (data: PortfolioTeacherOnboardingGetStateRequest = {}) =>
    http.post<PortfolioTeacherOnboardingReviewContentVO>(`${BASE}/get-review-content`, data),
}
