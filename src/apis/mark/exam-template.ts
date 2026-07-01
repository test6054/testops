/**
 * 阅卷考试试卷模板 API - 对接 /api/mark/exams/template 与答题卡模板接口。
 */
import type { AnonymityModeCode } from './anonymity-mode'
import type { EffectiveStatusCode } from './effective-status'
import type { QuestionTypeCode } from './question-type'
import http from '@/config/axios'
import { assertUserFacingFiniteNumber, assertUserFacingText } from '@/utils/contract-guard'
import { strictEnumLabel } from '@/utils/strict-enum'
import { ANONYMITY_MODE_LABEL } from './anonymity-mode'
import { EFFECTIVE_STATUS_LABEL } from './effective-status'
import { QUESTION_TYPE_LABEL } from './question-type'

const EXAM_TEMPLATE_DATA_ERROR = '试卷模板数据异常，请刷新后重试'

/** 页面模板项 - 对应 ExamPageTemplateRequest */
export interface ExamPageTemplateRequest {
  pageNo: number
  templateFileId?: string
  widthPx?: number
  heightPx?: number
}

/** 题目模板项 - 对应 ExamQuestionTemplateRequest */
export interface ExamQuestionTemplateRequest {
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
  /**
   * 题干文本：教师制卷阶段录入或母版 PDF / 扫描页 OCR 提取。
   * AI 评分联动使用本字段圈定评分范围，缺失时后端按 QUESTION_CONTEXT_MISSING 阻断。
   */
  questionStem?: string
}

/** 试卷模板保存请求 - 对应 ExamTemplateSaveRequest */
export interface ExamTemplateSaveRequest {
  examId: string
  templateName: string
  totalPages: number
  pages: ExamPageTemplateRequest[]
  questions: ExamQuestionTemplateRequest[]
  subjectiveAnonymityMode?: AnonymityModeCode
}

/** 答题卡页面模板保存请求 - 对应 ExamAnswerSheetTemplateSaveRequest */
export interface ExamAnswerSheetTemplateSaveRequest {
  examId: string
  templateName: string
  totalPages: number
  pages: ExamPageTemplateRequest[]
}

/** 页面模板响应 - 对应 ExamPaperPageTemplateResponse */
export interface ExamPaperPageTemplateVO {
  pageTemplateId: string
  pageNo: number
  templateFileId?: string
  widthPx?: number
  heightPx?: number
}

/** 题目模板响应 - 对应 ExamQuestionTemplateResponse */
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
  /** 题干文本 */
  questionStem?: string
}

/** 模板查询响应 - 对应 ExamTemplateResponse */
export interface ExamTemplateVO {
  /** 是否已配置试卷模板 */
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

/** 试卷页面模板合同校验，确保页面与文件尺寸字段由后端完整返回。 */
function validateExamPaperPageTemplateContract(record: ExamPaperPageTemplateVO): void {
  assertUserFacingText(record.pageTemplateId, EXAM_TEMPLATE_DATA_ERROR)
  assertUserFacingFiniteNumber(record.pageNo, EXAM_TEMPLATE_DATA_ERROR)
  assertUserFacingText(record.templateFileId, EXAM_TEMPLATE_DATA_ERROR)
  assertUserFacingFiniteNumber(record.widthPx, EXAM_TEMPLATE_DATA_ERROR)
  assertUserFacingFiniteNumber(record.heightPx, EXAM_TEMPLATE_DATA_ERROR)
}

/** 试卷题目模板合同校验，确保题号、题型、满分和排序字段可直接驱动批阅链路。 */
function validateExamQuestionTemplateContract(record: ExamQuestionTemplateVO): void {
  assertUserFacingText(record.questionTemplateId, EXAM_TEMPLATE_DATA_ERROR)
  assertUserFacingText(record.questionNo, EXAM_TEMPLATE_DATA_ERROR)
  strictEnumLabel(QUESTION_TYPE_LABEL, record.questionType, '题型')
  assertUserFacingFiniteNumber(record.fullScore, EXAM_TEMPLATE_DATA_ERROR)
  assertUserFacingFiniteNumber(record.sortNo, EXAM_TEMPLATE_DATA_ERROR)
}

/** 已配置试卷模板的响应合同校验。 */
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

/** 保存试卷模板（含页面 + 题目），全量替换。 */
export function saveExamTemplate(request: ExamTemplateSaveRequest): Promise<string> {
  return http.post<string>('/api/mark/exams/template/save', request)
}

/** 保存答题卡页面模板（只替换页面配置，不修改题目结构）。 */
export function saveAnswerSheetTemplate(
  request: ExamAnswerSheetTemplateSaveRequest,
): Promise<string> {
  return http.post<string>('/api/mark/exams/answer-sheet-template/save', request)
}

/** 查询考试当前模板；未配置时返回 configured=false 的空壳，不触发业务错误。 */
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
