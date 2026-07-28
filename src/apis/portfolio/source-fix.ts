import type {
  PortfolioSourceFixBatchPreviewRequest,
  PortfolioSourceFixBatchPreviewVO,
  PortfolioSourceFixBatchRequest,
  PortfolioSourceFixEventPageRequest,
  PortfolioSourceFixEventVO,
} from '@/apis/portfolio/types'
import type { PageResult } from '@/types'
import http from '@/config/axios'

export const portfolioSourceFixApi = {
  page: (
    data: PortfolioSourceFixEventPageRequest = {
      pageNum: 1,
      pageSize: 20,
    },
  ) => http.post<PageResult<PortfolioSourceFixEventVO>>('/api/portfolio/source-fix/page', data),
  get: (id: string) =>
    http.post<PortfolioSourceFixEventVO>('/api/portfolio/source-fix/get', { id }),
  execute: (id: string) =>
    http.post<PortfolioSourceFixEventVO>('/api/portfolio/source-fix/execute', { id }),
  previewBatch: (data: PortfolioSourceFixBatchPreviewRequest) =>
    http.post<PortfolioSourceFixBatchPreviewVO>('/api/portfolio/source-fix/batch/preview', data),
  batch: (data: PortfolioSourceFixBatchRequest) =>
    http.post<PortfolioSourceFixEventVO>('/api/portfolio/source-fix/batch', data),
  ackAlert: (id: string) =>
    http.post<PortfolioSourceFixEventVO>('/api/portfolio/source-fix/ack-alert', { id }),
}
