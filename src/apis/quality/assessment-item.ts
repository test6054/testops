/**
 * 考核环节 + 课程目标权重 + Rubric API
 *
 * 后端路径：
 * - /api/quality/assessment-items           考核环节 CRUD + list-by-course
 * - /api/quality/assessment-goal-weights    考核-课程目标权重 + validate-weights
 * - /api/quality/rubric-items               Rubric 评分明细 + validate-full-score
 *
 * 关键约束：同一考核环节对各课程目标的 weight 之和必须为 1（validate-weights 强校验）。
 * 同一课程目标下所有 rubric 满分之和等于该 (item, goal) 的 fullScore（validate-full-score 校验）。
 */
import http from '@/config/axios'

const ITEM = '/api/quality/assessment-items'
const WEIGHT = '/api/quality/assessment-goal-weights'
const RUBRIC = '/api/quality/rubric-items'

export interface AssessmentItemVO {
  id: string
  qualityCourseId: string
  itemCode: string
  itemName: string
  itemType: string
  fullScore: number
  passScore?: number
  weightInCourse?: number
  isProcessOriented?: boolean
  description?: string
  sortOrder?: number
  createTime?: string
  updateTime?: string
}

export interface AssessmentItemSavePayload {
  id?: string
  qualityCourseId: string
  itemCode: string
  itemName: string
  itemType: string
  fullScore: number
  passScore?: number
  weightInCourse?: number
  isProcessOriented?: boolean
  description?: string
  sortOrder?: number
}

export interface AssessmentGoalWeightVO {
  id: string
  assessmentItemId: string
  courseGoalId: string
  weight: number
  fullScore: number
  createTime?: string
  updateTime?: string
}

export interface AssessmentGoalWeightSavePayload {
  id?: string
  assessmentItemId: string
  courseGoalId: string
  weight: number
  fullScore: number
}

export interface RubricItemVO {
  id: string
  assessmentItemId: string
  courseGoalId?: string
  rubricCode?: string
  rubricName: string
  description?: string
  fullScore: number
  sortOrder?: number
  createTime?: string
  updateTime?: string
}

export interface RubricItemSavePayload {
  id?: string
  assessmentItemId: string
  courseGoalId?: string
  rubricCode?: string
  rubricName: string
  description?: string
  fullScore: number
  sortOrder?: number
}

export const assessmentItemApi = {
  listByCourse: (qualityCourseId: string) =>
    http.post<AssessmentItemVO[]>(`${ITEM}/list-by-course`, { id: qualityCourseId }),
  detail: (id: string) =>
    http.post<AssessmentItemVO>(`${ITEM}/detail`, { id }),
  create: (data: AssessmentItemSavePayload) =>
    http.post<string>(`${ITEM}/create`, data),
  update: (data: AssessmentItemSavePayload) =>
    http.post<void>(`${ITEM}/update`, data),
  delete: (id: string) =>
    http.post<void>(`${ITEM}/delete`, { id }),
}

export const assessmentGoalWeightApi = {
  listByItem: (assessmentItemId: string) =>
    http.post<AssessmentGoalWeightVO[]>(`${WEIGHT}/list-by-item`, { id: assessmentItemId }),
  listByCourseGoal: (courseGoalId: string) =>
    http.post<AssessmentGoalWeightVO[]>(`${WEIGHT}/list-by-course-goal`, { id: courseGoalId }),
  detail: (id: string) =>
    http.post<AssessmentGoalWeightVO>(`${WEIGHT}/detail`, { id }),
  create: (data: AssessmentGoalWeightSavePayload) =>
    http.post<string>(`${WEIGHT}/create`, data),
  update: (data: AssessmentGoalWeightSavePayload) =>
    http.post<void>(`${WEIGHT}/update`, data),
  delete: (id: string) =>
    http.post<void>(`${WEIGHT}/delete`, { id }),
  /** 校验某考核环节下所有权重和是否为 1，不满足时抛出 BizException */
  validateWeights: (assessmentItemId: string) =>
    http.post<void>(`${WEIGHT}/validate-weights`, { id: assessmentItemId }),
}

export const rubricItemApi = {
  listByItem: (assessmentItemId: string) =>
    http.post<RubricItemVO[]>(`${RUBRIC}/list-by-item`, { id: assessmentItemId }),
  detail: (id: string) =>
    http.post<RubricItemVO>(`${RUBRIC}/detail`, { id }),
  create: (data: RubricItemSavePayload) =>
    http.post<string>(`${RUBRIC}/create`, data),
  update: (data: RubricItemSavePayload) =>
    http.post<void>(`${RUBRIC}/update`, data),
  delete: (id: string) =>
    http.post<void>(`${RUBRIC}/delete`, { id }),
  /** 校验 rubric 满分加总 = 对应 (item, goal) 的 fullScore */
  validateFullScore: (assessmentItemId: string) =>
    http.post<void>(`${RUBRIC}/validate-full-score`, { id: assessmentItemId }),
}
