import type {
  PortfolioArchiveRecordCompareVO,
  PortfolioArchiveRecordDetailVO,
  PortfolioArchiveRecordPageRequest,
  PortfolioArchiveRecordSaveDraftRequest,
  PortfolioArchiveRecordSubmitRequest,
  PortfolioArchiveRecordSummaryVO,
  PortfolioArchiveRecordVersionVO,
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
    http.post<PageResult<PortfolioArchiveRecordSummaryVO>>(
      '/api/portfolio/archive/record/page',
      data,
    ),
  getRecord: (id: string) =>
    http.post<PortfolioArchiveRecordDetailVO>('/api/portfolio/archive/record/get', { id }),
  saveDraft: (data: PortfolioArchiveRecordSaveDraftRequest) =>
    http.post<PortfolioArchiveRecordWriteResultVO>(
      '/api/portfolio/archive/record/save-draft',
      data,
    ),
  submitRecord: (data: PortfolioArchiveRecordSubmitRequest) =>
    http.post<PortfolioArchiveRecordWriteResultVO>('/api/portfolio/archive/record/submit', data),
  listTimeline: (data: PortfolioArchiveTimelineRequest = {}) =>
    http.post<PortfolioArchiveTimelineItemVO[]>('/api/portfolio/archive/timeline', data),
  createRevision: (id: string, teacherId?: string) =>
    http.post<PortfolioArchiveRecordWriteResultVO>(
      '/api/portfolio/archive/record/create-revision',
      {
        id,
        teacherId,
      },
    ),
  listVersionHistory: (id: string) =>
    http.post<PortfolioArchiveRecordVersionVO[]>('/api/portfolio/archive/record/version-history', {
      id,
    }),
  compareVersions: (leftRecordId: string, rightRecordId: string) =>
    http.post<PortfolioArchiveRecordCompareVO>('/api/portfolio/archive/record/compare', {
      leftRecordId,
      rightRecordId,
    }),
  getOneTable: (data: PortfolioTeacherOneTableGetRequest = {}) =>
    http.post<PortfolioTeacherOneTableVO>('/api/portfolio/teacher-one-table/get', data),
}
