import type {
  PortfolioAiAskRequest,
  PortfolioAiJobSubmitVO,
  PortfolioAiPolicyCheckRequest,
} from '@/apis/portfolio/types'
import http from '@/config/axios'

const BASE = '/api/portfolio/ai'

export const portfolioAiOrchestrationApi = {
  ask: (data: PortfolioAiAskRequest) =>
    http.post<PortfolioAiJobSubmitVO>(`${BASE}/ask`, data),
  policyCheck: (data: PortfolioAiPolicyCheckRequest) =>
    http.post<PortfolioAiJobSubmitVO>(`${BASE}/policy-check`, data),
}
