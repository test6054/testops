import type { PortfolioEvaluationTaskVO } from '@/apis/portfolio/teacher-platform'
import type {
  PortfolioEvaluationObjectionHandleRequest,
  PortfolioEvaluationObjectionPageRequest,
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
  summarizeTeacherResult: (data: PortfolioEvaluationResultSummaryRequest) =>
    http.post<PortfolioEvaluationTeacherResultSummaryVO>(`${BASE}/result/summary`, data),
  advanceTask: (data: PortfolioEvaluationTaskAdvanceRequest) =>
    http.post<PortfolioEvaluationTaskVO>(`${BASE}/task/advance`, data),
  archiveTask: (id: string) => http.post<PortfolioEvaluationTaskVO>(`${BASE}/task/archive`, { id }),
}
