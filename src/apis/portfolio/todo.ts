import type {
  PortfolioTodoCompleteRequest,
  PortfolioTodoPageRequest,
  PortfolioTodoSummaryVO,
} from '@/apis/portfolio/types'
import type { PageResult } from '@/types'
import http from '@/config/axios'

export const portfolioTodoApi = {
  pageTodos: (data: PortfolioTodoPageRequest = {}) =>
    http.post<PageResult<PortfolioTodoSummaryVO>>('/api/portfolio/todo/page', data),
  completeTodo: (data: PortfolioTodoCompleteRequest) =>
    http.post<void>('/api/portfolio/todo/complete', data),
}
