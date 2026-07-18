import type {
  PortfolioSourceFixBatchRequest,
  PortfolioSourceFixEventPageRequest,
  PortfolioSourceFixEventVO,
} from '@/apis/portfolio/types'
import type { PageResult } from '@/types'
import http from '@/config/axios'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'

export const portfolioSourceFixApi = {
  page: (
    data: PortfolioSourceFixEventPageRequest = {
      pageNum: 1,
      pageSize: DEFAULT_LIST_PAGE_SIZE,
    },
  ) => http.post<PageResult<PortfolioSourceFixEventVO>>('/api/portfolio/source-fix/page', data),
  get: (id: string) =>
    http.post<PortfolioSourceFixEventVO>('/api/portfolio/source-fix/get', { id }),
  execute: (id: string) =>
    http.post<PortfolioSourceFixEventVO>('/api/portfolio/source-fix/execute', { id }),
  batch: (data: PortfolioSourceFixBatchRequest) =>
    http.post<PortfolioSourceFixEventVO>('/api/portfolio/source-fix/batch', data),
  ackAlert: (id: string) =>
    http.post<PortfolioSourceFixEventVO>('/api/portfolio/source-fix/ack-alert', { id }),
}
