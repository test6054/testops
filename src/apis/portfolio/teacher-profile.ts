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

export interface PortfolioTeacherCvListRequest {
  teacherId?: string
}

export interface PortfolioTeacherCvMutationBaseRequest {
  teacherId?: string
  id?: string
}

export interface PortfolioTeacherEducationVO {
  id: string
  schoolName: string
  departmentMajor?: string
  degreeName: string
  startYearMonth: string
  endYearMonth?: string
  sourceType: TeacherTaughtCourseSourceTypeCode
}

export interface PortfolioTeacherEducationSaveRequest extends PortfolioTeacherCvMutationBaseRequest {
  schoolName: string
  departmentMajor?: string
  degreeName: string
  startYearMonth: string
  endYearMonth?: string
}

export interface PortfolioTeacherAcademicExperienceVO {
  id: string
  organizationUnit: string
  positionTitle?: string
  professionalTitle?: string
  startYearMonth: string
  endYearMonth?: string
  sourceType: TeacherTaughtCourseSourceTypeCode
}

export interface PortfolioTeacherAcademicExperienceSaveRequest extends PortfolioTeacherCvMutationBaseRequest {
  organizationUnit: string
  positionTitle?: string
  professionalTitle?: string
  startYearMonth: string
  endYearMonth?: string
}

export interface PortfolioTeacherAcademicAppointmentVO {
  id: string
  organizationUnit: string
  positionTitle: string
  startYearMonth: string
  endYearMonth?: string
  sourceType: TeacherTaughtCourseSourceTypeCode
}

export interface PortfolioTeacherAcademicAppointmentSaveRequest extends PortfolioTeacherCvMutationBaseRequest {
  organizationUnit: string
  positionTitle: string
  startYearMonth: string
  endYearMonth?: string
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
  listEducations(request: PortfolioTeacherCvListRequest = {}) {
    return http.post<PortfolioTeacherEducationVO[]>(
      '/api/portfolio/teacher-profile/education/list',
      request,
    )
  },
  saveEducation(request: PortfolioTeacherEducationSaveRequest) {
    return http.post<string>('/api/portfolio/teacher-profile/education/save', request)
  },
  deleteEducation(request: PortfolioTeacherCvMutationBaseRequest) {
    return http.post<void>('/api/portfolio/teacher-profile/education/delete', request)
  },
  listAcademicExperiences(request: PortfolioTeacherCvListRequest = {}) {
    return http.post<PortfolioTeacherAcademicExperienceVO[]>(
      '/api/portfolio/teacher-profile/academic-experience/list',
      request,
    )
  },
  saveAcademicExperience(request: PortfolioTeacherAcademicExperienceSaveRequest) {
    return http.post<string>('/api/portfolio/teacher-profile/academic-experience/save', request)
  },
  deleteAcademicExperience(request: PortfolioTeacherCvMutationBaseRequest) {
    return http.post<void>('/api/portfolio/teacher-profile/academic-experience/delete', request)
  },
  listAcademicAppointments(request: PortfolioTeacherCvListRequest = {}) {
    return http.post<PortfolioTeacherAcademicAppointmentVO[]>(
      '/api/portfolio/teacher-profile/academic-appointment/list',
      request,
    )
  },
  saveAcademicAppointment(request: PortfolioTeacherAcademicAppointmentSaveRequest) {
    return http.post<string>('/api/portfolio/teacher-profile/academic-appointment/save', request)
  },
  deleteAcademicAppointment(request: PortfolioTeacherCvMutationBaseRequest) {
    return http.post<void>('/api/portfolio/teacher-profile/academic-appointment/delete', request)
  },
}
