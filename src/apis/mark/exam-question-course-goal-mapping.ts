import http from '@/config/axios'

const BASE = '/api/mark/exams/question-course-goal-mappings'

export interface ExamQuestionCourseGoalMappingVO {
  id: string
  examId: string
  questionTemplateId: string
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

export interface ExamQuestionCourseGoalMappingSaveRequest {
  id?: string
  examId: string
  questionTemplateId: string
  qualityCourseGoalId: string
  weight: number
}

export interface ExamQuestionCourseGoalMappingDeleteRequest {
  id: string
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
