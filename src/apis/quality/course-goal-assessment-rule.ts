import type { AggregationFunctionCode } from './types'
/**
 * 课程目标达成度计算规则 API。
 * 后端对象：CourseGoalAssessmentRuleController /api/quality/course-goal-assessment-rules。
 */
import http from '@/config/axios'

const RULE = '/api/quality/course-goal-assessment-rules'

export interface CourseGoalAssessmentRuleVO {
  id: string
  courseGoalId: string
  aggregation: AggregationFunctionCode
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

export interface CourseGoalAssessmentRuleSaveRequest {
  id?: string
  courseGoalId: string
  aggregation: AggregationFunctionCode
  directWeight?: number
  indirectWeight?: number
  thresholdValue: number
  minimumValidSample?: number
  indirectMinValidSample?: number
  indirectCoverageThreshold?: number
  notes?: string
}

export const courseGoalAssessmentRuleApi = {
  findByCourseGoal: (courseGoalId: string) =>
    http.post<CourseGoalAssessmentRuleVO | null>(`${RULE}/find-by-course-goal`, {
      id: courseGoalId,
    }),
  detail: (id: string) => http.post<CourseGoalAssessmentRuleVO>(`${RULE}/detail`, { id }),
  create: (data: CourseGoalAssessmentRuleSaveRequest) => http.post<string>(`${RULE}/create`, data),
  update: (data: CourseGoalAssessmentRuleSaveRequest) => http.post<void>(`${RULE}/update`, data),
  delete: (id: string) => http.post<void>(`${RULE}/delete`, { id }),
}
