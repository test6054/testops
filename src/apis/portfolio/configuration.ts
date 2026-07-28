import type { PortfolioConfigurationCapabilityStatusEnum } from '@/types/enums/portfolio-configuration-capability-status-enum'
import type { PortfolioConfigurationSectionCodeEnum } from '@/types/enums/portfolio-configuration-section-code-enum'
import http from '@/config/axios'

export interface PortfolioConfigurationCapabilityVO {
  capabilityCode: string
  title: string
  routeName: string
  ownerHint: string
  status: PortfolioConfigurationCapabilityStatusEnum
  blockingCount?: number | null
  lastChangedAt?: string
  statusSummary: string
  nextAction: string
}

export interface PortfolioConfigurationSectionVO {
  sectionCode: PortfolioConfigurationSectionCodeEnum
  sectionTitle: string
  sortNo: number
  capabilities: PortfolioConfigurationCapabilityVO[]
}

export interface PortfolioConfigurationReadinessVO {
  generatedAt: string
  attentionCount: number
  notConfiguredCount: number
  sections: PortfolioConfigurationSectionVO[]
}

const BASE = '/api/portfolio/configuration'

export const portfolioConfigurationApi = {
  getReadiness: () =>
    http.post<PortfolioConfigurationReadinessVO>(`${BASE}/readiness/get`, {}),
}
