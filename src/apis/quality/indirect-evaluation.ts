import type { AiTaskSubmitResponseVO } from './ai-task'
import type { AchievementTargetType, IndirectFormType, RespondentType } from './types'
import type {
  SurveyChoiceOptionVO,
  SurveyIdentityFieldVO,
  SurveyRespondentIdentityItemVO,
  SurveyScaleLabelVO,
} from '@/apis/public-survey'
/**
 * 间接评价 API - 问卷 + 题项 + 答卷
 *
 * 后端路径：
 * - /api/quality/indirect-forms       问卷表 CRUD
 * - /api/quality/indirect-items       题项 CRUD + list-by-target
 * - /api/quality/indirect-responses   答卷 CRUD + 批量录入 + 统计
 *
 * 设计文档 §7.7：间接评价是课程目标达成度中的 indirect 分量，
 * 需通过量表换算规则将原始量表值换算为 0~1 分值后参与聚合。
 */
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

const FORM = '/api/quality/indirect-forms'
const ITEM = '/api/quality/indirect-items'
const RESPONSE = '/api/quality/indirect-responses'

export type IndirectEvaluationItemType = 'SCALE' | 'SINGLE_CHOICE' | 'MULTI_CHOICE' | 'OPEN_TEXT'

export interface IndirectEvaluationFormVO {
  id: string
  formCode: string
  formName: string
  formType: IndirectFormType
  targetType: AchievementTargetType
  targetId: string
  programId?: string
  description?: string
  expectedSample?: number
  enabled: boolean
  status?: string
  accessToken?: string
  startTime?: string
  endTime?: string
  accessMode?: string
  allowAnonymous?: boolean
  requireIdentityFields?: SurveyIdentityFieldVO[]
  maxSubmissionsPerRespondent?: number
  welcomeMessage?: string
  thankYouMessage?: string
  createTime?: string
  updateTime?: string
}

export interface IndirectEvaluationFormSaveRequest {
  id?: string
  formCode: string
  formName: string
  formType: IndirectFormType
  targetType: AchievementTargetType
  targetId: string
  programId?: string
  description?: string
  expectedSample?: number
  enabled?: boolean
}

export interface IndirectEvaluationFormQueryRequest extends QueryDto {
  formType?: IndirectFormType
  targetType?: AchievementTargetType
  targetId?: string
  programId?: string
  enabled?: boolean
}

export interface IndirectEvaluationItemVO {
  id: string
  formId: string
  itemCode: string
  itemText: string
  targetType: AchievementTargetType
  targetId: string
  scaleRuleId?: string
  weight?: number
  sortOrder?: number
  itemType: IndirectEvaluationItemType
  scaleMin?: number
  scaleMax?: number
  scaleLabels?: SurveyScaleLabelVO[]
  choiceOptions?: SurveyChoiceOptionVO[]
  required?: boolean
  createTime?: string
  updateTime?: string
}

export interface IndirectEvaluationItemSaveRequest {
  id?: string
  formId: string
  itemCode: string
  itemText: string
  targetType: AchievementTargetType
  targetId: string
  scaleRuleId?: string
  weight?: number
  sortOrder?: number
  itemType: IndirectEvaluationItemType
  scaleMin?: number
  scaleMax?: number
  scaleLabels?: SurveyScaleLabelVO[]
  choiceOptions?: SurveyChoiceOptionVO[]
  required?: boolean
}

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
  receivedAt?: string
  submissionId?: string
  respondentName?: string
  respondentContact?: string
  submittedAt?: string
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
  receivedAt?: string
}

export interface IndirectEvaluationFormPublishRequest {
  id: string
  startTime: string
  endTime: string
  accessMode: string
  allowAnonymous?: boolean
  requireIdentityFields?: SurveyIdentityFieldVO[]
  maxSubmissionsPerRespondent: number
  welcomeMessage?: string
  thankYouMessage?: string
}

export interface IndirectEvaluationPublishResultVO {
  accessToken: string
  publicUrl: string
}

export interface IndirectEvaluationProgressVO {
  formId: string
  formName: string
  status: string
  submissionCount: number
  validCount: number
  expectedSample?: number
  completionRate?: number
  startTime?: string
  endTime?: string
}

export interface IndirectEvaluationStatisticsVO {
  overallSampleCount: number
  overallScore?: number
  items: IndirectEvaluationItemStatistics[]
}

