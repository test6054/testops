/**
 * 质量评价课程 API - 对接 edu-quality / QualityCourseController
 *
 * 后端路径: /api/quality/courses
 */
import type { PageResult, QueryDto } from '@/types'
import type { SemesterCode } from '@/types/enums/semester-enum'
import http from '@/config/axios'

const BASE = '/api/quality/courses'

/** 质量评价课程 VO - 严格对齐后端 QualityCourseVO */
export interface QualityCourseVO {
  id: string
  trainingPlanId: string
  programId: string
  courseId: string
  courseCode: string
  courseName: string
  courseCategory?: string
  courseNature?: string
  schoolYear?: string
  semester?: SemesterCode
  teacherUserId?: string
  classId?: string
  creditHours?: number
  creditValue?: number
  civicObjective?: string
  syllabusFileId?: string
  enabled: boolean
  createTime?: string
  updateTime?: string
}

export interface QualityCourseQueryRequest extends QueryDto {
  trainingPlanId?: string
  programId?: string
  schoolYear?: string
  semester?: SemesterCode
  teacherUserId?: string
  classId?: string
  enabled?: boolean
  keyword?: string
}

/** 保存请求 - 严格对齐后端 QualityCourseSaveRequest */
export interface QualityCourseSaveRequest {
  id?: string
  trainingPlanId: string
  programId: string
  courseId: string
  courseCode: string
  courseName: string
  courseCategory?: string
  courseNature?: string
  schoolYear: string
  semester: SemesterCode
  teacherUserId?: string
  classId?: string
  creditHours?: number
  creditValue?: number
  civicObjective?: string
  syllabusFileId?: string
  enabled?: boolean
}

/** 课程编辑表单：学期未选时为 undefined，提交前须显式选择，禁止静默默认 */
export type QualityCourseEditorForm = Omit<QualityCourseSaveRequest, 'semester'> & {
  semester?: SemesterCode
}

export const qualityCourseApi = {
  page: (data: QualityCourseQueryRequest) =>
    http.post<PageResult<QualityCourseVO>>(`${BASE}/page`, data),
  detail: (id: string) =>
    http.post<QualityCourseVO>(`${BASE}/detail`, { id }),
  create: (data: QualityCourseSaveRequest) =>
    http.post<string>(`${BASE}/create`, data),
  update: (data: QualityCourseSaveRequest) =>
    http.post<void>(`${BASE}/update`, data),
  delete: (id: string) =>
    http.post<void>(`${BASE}/delete`, { id }),
}
