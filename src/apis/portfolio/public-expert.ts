import type { PortfolioExpertAssignmentReviewBundleVO } from '@/apis/portfolio/expert-assignment'
import http from '@/config/axios'

const PUBLIC_EXPERT = '/api/public/portfolio/expert-assignment'

export const portfolioPublicExpertApi = {
  reviewBundle: (data: { tenantId: string, accessToken: string }) =>
    http.post<PortfolioExpertAssignmentReviewBundleVO>(`${PUBLIC_EXPERT}/review-bundle`, data),
}
