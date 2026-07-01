import type {
  PortfolioTeacherReviewStatusPageRequest,
  PortfolioTeacherReviewStatusRowVO,
} from '@/apis/portfolio/types'
import type { PageResult } from '@/types'
import http from '@/config/axios'

export const portfolioReviewStatusApi = {
  list: (data: PortfolioTeacherReviewStatusPageRequest) =>
    http.post<PageResult<PortfolioTeacherReviewStatusRowVO>>('/api/portfolio/teacher/review-status/list', data),
}
