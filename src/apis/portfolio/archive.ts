import type {
  PortfolioArchiveRecordCompareVO,
  PortfolioArchiveRecordDetailVO,
  PortfolioArchiveRecordPageRequest,
  PortfolioArchiveRecordSaveDraftRequest,
  PortfolioArchiveRecordSubmitRequest,
  PortfolioArchiveRecordSummaryVO,
  PortfolioArchiveRecordWriteResultVO,
  PortfolioArchiveSupportMaterialAddLocalRequest,
  PortfolioArchiveSupportMaterialLinkSyncRequest,
  PortfolioArchiveSupportMaterialVO,
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
  compareVersions: (leftRecordId: string, rightRecordId: string) =>
    http.post<PortfolioArchiveRecordCompareVO>('/api/portfolio/archive/record/compare', {
      leftRecordId,
      rightRecordId,
    }),
  listSupportMaterials: (archiveRecordId: string) =>
    http.post<PortfolioArchiveSupportMaterialVO[]>('/api/portfolio/archive/support-material/list', {
      archiveRecordId,
    }),
  addLocalSupportMaterial: (data: PortfolioArchiveSupportMaterialAddLocalRequest) =>
    http.post<string>('/api/portfolio/archive/support-material/add-local', data),
  linkSyncSupportMaterial: (data: PortfolioArchiveSupportMaterialLinkSyncRequest) =>
    http.post<string>('/api/portfolio/archive/support-material/link-sync', data),
  deleteSupportMaterial: (id: string, archiveRecordId: string) =>
    http.post<void>('/api/portfolio/archive/support-material/delete', { id, archiveRecordId }),
  getOneTable: (data: PortfolioTeacherOneTableGetRequest = {}) =>
    http.post<PortfolioTeacherOneTableVO>('/api/portfolio/teacher-one-table/get', data),
}
