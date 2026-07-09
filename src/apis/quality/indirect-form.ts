/**
 * 间接评价问卷 API - 对接 IndirectFormController
 *
 * 后端路径：/api/quality/indirect-forms
 */
import type {
  AchievementTargetTypeCode,
  IndirectFormAccessModeCode,
  IndirectFormStatusCode,
  IndirectFormTypeCode,
} from './types'
import type { SurveyIdentityFieldRequest, SurveyIdentityFieldVO } from '@/apis/public-survey'
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

const BASE = '/api/quality/indirect-forms'

export interface IndirectEvaluationFormVO {
  id: string
  formCode: string
  formName: string
  formType: IndirectFormTypeCode
  targetType: AchievementTargetTypeCode
  targetId: string
  programId?: string
  description?: string
  expectedSample?: number
  enabled?: boolean
  status?: IndirectFormStatusCode
  accessToken?: string
  startTime?: string
  endTime?: string
  accessMode?: IndirectFormAccessModeCode
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
  formType: IndirectFormTypeCode
  targetType: AchievementTargetTypeCode
  targetId: string
  programId?: string
  description?: string
  expectedSample?: number
  enabled?: boolean
}

export interface IndirectEvaluationFormQueryRequest extends QueryDto {
  formType?: IndirectFormTypeCode
  targetType?: AchievementTargetTypeCode
  targetId?: string
  programId?: string
  enabled?: boolean
}

export interface IndirectEvaluationFormPublishRequest {
  id: string
  startTime: string
  endTime: string
  accessMode: IndirectFormAccessModeCode
  allowAnonymous?: boolean
  requireIdentityFields?: SurveyIdentityFieldRequest[]
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
  status: IndirectFormStatusCode
  submissionCount: number
  validCount: number
  itemCount?: number
  receivedResponseCount?: number
  expectedResponseCount?: number
  scoredResponseCount?: number
  pendingConversionCount?: number
  noSubstantiveCount?: number
  expectedSample?: number
  completionRate?: number
  responseCollectionRate?: number
  startTime?: string
  endTime?: string
}

export interface IndirectEvaluationStatisticsVO {
  /** 有效回收答卷总数，与 progress.receivedResponseCount 口径一致 */
  overallSampleCount: number
  overallScore?: number
  overallScoredCount?: number
  pendingConversionCount?: number
  noSubstantiveCount?: number
}

export interface IndirectEvaluationFormItemStatisticsQueryRequest extends QueryDto {
  formId: string
}

export interface IndirectEvaluationItemStatisticsVO {
  itemId: string
  itemCode: string
  itemText: string
  targetType: AchievementTargetTypeCode
  targetId: string
  sampleCount: number
  validCount: number
  scoredCount?: number
  pendingConversionCount?: number
  noSubstantiveCount?: number
  mean?: number
  median?: number
  stdDev?: number
  distributionBuckets?: IndirectEvaluationScaleDistributionBucketVO[]
  openTextSummaries?: IndirectEvaluationOpenTextSummaryVO[]
  convertedScore?: number
}

export interface IndirectEvaluationScaleDistributionBucketVO {
  scaleValue?: number
  label?: string
  count: number
  ratio?: number
}

export interface IndirectEvaluationOpenTextSummaryVO {
  content: string
  count: number
}

export const indirectFormApi = {
  page: (data: IndirectEvaluationFormQueryRequest) =>
    http.post<PageResult<IndirectEvaluationFormVO>>(`${BASE}/page`, data),
  detail: (id: string) => http.post<IndirectEvaluationFormVO>(`${BASE}/detail`, { id }),
  create: (data: IndirectEvaluationFormSaveRequest) => http.post<string>(`${BASE}/create`, data),
  update: (data: IndirectEvaluationFormSaveRequest) => http.post<void>(`${BASE}/update`, data),
  delete: (id: string) => http.post<void>(`${BASE}/delete`, { id }),
  publish: (data: IndirectEvaluationFormPublishRequest) =>
    http.post<IndirectEvaluationPublishResultVO>(`${BASE}/publish`, data),
  close: (id: string) => http.post<void>(`${BASE}/close`, { id }),
  progress: (id: string) => http.post<IndirectEvaluationProgressVO>(`${BASE}/progress`, { id }),
  statistics: (id: string) =>
    http.post<IndirectEvaluationStatisticsVO>(`${BASE}/statistics`, { id }),
  statisticsItemPage: (data: IndirectEvaluationFormItemStatisticsQueryRequest) =>
    http.post<PageResult<IndirectEvaluationItemStatisticsVO>>(`${BASE}/statistics-item-page`, data),
}
