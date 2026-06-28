import type {
  PortfolioCorrectionDetailVO,
  PortfolioCorrectionHandleRequest,
  PortfolioCorrectionPageRequest,
  PortfolioCorrectionSubmitRequest,
  PortfolioCorrectionSummaryVO,
} from '@/apis/portfolio/types'
import type { PageResult } from '@/types'
import http from '@/config/axios'

export const portfolioCorrectionApi = {
  submit: (data: PortfolioCorrectionSubmitRequest) =>
    http.post<PortfolioCorrectionDetailVO>('/api/portfolio/correction/submit', data),
  pageCorrections: (data: PortfolioCorrectionPageRequest = { pageNum: 1, pageSize: 20 }) =>
    http.post<PageResult<PortfolioCorrectionSummaryVO>>('/api/portfolio/correction/page', data),
  getCorrection: (id: string) =>
    http.post<PortfolioCorrectionDetailVO>('/api/portfolio/correction/get', { id }),
  handleCorrection: (data: PortfolioCorrectionHandleRequest) =>
    http.post<PortfolioCorrectionDetailVO>('/api/portfolio/correction/handle', data),
}
