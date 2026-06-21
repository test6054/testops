import type { AggregationFunction } from './types'
/**
 * 课程目标 API。
 * 后端对象：CourseGoalController /api/quality/course-goals。
 */
import http from '@/config/axios'

const GOAL = '/api/quality/course-goals'

export interface CourseGoalVO {
  id: string
  qualityCourseId: string
  goalCode: string
  goalName: string
  description?: string
  thresholdValue?: number
  directWeight?: number
  indirectWeight?: number
  aggregation?: AggregationFunction
  civicObjectiveFlag?: boolean
  aiLiteracyFlag?: boolean
  complexEngineeringFlag?: boolean
  sortOrder?: number
  createTime?: string
  updateTime?: string
}

export interface CourseGoalSaveRequest {
  id?: string
  qualityCourseId: string
  goalCode: string
  goalName: string
  description?: string
  thresholdValue?: number
  directWeight?: number
  indirectWeight?: number
  aggregation?: AggregationFunction
  civicObjectiveFlag?: boolean
  aiLiteracyFlag?: boolean
  complexEngineeringFlag?: boolean
  sortOrder?: number
}

export const courseGoalApi = {
  listByCourse: (qualityCourseId: string) =>
    http.post<CourseGoalVO[]>(`${GOAL}/list-by-course`, { id: qualityCourseId }),
  detail: (id: string) => http.post<CourseGoalVO>(`${GOAL}/detail`, { id }),
  create: (data: CourseGoalSaveRequest) => http.post<string>(`${GOAL}/create`, data),
  update: (data: CourseGoalSaveRequest) => http.post<void>(`${GOAL}/update`, data),
  delete: (id: string) => http.post<void>(`${GOAL}/delete`, { id }),
}
