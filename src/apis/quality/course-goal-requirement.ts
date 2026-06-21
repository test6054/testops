import type { SupportLevel } from './types'
/**
 * 课程目标-毕业要求/观测点支撑映射 API。
 * 后端对象：CourseGoalRequirementController /api/quality/course-goal-requirements。
 */
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
  supportLevel: SupportLevel
  supportWeight: number
  createTime?: string
  updateTime?: string
}

export interface CourseGoalRequirementSaveRequest {
  id?: string
  courseGoalId: string
  requirementId?: string
  indicatorId?: string
  supportLevel: SupportLevel
  supportWeight: number
}

export const courseGoalRequirementApi = {
  listByCourseGoal: (courseGoalId: string) =>
    http.post<CourseGoalRequirementVO[]>(`${SUPPORT}/list-by-course-goal`, { id: courseGoalId }),
  listByIndicator: (indicatorId: string) =>
    http.post<CourseGoalRequirementVO[]>(`${SUPPORT}/list-by-indicator`, { id: indicatorId }),
  detail: (id: string) => http.post<CourseGoalRequirementVO>(`${SUPPORT}/detail`, { id }),
  create: (data: CourseGoalRequirementSaveRequest) => http.post<string>(`${SUPPORT}/create`, data),
  update: (data: CourseGoalRequirementSaveRequest) => http.post<void>(`${SUPPORT}/update`, data),
  delete: (id: string) => http.post<void>(`${SUPPORT}/delete`, { id }),
}
