import type {
  PortfolioMaterialPageRequest,
  PortfolioMaterialRefVO,
  PortfolioMaterialSaveRequest,
  PortfolioMaterialSearchRequest,
  PortfolioMaterialSearchResponse,
  PortfolioMaterialVersionVO,
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
  listVersions: (id: string) =>
    http.post<PortfolioMaterialVersionVO[]>(`${BASE}/version/list`, { id }),
  listRefs: (id: string) =>
    http.post<PortfolioMaterialRefVO[]>(`${BASE}/ref/list`, { id }),
  voidForFuture: (id: string) => http.post<void>(`${BASE}/void`, { id }),
}
