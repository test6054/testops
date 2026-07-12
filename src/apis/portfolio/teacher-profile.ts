import type { PageResult, QueryDto } from '@/types'
import type { TeacherTaughtCourseSourceTypeCode } from '@/types/enums/teacher-taught-course-source-type-enum'
import http from '@/config/axios'

export interface PortfolioTeacherProfileVO {
  userId: string
  nickName?: string
  teacherNumber?: string
  departmentName?: string
  title?: string
  researchDirection?: string
  teachingGroupId?: string
  teachingGroupName?: string
  taughtCourses: PortfolioTeacherTaughtCourseVO[]
}

export interface PortfolioTeacherTaughtCourseVO {
  id: string
  courseCode: string
  courseName: string
  externalCourseCode?: string
  academicYear: string
  semester: string
  personalHours?: number
  totalHours?: number
  studentCount?: number
  sourceType: TeacherTaughtCourseSourceTypeCode
}

export interface PortfolioTeacherProfileGetRequest {
  teacherId?: string
}

export interface PortfolioTeacherProfileSaveRequest {
  teacherId?: string
  researchDirection?: string
  teachingGroupId?: string
  teachingGroupName?: string
}

export interface PortfolioTeacherTaughtCoursePageRequest extends QueryDto {
  teacherId?: string
  academicYear?: string
}

export interface PortfolioTeacherTaughtCourseSaveRequest {
  teacherId?: string
  id?: string
  courseCode: string
  courseName: string
  academicYear: string
  semester: string
  personalHours?: number
  totalHours?: number
  studentCount?: number
}

export interface PortfolioTeacherTaughtCourseDeleteRequest {
  teacherId?: string
  id: string
}

export const portfolioTeacherProfileApi = {
  get(request: PortfolioTeacherProfileGetRequest = {}) {
    return http.post<PortfolioTeacherProfileVO>('/api/portfolio/teacher-profile/get', request)
  },
  save(request: PortfolioTeacherProfileSaveRequest) {
    return http.post<void>('/api/portfolio/teacher-profile/save', request)
  },
  pageTaughtCourses(request: PortfolioTeacherTaughtCoursePageRequest) {
    return http.post<PageResult<PortfolioTeacherTaughtCourseVO>>(
      '/api/portfolio/teacher-profile/taught-course/page',
      request,
    )
  },
  saveTaughtCourse(request: PortfolioTeacherTaughtCourseSaveRequest) {
    return http.post<string>('/api/portfolio/teacher-profile/taught-course/save', request)
  },
  deleteTaughtCourse(request: PortfolioTeacherTaughtCourseDeleteRequest) {
    return http.post<void>('/api/portfolio/teacher-profile/taught-course/delete', request)
  },
}
