import type {
  PortfolioArchiveRecordDetailVO,
  PortfolioArchiveRecordPageRequest,
  PortfolioArchiveRecordSaveDraftRequest,
  PortfolioArchiveRecordSubmitRequest,
  PortfolioArchiveRecordSummaryVO,
  PortfolioArchiveRecordWriteResultVO,
  PortfolioArchiveTimelineItemVO,
  PortfolioArchiveTimelineRequest,
  PortfolioTeacherOneTableGetRequest,
  PortfolioTeacherOneTableVO,
} from '@/apis/portfolio/types'
import type { PageResult } from '@/types'
import http from '@/config/axios'

export const portfolioArchiveApi = {
  pageRecords: (data: PortfolioArchiveRecordPageRequest) =>
    http.post<PageResult<PortfolioArchiveRecordSummaryVO>>('/api/portfolio/archive/record/page', data),
  getRecord: (id: string) =>
    http.post<PortfolioArchiveRecordDetailVO>('/api/portfolio/archive/record/get', { id }),
  saveDraft: (data: PortfolioArchiveRecordSaveDraftRequest) =>
    http.post<PortfolioArchiveRecordWriteResultVO>('/api/portfolio/archive/record/save-draft', data),
  submitRecord: (data: PortfolioArchiveRecordSubmitRequest) =>
    http.post<PortfolioArchiveRecordWriteResultVO>('/api/portfolio/archive/record/submit', data),
  listTimeline: (data: PortfolioArchiveTimelineRequest = {}) =>
    http.post<PortfolioArchiveTimelineItemVO[]>('/api/portfolio/archive/timeline', data),
  getOneTable: (data: PortfolioTeacherOneTableGetRequest = {}) =>
    http.post<PortfolioTeacherOneTableVO>('/api/portfolio/teacher-one-table/get', data),
}
