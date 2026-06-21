/**
 * 间接评价问卷 API - 对接 IndirectFormController
 *
 * 后端路径：/api/quality/indirect-forms
 */
import type {
  AchievementTargetType,
  IndirectFormAccessMode,
  IndirectFormStatus,
  IndirectFormType,
} from './types'
import type { SurveyIdentityFieldVO } from '@/apis/public-survey'
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

const BASE = '/api/quality/indirect-forms'

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
  status?: IndirectFormStatus
  accessToken?: string
  startTime?: string
  endTime?: string
  accessMode?: IndirectFormAccessMode
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

export interface IndirectEvaluationFormPublishRequest {
  id: string
  startTime: string
  endTime: string
  accessMode: IndirectFormAccessMode
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
}
