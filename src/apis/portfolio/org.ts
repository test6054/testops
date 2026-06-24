import type {
  PortfolioOrgAliasSaveRequest,
  PortfolioOrgSyncResultVO,
  PortfolioOrgTreeNodeVO,
  PortfolioOrgTreeRequest,
  PortfolioOrgUnitSaveRequest,
} from '@/apis/portfolio/types'
import http from '@/config/axios'

const BASE = '/api/portfolio/org'

export const portfolioOrgApi = {
  tree: (data: PortfolioOrgTreeRequest = {}) =>
    http.post<PortfolioOrgTreeNodeVO[]>(`${BASE}/tree`, data),
  sync: () => http.post<PortfolioOrgSyncResultVO>(`${BASE}/sync`, {}),
  saveUnit: (data: PortfolioOrgUnitSaveRequest) =>
    http.post<string>(`${BASE}/save-unit`, data),
  deleteUnit: (id: string) => http.post<void>(`${BASE}/delete-unit`, { id }),
  saveAlias: (data: PortfolioOrgAliasSaveRequest) =>
    http.post<string>(`${BASE}/save-alias`, data),
  deleteAlias: (id: string) => http.post<void>(`${BASE}/delete-alias`, { id }),
}

export type {
  PortfolioOrgAliasSaveRequest,
  PortfolioOrgSyncResultVO,
  PortfolioOrgTreeNodeVO,
  PortfolioOrgTreeRequest,
  PortfolioOrgUnitSaveRequest,
}
