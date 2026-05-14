import type { AggregationFunction, SupportLevel } from './types'
/**
 * 课程目标 + 支撑映射 + 计算规则 API
 *
 * 后端路径：
 * - /api/quality/course-goals                   课程目标 CRUD
 * - /api/quality/course-goal-requirements       课程目标 ↔ 毕业要求/观测点支撑映射
 * - /api/quality/course-goal-assessment-rules   课程目标达成度计算规则
 *
 * 设计文档 §7.5：课程目标达成度计算入口；w(a, g) 与 supportWeight(c, p) 等权重约束。
 */
import http from '@/config/axios'

const GOAL = '/api/quality/course-goals'
const SUPPORT = '/api/quality/course-goal-requirements'
const RULE = '/api/quality/course-goal-assessment-rules'

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

export interface CourseGoalSavePayload {
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

export interface CourseGoalRequirementVO {
  id: string
  courseGoalId: string
  requirementId?: string
  indicatorId?: string
  supportLevel: SupportLevel
  supportWeight: number
  createTime?: string
  updateTime?: string
}

export interface CourseGoalRequirementSavePayload {
  id?: string
  courseGoalId: string
  requirementId?: string
  indicatorId?: string
  supportLevel: SupportLevel
  supportWeight: number
}

export interface CourseGoalAssessmentRuleVO {
  id: string
  courseGoalId: string
  aggregation: AggregationFunction
  directWeight?: number
  indirectWeight?: number
  thresholdValue: number
  minimumValidSample?: number
  indirectMinValidSample?: number
  indirectCoverageThreshold?: number
  notes?: string
  createTime?: string
  updateTime?: string
}

export interface CourseGoalAssessmentRuleSavePayload {
  id?: string
  courseGoalId: string
  aggregation: AggregationFunction
  directWeight?: number
  indirectWeight?: number
  thresholdValue: number
  minimumValidSample?: number
  indirectMinValidSample?: number
  indirectCoverageThreshold?: number
  notes?: string
}

export const courseGoalApi = {
  listByCourse: (qualityCourseId: string) =>
    http.post<CourseGoalVO[]>(`${GOAL}/list-by-course`, { id: qualityCourseId }),
  detail: (id: string) =>
    http.post<CourseGoalVO>(`${GOAL}/detail`, { id }),
  create: (data: CourseGoalSavePayload) =>
    http.post<string>(`${GOAL}/create`, data),
  update: (data: CourseGoalSavePayload) =>
    http.post<void>(`${GOAL}/update`, data),
  delete: (id: string) =>
    http.post<void>(`${GOAL}/delete`, { id }),
}

export const courseGoalRequirementApi = {
  listByCourseGoal: (courseGoalId: string) =>
    http.post<CourseGoalRequirementVO[]>(`${SUPPORT}/list-by-course-goal`, { id: courseGoalId }),
  listByIndicator: (indicatorId: string) =>
    http.post<CourseGoalRequirementVO[]>(`${SUPPORT}/list-by-indicator`, { id: indicatorId }),
  detail: (id: string) =>
    http.post<CourseGoalRequirementVO>(`${SUPPORT}/detail`, { id }),
  create: (data: CourseGoalRequirementSavePayload) =>
    http.post<string>(`${SUPPORT}/create`, data),
  update: (data: CourseGoalRequirementSavePayload) =>
    http.post<void>(`${SUPPORT}/update`, data),
  delete: (id: string) =>
    http.post<void>(`${SUPPORT}/delete`, { id }),
}

export const courseGoalAssessmentRuleApi = {
  findByCourseGoal: (courseGoalId: string) =>
    http.post<CourseGoalAssessmentRuleVO | null>(`${RULE}/find-by-course-goal`, { id: courseGoalId }),
  detail: (id: string) =>
    http.post<CourseGoalAssessmentRuleVO>(`${RULE}/detail`, { id }),
  create: (data: CourseGoalAssessmentRuleSavePayload) =>
    http.post<string>(`${RULE}/create`, data),
  update: (data: CourseGoalAssessmentRuleSavePayload) =>
    http.post<void>(`${RULE}/update`, data),
  delete: (id: string) =>
    http.post<void>(`${RULE}/delete`, { id }),
}
