/**
 * 考核环节-课程目标权重 API。
 * 后端对象：AssessmentGoalWeightController /api/quality/assessment-goal-weights。
 */
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

const WEIGHT = '/api/quality/assessment-goal-weights'

export interface AssessmentGoalWeightVO {
  id: string
  assessmentItemId: string
  assessmentItemCode: string
  assessmentItemName: string
  assessmentItemFullScore: number
  courseGoalId: string
  courseGoalCode: string
  courseGoalName: string
  weight: number
  fullScore: number
  createTime?: string
  updateTime?: string
}

export interface AssessmentGoalWeightQueryRequest extends QueryDto {
  qualityCourseId?: string
  assessmentItemId?: string
  courseGoalId?: string
}

export interface AssessmentGoalWeightSaveRequest {
  id?: string
  assessmentItemId: string
  courseGoalId: string
  weight: number
  fullScore: number
}

export const assessmentGoalWeightApi = {
  page: (data: AssessmentGoalWeightQueryRequest) =>
    http.post<PageResult<AssessmentGoalWeightVO>>(`${WEIGHT}/page`, data),
  detail: (id: string) => http.post<AssessmentGoalWeightVO>(`${WEIGHT}/detail`, { id }),
  create: (data: AssessmentGoalWeightSaveRequest) => http.post<string>(`${WEIGHT}/create`, data),
  update: (data: AssessmentGoalWeightSaveRequest) => http.post<void>(`${WEIGHT}/update`, data),
  delete: (id: string) => http.post<void>(`${WEIGHT}/delete`, { id }),
  /** 校验某考核环节下所有权重和是否为 1。 */
  validateWeights: (assessmentItemId: string) =>
    http.post<void>(`${WEIGHT}/validate-weights`, { id: assessmentItemId }),
  /** 校验某课程目标下全部考核环节权重和是否为 1。 */
  validateWeightsByCourseGoal: (courseGoalId: string) =>
    http.post<void>(`${WEIGHT}/validate-weights-by-course-goal`, { id: courseGoalId }),
  /** 校验质量评价课程考核×目标权重矩阵双向配平。 */
  validateMatrixWeights: (qualityCourseId: string) =>
    http.post<void>(`${WEIGHT}/validate-matrix-weights`, { qualityCourseId }),
}
