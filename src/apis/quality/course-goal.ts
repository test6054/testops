import type { AggregationFunctionCode } from './types'
/**
 * 课程目标 API。
 * 后端对象：CourseGoalController /api/quality/course-goals。
 */
import type { PageResult, QueryDto } from '@/types'
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
  aggregation?: AggregationFunctionCode
  civicObjectiveFlag?: boolean
  aiLiteracyFlag?: boolean
  sortOrder?: number
  createTime?: string
  updateTime?: string
}

export interface CourseGoalQueryRequest extends QueryDto {
  qualityCourseId?: string
  keyword?: string
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
  aggregation?: AggregationFunctionCode
  civicObjectiveFlag?: boolean
  aiLiteracyFlag?: boolean
  sortOrder?: number
}

export const courseGoalApi = {
  page: (data: CourseGoalQueryRequest) =>
    http.post<PageResult<CourseGoalVO>>(`${GOAL}/page`, data),
  detail: (id: string) => http.post<CourseGoalVO>(`${GOAL}/detail`, { id }),
  create: (data: CourseGoalSaveRequest) => http.post<string>(`${GOAL}/create`, data),
  update: (data: CourseGoalSaveRequest) => http.post<void>(`${GOAL}/update`, data),
  delete: (id: string) => http.post<void>(`${GOAL}/delete`, { id }),
}
