import type { SupportLevelCode } from './types'
/**
 * 课程目标-毕业要求/观测点支撑映射 API。
 * 后端对象：CourseGoalRequirementController /api/quality/course-goal-requirements。
 */
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

const SUPPORT = '/api/quality/course-goal-requirements'

export interface CourseGoalRequirementVO {
  id: string
  courseGoalId: string
  courseGoalCode: string
  courseGoalName: string
  requirementId?: string
  requirementCode?: string
  requirementName?: string
  indicatorId?: string
  indicatorCode?: string
  indicatorName?: string
  supportLevel: SupportLevelCode
  supportWeight: number
  createTime?: string
  updateTime?: string
}

export interface CourseGoalRequirementQueryRequest extends QueryDto {
  qualityCourseId?: string
  courseGoalId?: string
  graduationRequirementId?: string
  indicatorId?: string
}

export interface CourseGoalRequirementSaveRequest {
  id?: string
  courseGoalId: string
  requirementId?: string
  indicatorId?: string
  supportLevel: SupportLevelCode
  supportWeight: number
}

export const courseGoalRequirementApi = {
  page: (data: CourseGoalRequirementQueryRequest) =>
    http.post<PageResult<CourseGoalRequirementVO>>(`${SUPPORT}/page`, data),
  detail: (id: string) => http.post<CourseGoalRequirementVO>(`${SUPPORT}/detail`, { id }),
  create: (data: CourseGoalRequirementSaveRequest) => http.post<string>(`${SUPPORT}/create`, data),
  update: (data: CourseGoalRequirementSaveRequest) => http.post<void>(`${SUPPORT}/update`, data),
  delete: (id: string) => http.post<void>(`${SUPPORT}/delete`, { id }),
}
