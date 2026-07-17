import type { PortfolioEvaluationTaskVO } from '@/apis/portfolio/teacher-platform'
import type {
  PortfolioEvaluationObjectionHandleRequest,
  PortfolioEvaluationObjectionPageRequest,
  PortfolioEvaluationObjectionReviewPackageRequest,
  PortfolioEvaluationObjectionReviewPackageVO,
  PortfolioEvaluationObjectionSubmitRequest,
  PortfolioEvaluationObjectionSummaryVO,
  PortfolioEvaluationPublicityListItemVO,
  PortfolioEvaluationPublicityListRequest,
  PortfolioEvaluationPublicityPublishRequest,
  PortfolioEvaluationResultSummaryRequest,
  PortfolioEvaluationTaskAdvanceRequest,
  PortfolioEvaluationTeacherResultSummaryVO,
} from '@/apis/portfolio/types'
import type { PageResult } from '@/types'
import http from '@/config/axios'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'

const BASE = '/api/portfolio/evaluation'

export const portfolioEvaluationPublicityApi = {
  listPublicity: (data: PortfolioEvaluationPublicityListRequest = {}) =>
    http.post<PortfolioEvaluationPublicityListItemVO[]>(`${BASE}/publicity/list`, data),
  publishPublicity: (data: PortfolioEvaluationPublicityPublishRequest) =>
    http.post<string>(`${BASE}/publicity/publish`, data),
  submitObjection: (data: PortfolioEvaluationObjectionSubmitRequest) =>
    http.post<string>(`${BASE}/objection/submit`, data),
  pageObjections: (
    data: PortfolioEvaluationObjectionPageRequest = {
      pageNum: 1,
      pageSize: DEFAULT_LIST_PAGE_SIZE,
    },
  ) => http.post<PageResult<PortfolioEvaluationObjectionSummaryVO>>(`${BASE}/objection/page`, data),
  handleObjection: (data: PortfolioEvaluationObjectionHandleRequest) =>
    http.post<PortfolioEvaluationObjectionSummaryVO>(`${BASE}/objection/handle`, data),
  getObjectionReviewPackage: (data: PortfolioEvaluationObjectionReviewPackageRequest) =>
    http.post<PortfolioEvaluationObjectionReviewPackageVO>(`${BASE}/objection/review-package`, data),
  summarizeTeacherResult: (data: PortfolioEvaluationResultSummaryRequest) =>
    http.post<PortfolioEvaluationTeacherResultSummaryVO>(`${BASE}/result/summary`, data),
  advanceTask: (data: PortfolioEvaluationTaskAdvanceRequest) =>
    http.post<PortfolioEvaluationTaskVO>(`${BASE}/task/advance`, data),
  archiveTask: (id: string) => http.post<PortfolioEvaluationTaskVO>(`${BASE}/task/archive`, { id }),
  createRereview: (data: {
    evaluationTaskId: string | number
    subjectTeacherUserId?: string | number
    reasonText: string
  }) => http.post<PortfolioEvaluationRereviewOrderVO>(`${BASE}/rereview/create`, data),
  completeRereview: (data: { orderId: string | number, conclusionSummary: string }) =>
    http.post<PortfolioEvaluationTaskVO>(`${BASE}/rereview/complete`, data),
  listRereview: (data: { evaluationTaskId: string | number }) =>
    http.post<PortfolioEvaluationRereviewOrderVO[]>(`${BASE}/rereview/list`, data),
}

export interface PortfolioEvaluationRereviewOrderVO {
  id: string | number
  evaluationTaskId: string | number
  subjectTeacherUserId?: string | number
  triggerType?: string
  triggerRefId?: string | number
  orderStatus: string
  freezeSnapshotId?: string | number
  reasonText?: string
  conclusionSummary?: string
  completedTime?: string
  createTime?: string
}

