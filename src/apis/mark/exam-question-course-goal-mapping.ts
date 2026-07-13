import type { ExamQuestionCourseGoalMappingStatusCode } from '@/types/enums/exam-question-course-goal-mapping-status-enum'
import http from '@/config/axios'

const BASE = '/api/mark/exams/question-course-goal-mappings'

export interface ExamQuestionCourseGoalMappingVO {
  id: string
  examId: string
  layoutQuestionId: string
  qualityCourseGoalId: string
  weight: number
  questionNo?: string
  questionType?: string
  questionFullScore?: number
  goalCode?: string
  goalName?: string
}

export interface QualityCourseGoalForMarkVO {
  goalId: string
  qualityCourseId: string
  goalCode: string
  goalName: string
  thresholdValue?: number
  aggregation?: string
  directWeight?: number
}

export interface CourseObjectiveMappingReadinessVO {
  totalQuestionCount?: number
  mappedQuestionCount?: number
  totalGoalCount?: number
  coveredGoalCount?: number
  reportReady?: boolean
}

export interface ExamQuestionCourseGoalMappingWorkspaceRowVO {
  layoutQuestionId: string
  questionNo: string
  questionType?: string
  questionStem?: string
  questionFullScore?: number
  sortNo?: number
  mappingId?: string
  qualityCourseGoalId?: string
  goalCode?: string
  goalName?: string
  goalThresholdValue?: number
  weight?: number
  weightedScoreContribution?: number
  mappingStatus: ExamQuestionCourseGoalMappingStatusCode
  updateTime?: string
}

export interface ExamQuestionCourseGoalMappingWorkspaceVO {
  courseGoalConfigured?: boolean
  readiness?: CourseObjectiveMappingReadinessVO
  courseGoals: QualityCourseGoalForMarkVO[]
  rows: ExamQuestionCourseGoalMappingWorkspaceRowVO[]
}

export interface ExamQuestionCourseGoalMappingSaveRequest {
  id?: string
  examId: string
  layoutQuestionId: string
  qualityCourseGoalId: string
  weight: number
}

export interface ExamQuestionCourseGoalMappingDeleteRequest {
  id: string
}

export function loadExamQuestionCourseGoalMappingWorkspace(
  examId: string,
): Promise<ExamQuestionCourseGoalMappingWorkspaceVO> {
  return http.post<ExamQuestionCourseGoalMappingWorkspaceVO>(`${BASE}/workspace`, { examId })
}

export function listExamQuestionCourseGoalMappings(
  examId: string,
): Promise<ExamQuestionCourseGoalMappingVO[]> {
  return http.post<ExamQuestionCourseGoalMappingVO[]>(`${BASE}/list`, { examId })
}

export function listExamCourseGoalsForMapping(
  examId: string,
): Promise<QualityCourseGoalForMarkVO[]> {
  return http.post<QualityCourseGoalForMarkVO[]>(`${BASE}/course-goals/list`, { examId })
}

export function saveExamQuestionCourseGoalMapping(
  request: ExamQuestionCourseGoalMappingSaveRequest,
): Promise<string> {
  return http.post<string>(`${BASE}/save`, request)
}

export function deleteExamQuestionCourseGoalMapping(
  request: ExamQuestionCourseGoalMappingDeleteRequest,
): Promise<void> {
  return http.post<void>(`${BASE}/delete`, request)
}
