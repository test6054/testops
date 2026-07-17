import http from '@/config/axios'

export interface PortfolioProcessSessionVO {
  id: string
  teacherUserId: string
  taughtCourseId: string
  courseCode?: string
  courseName?: string
  academicYear?: string
  semester?: string
  sessionDate: string
  sessionTitle: string
  prepText?: string
  processText?: string
  feedbackText?: string
  linkedArchiveRecordId?: string
  selectedForMasterpiece?: boolean
  sessionStatus?: string
  updateTime?: string
}

export interface PortfolioProcessSessionListRequest {
  teacherId?: string
  taughtCourseId?: string
  selectedOnly?: boolean
}

export interface PortfolioProcessSessionSaveRequest {
  id?: string
  teacherId?: string
  taughtCourseId: string
  sessionDate: string
  sessionTitle: string
  prepText?: string
  processText?: string
  feedbackText?: string
  linkedArchiveRecordId?: string
  selectedForMasterpiece?: boolean
  sessionStatus?: string
}

export interface PortfolioProcessSessionDeleteRequest {
  id: string
  teacherId?: string
}

export interface PortfolioProcessSessionMasterpieceRequest {
  id: string
  teacherId?: string
  selectedForMasterpiece: boolean
}

export interface PortfolioProcessSessionLinkArchiveRequest {
  id: string
  teacherId?: string
  categoryId: string
  submitForReview: boolean
}

export interface PortfolioProcessSessionLinkArchiveResult {
  recordId: string
  recordStatus?: string
}

export const portfolioProcessSessionApi = {
  list: (request: PortfolioProcessSessionListRequest) =>
    http.post<PortfolioProcessSessionVO[]>('/api/portfolio/process-session/list', request),
  save: (request: PortfolioProcessSessionSaveRequest) =>
    http.post<string>('/api/portfolio/process-session/save', request),
  delete: (request: PortfolioProcessSessionDeleteRequest) =>
    http.post<void>('/api/portfolio/process-session/delete', request),
  setMasterpiece: (request: PortfolioProcessSessionMasterpieceRequest) =>
    http.post<void>('/api/portfolio/process-session/set-masterpiece', request),
  linkArchive: (request: PortfolioProcessSessionLinkArchiveRequest) =>
    http.post<PortfolioProcessSessionLinkArchiveResult>(
      '/api/portfolio/process-session/link-archive',
      request,
    ),
}
