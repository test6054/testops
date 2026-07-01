/**
 * 考试制卷摘要查询 API — 对接 POST /api/mark/exams/template（layout 域只读摘要）。
 */
import type { AnonymityModeCode } from './anonymity-mode'
import { ANONYMITY_MODE_LABEL } from './anonymity-mode'
import type { EffectiveStatusCode } from './effective-status'
import { EFFECTIVE_STATUS_LABEL } from './effective-status'
import type { QuestionTypeCode } from './question-type'
import { QUESTION_TYPE_LABEL } from './question-type'
import http from '@/config/axios'
import { assertUserFacingFiniteNumber, assertUserFacingText } from '@/utils/contract-guard'
import { strictEnumLabel } from '@/utils/strict-enum'

const EXAM_TEMPLATE_DATA_ERROR = '试卷模板数据异常，请刷新后重试'

export interface ExamPaperPageTemplateVO {
  pageTemplateId: string
  pageNo: number
  templateFileId?: string
  widthPx?: number
  heightPx?: number
}

export interface ExamQuestionTemplateVO {
  questionTemplateId: string
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

export interface ExamTemplateVO {
  configured: boolean
  examId: string
  templateId?: string
  templateName?: string
  totalPages?: number
  status?: EffectiveStatusCode
  pages: ExamPaperPageTemplateVO[]
  questions: ExamQuestionTemplateVO[]
  subjectiveAnonymityMode?: AnonymityModeCode
}

function validateExamPaperPageTemplateContract(record: ExamPaperPageTemplateVO): void {
  assertUserFacingText(record.pageTemplateId, EXAM_TEMPLATE_DATA_ERROR)
  assertUserFacingFiniteNumber(record.pageNo, EXAM_TEMPLATE_DATA_ERROR)
  assertUserFacingText(record.templateFileId, EXAM_TEMPLATE_DATA_ERROR)
  assertUserFacingFiniteNumber(record.widthPx, EXAM_TEMPLATE_DATA_ERROR)
  assertUserFacingFiniteNumber(record.heightPx, EXAM_TEMPLATE_DATA_ERROR)
}

function validateExamQuestionTemplateContract(record: ExamQuestionTemplateVO): void {
  assertUserFacingText(record.questionTemplateId, EXAM_TEMPLATE_DATA_ERROR)
  assertUserFacingText(record.questionNo, EXAM_TEMPLATE_DATA_ERROR)
  strictEnumLabel(QUESTION_TYPE_LABEL, record.questionType, '题型')
  assertUserFacingFiniteNumber(record.fullScore, EXAM_TEMPLATE_DATA_ERROR)
  assertUserFacingFiniteNumber(record.sortNo, EXAM_TEMPLATE_DATA_ERROR)
}

function validateConfiguredExamTemplate(record: ExamTemplateVO): ExamTemplateVO {
  assertUserFacingText(record.templateId, EXAM_TEMPLATE_DATA_ERROR)
  assertUserFacingText(record.templateName, EXAM_TEMPLATE_DATA_ERROR)
  assertUserFacingFiniteNumber(record.totalPages, EXAM_TEMPLATE_DATA_ERROR)
  strictEnumLabel(EFFECTIVE_STATUS_LABEL, record.status, '试卷模板生效状态')
  strictEnumLabel(ANONYMITY_MODE_LABEL, record.subjectiveAnonymityMode, '主观题匿名模式')
  record.pages.forEach(validateExamPaperPageTemplateContract)
  record.questions.forEach(validateExamQuestionTemplateContract)
  return record
}

export async function getExamTemplate(examId: string): Promise<ExamTemplateVO> {
  const record = await http.post<ExamTemplateVO>('/api/mark/exams/template', { examId })
  assertUserFacingText(record.examId, EXAM_TEMPLATE_DATA_ERROR)
  if (record.configured !== true) {
    return {
      configured: false,
      examId: record.examId,
      pages: [],
      questions: [],
    }
  }
  return validateConfiguredExamTemplate({
    ...record,
    configured: true,
    pages: record.pages ?? [],
    questions: record.questions ?? [],
  })
}
