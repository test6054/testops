/**
 * 间接评价答卷 API - 对接 IndirectResponseController
 *
 * 后端路径：/api/quality/indirect-responses
 */
import type { AiTaskSubmitResponseVO } from './ai-task-trigger'
import type { RespondentType } from './types'
import type { SurveyChoiceOptionVO, SurveyRespondentIdentityItemVO } from '@/apis/public-survey'
import http from '@/config/axios'

const BASE = '/api/quality/indirect-responses'

export interface IndirectEvaluationResponseVO {
  id: string
  formId: string
  itemId: string
  respondentType: RespondentType
  respondentId?: string
  scaleValue?: number
  singleChoiceValue?: string
  answerSummary?: string
  multipleChoiceValues?: SurveyChoiceOptionVO[]
  identityValues?: SurveyRespondentIdentityItemVO[]
  convertedScore?: number
  openText?: string
  validFlag?: boolean
  invalidReason?: string
  receivedTime?: string
  submissionId?: string
  respondentName?: string
  respondentContact?: string
  submittedTime?: string
  createTime?: string
  updateTime?: string
}

export interface IndirectEvaluationResponseSaveRequest {
  id?: string
  formId: string
  itemId: string
  respondentType: RespondentType
  respondentId?: string
  scaleValue?: number
  singleChoiceValue?: string
  answerSummary?: string
  multipleChoiceValues?: SurveyChoiceOptionVO[]
  identityValues?: SurveyRespondentIdentityItemVO[]
  convertedScore?: number
  openText?: string
  validFlag?: boolean
  invalidReason?: string
  receivedTime?: string
}

export interface IndirectResponseImportResult {
  totalRows: number
  successCount: number
  skippedCount: number
  errors: IndirectResponseImportRowError[]
}

export interface IndirectResponseImportRowError {
  rowIndex: number
  itemCode: string
  errorMessage: string
}

/**
 * 后端 IndirectResponseDocumentExtractionVO 投影。
 */
export interface IndirectResponseDocumentExtraction {
  formId: string
  fileName: string
  extraction: MarkDocumentExtractionResult
}

export interface MarkDocumentExtractionResult {
  fullText?: string
  pages?: MarkDocumentPageText[]
  ocrBlocks?: MarkDocumentOcrBlock[]
  diagnostic?: MarkDocumentExtractionDiagnostic
}

export interface MarkDocumentPageText {
  pageIndex?: number
  charCount?: number
  text?: string
}

export interface MarkDocumentOcrBlock {
  pageIndex?: number
  providerType?: string
  recognizedText?: string
  engineTraceId?: string
  diagnostic?: string
}

export interface MarkDocumentExtractionDiagnostic {
  mimeType?: string
  fileExtension?: string
  pageCount?: number
  textCharCount?: number
  ocrPageIndices?: number[]
  costMillis?: number
  warningMessages?: string[]
}

export const indirectResponseApi = {
  listByForm: (formId: string) =>
    http.post<IndirectEvaluationResponseVO[]>(`${BASE}/list-by-form`, { id: formId }),
  listByItem: (itemId: string) =>
    http.post<IndirectEvaluationResponseVO[]>(`${BASE}/list-by-item`, { id: itemId }),
  detail: (id: string) => http.post<IndirectEvaluationResponseVO>(`${BASE}/detail`, { id }),
  create: (data: IndirectEvaluationResponseSaveRequest) =>
    http.post<string>(`${BASE}/create`, data),
  update: (data: IndirectEvaluationResponseSaveRequest) =>
    http.post<void>(`${BASE}/update`, data),
  delete: (id: string) => http.post<void>(`${BASE}/delete`, { id }),
  /** 统计某题项的有效样本数（用于覆盖率计算） */
  countValidByItem: (itemId: string) =>
    http.post<number>(`${BASE}/count-valid-by-item`, { id: itemId }),
  /** Excel 批量导入答卷 */
  importExcel: (formId: string, file: File) => {
    const formData = new FormData()
    formData.append('formId', formId)
    formData.append('file', file)
    return http.post<IndirectResponseImportResult>(`${BASE}/import-excel`, formData)
  },
  /**
   * 从 PDF / DOCX / 图片中抽取答卷文本（同步）。
   * 后端走 edu-mark 统一文档抽取服务（图片 OCR + PDF 文本 + 扫描页 OCR）。
   * 返回结构化文本，由前端展示给教师对照上传文档手工录入答卷。
   */
  importDocument: (formId: string, file: File) => {
    const formData = new FormData()
    formData.append('formId', formId)
    formData.append('file', file)
    return http.post<IndirectResponseDocumentExtraction>(`${BASE}/import-document`, formData)
  },
  /**
   * AI 异步文档解析导入答卷。
   * 上传文件 -> 创建 PENDING 状态 AI 任务 -> 立即返回 taskId。
   * 后台异步：下载文件 -> 文本提取 -> AI 解析 -> 写入答卷草稿。
   * 前端通过轮询 aiTaskApi.detail 跟踪进度。
   */
  importDocumentAi: (formId: string, file: File) => {
    const formData = new FormData()
    formData.append('formId', formId)
    formData.append('file', file)
    return http.post<AiTaskSubmitResponseVO>(`${BASE}/import-document-ai`, formData)
  },
}
