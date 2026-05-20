import type { AchievementTargetType, RespondentType } from './types'
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

export interface IndirectEvaluationFormVO {
  id: string
  formCode: string
  formName: string
  formType: string
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
  requireIdentityFields?: string
  maxSubmissionsPerRespondent?: number
  welcomeMessage?: string
  thankYouMessage?: string
  createTime?: string
  updateTime?: string
}

export interface IndirectEvaluationFormSavePayload {
  id?: string
  formCode: string
  formName: string
  formType: string
  targetType: AchievementTargetType
  targetId: string
  programId?: string
  description?: string
  expectedSample?: number
  enabled?: boolean
}

export interface IndirectEvaluationFormQueryPayload extends QueryDto {
  formType?: string
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
  itemType?: string
  scaleMin?: number
  scaleMax?: number
  scaleLabels?: string
  choiceOptions?: string
  required?: boolean
  createTime?: string
  updateTime?: string
}

export interface IndirectEvaluationItemSavePayload {
  id?: string
  formId: string
  itemCode: string
  itemText: string
  targetType: AchievementTargetType
  targetId: string
  scaleRuleId?: string
  weight?: number
  sortOrder?: number
  itemType?: string
  scaleMin?: number
  scaleMax?: number
  scaleLabels?: string
  choiceOptions?: string
  required?: boolean
}

export interface IndirectEvaluationResponseVO {
  id: string
  formId: string
  itemId: string
  respondentType: RespondentType
  respondentId?: string
  rawValue?: string
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

export interface IndirectEvaluationResponseSavePayload {
  id?: string
  formId: string
  itemId: string
  respondentType: RespondentType
  respondentId?: string
  rawValue?: string
  convertedScore?: number
  openText?: string
  validFlag?: boolean
  invalidReason?: string
  receivedAt?: string
}

export interface IndirectEvaluationFormPublishPayload {
  id: string
  startTime: string
  endTime: string
  accessMode?: string
  allowAnonymous?: boolean
  requireIdentityFields?: string
  maxSubmissionsPerRespondent?: number
  welcomeMessage?: string
  thankYouMessage?: string
}

export interface IndirectEvaluationProgressVO {
  formId: string
  formName: string
  status: string
  submissionCount: number
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
  distribution?: Record<string, number>
  convertedScore?: number
}

export const indirectFormApi = {
  page: (data: IndirectEvaluationFormQueryPayload) =>
    http.post<PageResult<IndirectEvaluationFormVO>>(`${FORM}/page`, data),
  detail: (id: string) =>
    http.post<IndirectEvaluationFormVO>(`${FORM}/detail`, { id }),
  create: (data: IndirectEvaluationFormSavePayload) =>
    http.post<string>(`${FORM}/create`, data),
  update: (data: IndirectEvaluationFormSavePayload) =>
    http.post<void>(`${FORM}/update`, data),
  delete: (id: string) =>
    http.post<void>(`${FORM}/delete`, { id }),
  publish: (data: IndirectEvaluationFormPublishPayload) =>
    http.post<{ accessToken: string; publicUrl: string }>(`${FORM}/publish`, data),
  close: (id: string) =>
    http.post<void>(`${FORM}/close`, { id }),
  progress: (id: string) =>
    http.post<IndirectEvaluationProgressVO>(`${FORM}/progress`, { id }),
  statistics: (id: string) =>
    http.post<IndirectEvaluationStatisticsVO>(`${FORM}/statistics`, { id }),
}

export const indirectItemApi = {
  listByForm: (formId: string) =>
    http.post<IndirectEvaluationItemVO[]>(`${ITEM}/list-by-form`, { id: formId }),
  listByTarget: (targetType: AchievementTargetType, targetId: string) =>
    http.post<IndirectEvaluationItemVO[]>(`${ITEM}/list-by-target`, { targetType, targetId }),
  detail: (id: string) =>
    http.post<IndirectEvaluationItemVO>(`${ITEM}/detail`, { id }),
  create: (data: IndirectEvaluationItemSavePayload) =>
    http.post<string>(`${ITEM}/create`, data),
  update: (data: IndirectEvaluationItemSavePayload) =>
    http.post<void>(`${ITEM}/update`, data),
  delete: (id: string) =>
    http.post<void>(`${ITEM}/delete`, { id }),
}

export const indirectResponseApi = {
  listByForm: (formId: string) =>
    http.post<IndirectEvaluationResponseVO[]>(`${RESPONSE}/list-by-form`, { id: formId }),
  listByItem: (itemId: string) =>
    http.post<IndirectEvaluationResponseVO[]>(`${RESPONSE}/list-by-item`, { id: itemId }),
  detail: (id: string) =>
    http.post<IndirectEvaluationResponseVO>(`${RESPONSE}/detail`, { id }),
  create: (data: IndirectEvaluationResponseSavePayload) =>
    http.post<string>(`${RESPONSE}/create`, data),
  /** 按问卷批量录入答卷 */
  batchCreate: (formId: string, responses: IndirectEvaluationResponseSavePayload[]) =>
    http.post<void>(`${RESPONSE}/batch-create`, { formId, responses }),
  update: (data: IndirectEvaluationResponseSavePayload) =>
    http.post<void>(`${RESPONSE}/update`, data),
  delete: (id: string) =>
    http.post<void>(`${RESPONSE}/delete`, { id }),
  /** 统计某题项的有效样本数（用于覆盖率计算） */
  countValidByItem: (itemId: string) =>
    http.post<number>(`${RESPONSE}/count-valid-by-item`, { id: itemId }),
  /** Excel 批量导入答卷 */
  importExcel: (formId: string, file: File) => {
    const formData = new FormData()
    formData.append('formId', formId)
    formData.append('file', file)
    return http.post<IndirectResponseImportResult>(`${RESPONSE}/import-excel`, formData)
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
