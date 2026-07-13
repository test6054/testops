import http from '@/config/axios'

export interface PortfolioCourseArchiveFrameworkVO {
  categoryId: string
  categoryCode: string
  categoryName: string
  sortOrder?: number
  completed: boolean
  officialRecordId?: string
  latestUpdateTime?: string
}

export interface PortfolioCourseArchiveCourseVO {
  taughtCourseId: string
  courseCode: string
  courseName: string
  academicYear?: string
  semester?: string
  completedFrameworkCount: number
  totalFrameworkCount: number
  frameworks: PortfolioCourseArchiveFrameworkVO[]
}

export interface PortfolioCourseArchiveOverviewVO {
  teacherId: string
  taughtCourseCount: number
  fullyCompleteCourseCount: number
  frameworkSlotDone: number
  frameworkSlotTotal: number
  courses: PortfolioCourseArchiveCourseVO[]
}

export interface PortfolioCourseArchiveOverviewRequest {
  teacherId?: string
  academicYear?: string
}

export const portfolioCourseArchiveApi = {
  overview: (request: PortfolioCourseArchiveOverviewRequest) =>
    http.post<PortfolioCourseArchiveOverviewVO>('/api/portfolio/course-archive/overview', request),
}
