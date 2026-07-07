import type {
  PortfolioMaterialPageRequest,
  PortfolioMaterialSaveRequest,
  PortfolioMaterialSearchRequest,
  PortfolioMaterialSearchResponse,
  PortfolioMaterialVO,
} from '@/apis/portfolio/types'
import type { PageResult } from '@/types'
import http from '@/config/axios'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'

const BASE = '/api/portfolio/material'

export const portfolioMaterialApi = {
  page: (data: PortfolioMaterialPageRequest = { pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE }) =>
    http.post<PageResult<PortfolioMaterialVO>>(`${BASE}/page`, data),
  get: (id: string) => http.post<PortfolioMaterialVO>(`${BASE}/get`, { id }),
  save: (data: PortfolioMaterialSaveRequest) => http.post<string>(`${BASE}/save`, data),
  delete: (id: string) => http.post<void>(`${BASE}/delete`, { id }),
  searchOcr: (data: PortfolioMaterialSearchRequest) =>
    http.post<PageResult<PortfolioMaterialSearchResponse>>(`${BASE}/search-ocr`, data),
}