export interface IndirectEvaluationItemStatistics {
  itemId: string
  itemCode: string
  itemText: string
  targetType: string
  targetId: string
  sampleCount: number
  validCount: number
  mean?: number
  median?: number
  stdDev?: number
  distributionBuckets?: ScaleDistributionBucketVO[]
  openTextSummaries?: OpenTextSummaryVO[]
  convertedScore?: number
}

export interface ScaleDistributionBucketVO {
  scaleValue?: number
  label?: string
  count: number
  ratio?: number
}

export interface OpenTextSummaryVO {
  content: string
  count: number
}

export const indirectFormApi = {
  page: (data: IndirectEvaluationFormQueryRequest) =>
    http.post<PageResult<IndirectEvaluationFormVO>>(`${FORM}/page`, data),
  detail: (id: string) => http.post<IndirectEvaluationFormVO>(`${FORM}/detail`, { id }),
  create: (data: IndirectEvaluationFormSaveRequest) => http.post<string>(`${FORM}/create`, data),
  update: (data: IndirectEvaluationFormSaveRequest) => http.post<void>(`${FORM}/update`, data),
  delete: (id: string) => http.post<void>(`${FORM}/delete`, { id }),
  publish: (data: IndirectEvaluationFormPublishRequest) =>
    http.post<IndirectEvaluationPublishResultVO>(`${FORM}/publish`, data),
  close: (id: string) => http.post<void>(`${FORM}/close`, { id }),
  progress: (id: string) => http.post<IndirectEvaluationProgressVO>(`${FORM}/progress`, { id }),
  statistics: (id: string) =>
    http.post<IndirectEvaluationStatisticsVO>(`${FORM}/statistics`, { id }),
}

export const indirectItemApi = {
  listByForm: (formId: string) =>
    http.post<IndirectEvaluationItemVO[]>(`${ITEM}/list-by-form`, { id: formId }),
  listByTarget: (targetType: AchievementTargetType, targetId: string) =>
    http.post<IndirectEvaluationItemVO[]>(`${ITEM}/list-by-target`, { targetType, targetId }),
  detail: (id: string) => http.post<IndirectEvaluationItemVO>(`${ITEM}/detail`, { id }),
  create: (data: IndirectEvaluationItemSaveRequest) => http.post<string>(`${ITEM}/create`, data),
  update: (data: IndirectEvaluationItemSaveRequest) => http.post<void>(`${ITEM}/update`, data),
  delete: (id: string) => http.post<void>(`${ITEM}/delete`, { id }),
}

export const indirectResponseApi = {
  listByForm: (formId: string) =>
    http.post<IndirectEvaluationResponseVO[]>(`${RESPONSE}/list-by-form`, { id: formId }),
  listByItem: (itemId: string) =>
    http.post<IndirectEvaluationResponseVO[]>(`${RESPONSE}/list-by-item`, { id: itemId }),
  detail: (id: string) => http.post<IndirectEvaluationResponseVO>(`${RESPONSE}/detail`, { id }),
  create: (data: IndirectEvaluationResponseSaveRequest) =>
    http.post<string>(`${RESPONSE}/create`, data),
  update: (data: IndirectEvaluationResponseSaveRequest) =>
    http.post<void>(`${RESPONSE}/update`, data),
  delete: (id: string) => http.post<void>(`${RESPONSE}/delete`, { id }),
  /** 统计某题项的有效样本数（用于覆盖率计算） */
  countValidByItem: (itemId: string) =>
    http.post<string>(`${RESPONSE}/count-valid-by-item`, { id: itemId }),
  /** Excel 批量导入答卷 */
  importExcel: (formId: string, file: File) => {
    const formData = new FormData()
    formData.append('formId', formId)
    formData.append('file', file)
    return http.post<IndirectResponseImportResult>(`${RESPONSE}/import-excel`, formData)
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
    return http.post<IndirectResponseDocumentExtraction>(`${RESPONSE}/import-document`, formData)
  },
  /**
   * AI 异步文档解析导入答卷。
   * 上传文件 → 创建 PENDING 状态 AI 任务 → 立即返回 taskId。
   * 后台异步：下载文件 → 文本提取 → AI 解析 → 写入答卷草稿。
   * 前端通过轮询 aiTaskApi.detail 跟踪进度。
   */
  importDocumentAi: (formId: string, file: File) => {
    const formData = new FormData()
    formData.append('formId', formId)
    formData.append('file', file)
    return http.post<AiTaskSubmitResponseVO>(`${RESPONSE}/import-document-ai`, formData)
  },
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
