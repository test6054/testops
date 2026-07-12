import http from '@/config/axios'

export interface PortfolioTeacherCustomCategoryVO {
  categoryId: string
  categoryCode: string
  categoryName: string
  createTime?: string
}

export interface PortfolioTeacherCustomCategoryListRequest {
  teacherId?: string
}

export interface PortfolioTeacherCustomCategoryCreateRequest {
  categoryName: string
}

export interface PortfolioTeacherCustomCategoryDeleteRequest {
  categoryId: string
}

export const portfolioTeacherCustomCategoryApi = {
  list: (request: PortfolioTeacherCustomCategoryListRequest) =>
    http.post<PortfolioTeacherCustomCategoryVO[]>(
      '/api/portfolio/teacher-custom-category/list',
      request,
    ),
  create: (request: PortfolioTeacherCustomCategoryCreateRequest) =>
    http.post<string>('/api/portfolio/teacher-custom-category/create', request),
  delete: (request: PortfolioTeacherCustomCategoryDeleteRequest) =>
    http.post<void>('/api/portfolio/teacher-custom-category/delete', request),
}
