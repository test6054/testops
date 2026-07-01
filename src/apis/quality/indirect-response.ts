/**
 * 间接评价答卷 API - 对接 IndirectResponseController
 *
 * 后端路径：/api/quality/indirect-responses
 */
import type { AiTaskSubmitResponseVO } from './ai-task-trigger'
import type { SurveyChoiceOptionVO, SurveyRespondentIdentityItemVO } from '@/apis/public-survey'
import type { RespondentType } from '@/types/enums/respondent-type-enum'
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
  validFlag?: boolean | null
  invalidReason?: string
  conversionPending?: boolean
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
  clearConvertedScore?: boolean
  openText?: string
  validFlag?: boolean | null
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
  countPendingConversionByItem: (itemId: string) =>
    http.post<number>(`${BASE}/count-pending-conversion-by-item`, { id: itemId }),
  /**
   * 从 PDF / DOCX / 图片中同步抽取答卷文本（不写库，供对照手工录入）。
   * 配合 ImportResponseDocumentModal「仅抽取文本」模式；批量结构化仍走 Excel。
   */
  importDocument: (formId: string, sourceFileId: string) =>
    http.post<IndirectResponseDocumentExtraction>(`${BASE}/import-document`, {
      formId,
      sourceFileId,
    }),
  /**
   * AI 异步文档解析导入答卷。
   * 前端 platform stage 后提交 sourceFileId → 创建 PENDING 状态 AI 任务 → 立即返回 taskId。
   */
    importDocumentAi: (formId: string, sourceFileId: string) =>
    http.post<AiTaskSubmitResponseVO>(`${BASE}/import-document-ai`, {
      formId,
      sourceFileId,
    }),
}

export { RespondentType } from '@/types/enums/respondent-type-enum'
