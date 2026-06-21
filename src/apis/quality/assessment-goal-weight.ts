/**
 * 考核环节-课程目标权重 API。
 * 后端对象：AssessmentGoalWeightController /api/quality/assessment-goal-weights。
 */
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

export interface AssessmentGoalWeightSaveRequest {
  id?: string
  assessmentItemId: string
  courseGoalId: string
  weight: number
  fullScore: number
}

export const assessmentGoalWeightApi = {
  listByItem: (assessmentItemId: string) =>
    http.post<AssessmentGoalWeightVO[]>(`${WEIGHT}/list-by-item`, { id: assessmentItemId }),
  listByCourseGoal: (courseGoalId: string) =>
    http.post<AssessmentGoalWeightVO[]>(`${WEIGHT}/list-by-course-goal`, { id: courseGoalId }),
  detail: (id: string) => http.post<AssessmentGoalWeightVO>(`${WEIGHT}/detail`, { id }),
  create: (data: AssessmentGoalWeightSaveRequest) => http.post<string>(`${WEIGHT}/create`, data),
  update: (data: AssessmentGoalWeightSaveRequest) => http.post<void>(`${WEIGHT}/update`, data),
  delete: (id: string) => http.post<void>(`${WEIGHT}/delete`, { id }),
  /** 校验某考核环节下所有权重和是否为 1。 */
  validateWeights: (assessmentItemId: string) =>
    http.post<void>(`${WEIGHT}/validate-weights`, { id: assessmentItemId }),
}
