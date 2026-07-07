import type {
  PortfolioEvaluationMaterialPreviewRequest,
  PortfolioEvaluationMaterialPreviewVO,
  PortfolioEvaluationTeacherNoticeConfirmRequest,
  PortfolioEvaluationTeacherNoticePageRequest,
  PortfolioEvaluationTeacherNoticeReturnRequest,
  PortfolioEvaluationTeacherNoticeVO,
} from '@/apis/portfolio/types'
import type { PageResult } from '@/types'
import http from '@/config/axios'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'

const BASE = '/api/portfolio/evaluation-task'

export const portfolioEvaluationNoticeApi = {
  pageNotices: (
    data: PortfolioEvaluationTeacherNoticePageRequest = {
      pageNum: 1,
      pageSize: DEFAULT_LIST_PAGE_SIZE,
    },
  ) =>
    http.post<PageResult<PortfolioEvaluationTeacherNoticeVO>>(`${BASE}/teacher-notice/page`, data),
  confirmMaterial: (data: PortfolioEvaluationTeacherNoticeConfirmRequest) =>
    http.post<PortfolioEvaluationTeacherNoticeVO>(`${BASE}/teacher-notice/confirm`, data),
  returnNotice: (data: PortfolioEvaluationTeacherNoticeReturnRequest) =>
    http.post<PortfolioEvaluationTeacherNoticeVO>(`${BASE}/teacher-notice/return`, data),
  materialPreview: (data: PortfolioEvaluationMaterialPreviewRequest) =>
    http.post<PortfolioEvaluationMaterialPreviewVO>(`${BASE}/material-preview`, data),
}
