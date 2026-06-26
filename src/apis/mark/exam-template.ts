/**
 * 阅卷考试试卷模板 API - 对接 /api/mark/exams/template 与答题卡模板接口。
 */
import type { AxiosResponse } from 'axios'
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

/** 试卷模板未配置业务码 - 与后端 ResultCodeEnum.EXAM_MARK_PAPER_TEMPLATE_NOT_CONFIGURED 对齐 */
export const PAPER_TEMPLATE_NOT_CONFIGURED_CODE = 20014

/** Axios 拦截器抛出的后端业务错误对象 */
type MarkBusinessError = Error & {
  code?: number | string
  response?: AxiosResponse<ResultInfo<null>>
}

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
  templateId: string
  examId: string
  templateName: string
  totalPages: number
  status: EffectiveStatusCode
  pages: ExamPaperPageTemplateVO[]
  questions: ExamQuestionTemplateVO[]
  subjectiveAnonymityMode: AnonymityModeCode
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

/** 试卷模板响应合同校验，缺页、缺题或状态枚举异常时显式失败。 */
function validateExamTemplateContract(record: ExamTemplateVO): ExamTemplateVO {
  assertUserFacingText(record.templateId, EXAM_TEMPLATE_DATA_ERROR)
  assertUserFacingText(record.examId, EXAM_TEMPLATE_DATA_ERROR)
  assertUserFacingText(record.templateName, EXAM_TEMPLATE_DATA_ERROR)
  assertUserFacingFiniteNumber(record.totalPages, EXAM_TEMPLATE_DATA_ERROR)
  strictEnumLabel(EFFECTIVE_STATUS_LABEL, record.status, '试卷模板生效状态')
  strictEnumLabel(ANONYMITY_MODE_LABEL, record.subjectiveAnonymityMode, '主观题匿名模式')
  if (!Array.isArray(record.pages)) {
    throw new TypeError(EXAM_TEMPLATE_DATA_ERROR)
  }
  if (!Array.isArray(record.questions)) {
    throw new TypeError(EXAM_TEMPLATE_DATA_ERROR)
  }
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

/** 查询考试当前模板，模板未配置时由后端业务码表达。 */
export async function getExamTemplate(examId: string): Promise<ExamTemplateVO> {
  const record = await http.post<ExamTemplateVO>('/api/mark/exams/template', { examId })
  return validateExamTemplateContract(record)
}

/** 判断后端是否返回“试卷模板尚未配置”业务态，只读取稳定 code。 */
export function isPaperTemplateNotConfiguredError(error: MarkBusinessError): boolean {
  const code = error.code ?? error.response?.data.code
  return Number(code) === PAPER_TEMPLATE_NOT_CONFIGURED_CODE
}
