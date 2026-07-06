/**
 * 考试制卷摘要查询 API — 对接 POST /api/mark/exams/layout-question/summary（layout 域只读摘要）。
 */
import type { AnonymityModeCode } from './anonymity-mode'
import type { EffectiveStatusCode } from './effective-status'
import type { QuestionTypeCode } from './question-type'
import http from '@/config/axios'

export interface ExamPaperPageTemplateResponse {
  pageTemplateId: string
  pageNo: number
  templateFileId?: string
  widthPx?: number
  heightPx?: number
}

export interface ExamLayoutQuestionViewResponse {
  layoutQuestionId: string
  questionNo: string
  questionType: QuestionTypeCode
  fullScore: number
  pageNo?: number
  x?: number
  y?: number
  width?: number
  height?: number
  knowledgeId?: string
  sortNo?: number
  questionStem?: string
}

export interface ExamTemplateResponse {
  configured: boolean
  examId: string
  templateId?: string
  templateName?: string
  totalPages?: number
  status?: EffectiveStatusCode
  pages: ExamPaperPageTemplateResponse[]
  questions: ExamLayoutQuestionViewResponse[]
  subjectiveAnonymityMode?: AnonymityModeCode
}

export function getExamLayoutQuestionSummary(examId: string): Promise<ExamTemplateResponse> {
  return http.post<ExamTemplateResponse>('/api/mark/exams/layout-question/summary', { examId })
}
