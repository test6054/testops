import type {
  PortfolioAiAskRequest,
  PortfolioAiJobSubmitVO,
  PortfolioAiPolicyCheckRequest,
  PortfolioAiCockpitAskRequest,
} from '@/apis/portfolio/types'
import http from '@/config/axios'

const BASE = '/api/portfolio/ai'

export const portfolioAiOrchestrationApi = {
  ask: (data: PortfolioAiAskRequest) =>
    http.post<PortfolioAiJobSubmitVO>(`${BASE}/ask`, data),
  policyCheck: (data: PortfolioAiPolicyCheckRequest) =>
    http.post<PortfolioAiJobSubmitVO>(`${BASE}/policy-check`, data),
  cockpitAsk: (data: PortfolioAiCockpitAskRequest) =>
    http.post<PortfolioAiJobSubmitVO>(`${BASE}/cockpit-ask`, data),
}
