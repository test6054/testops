import http from '@/config/axios'

export interface PortfolioTeachingPhilosophyVO {
  id: string
  teacherUserId: string
  academicYear: string
  philosophyText: string
  updateTime?: string
}

export interface PortfolioTeachingPhilosophyListRequest {
  teacherId?: string
}

export interface PortfolioTeachingPhilosophySaveRequest {
  id?: string
  teacherId?: string
  academicYear: string
  philosophyText: string
}

export interface PortfolioTeachingPhilosophyDeleteRequest {
  teacherId?: string
  id: string
}

export const portfolioTeachingPhilosophyApi = {
  list(request: PortfolioTeachingPhilosophyListRequest = {}) {
    return http.post<PortfolioTeachingPhilosophyVO[]>(
      '/api/portfolio/teaching-philosophy/list',
      request,
    )
  },
  save(request: PortfolioTeachingPhilosophySaveRequest) {
    return http.post<string>('/api/portfolio/teaching-philosophy/save', request)
  },
  delete(request: PortfolioTeachingPhilosophyDeleteRequest) {
    return http.post<void>('/api/portfolio/teaching-philosophy/delete', request)
  },
}
