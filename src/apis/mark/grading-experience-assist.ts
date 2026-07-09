import type { ExtendedAxiosRequestConfig } from '@/config/axios/types'
import type { PageResult, QueryDto } from '@/types'
import type { ExamKindCode } from '@/types/enums/exam-kind-enum'
import type { ExperienceRecommendationCode } from '@/types/enums/experience-recommendation-enum'
import type { GradingExperienceAssistPolicyStatusCode } from '@/types/enums/grading-experience-assist-policy-status-enum'
import type { GradingExperienceAssistQuestionResolutionCode } from '@/types/enums/grading-experience-assist-question-resolution-enum'
import type { GradingExperienceReferenceMatchModeCode } from '@/types/enums/grading-experience-reference-match-mode-enum'
import type { MarkingOrganizationStatusCode } from '@/types/enums/marking-organization-status-enum'
import http from '@/config/axios'

export {
  ALL_GRADING_EXPERIENCE_ASSIST_POLICY_STATUS_CODES,
  GradingExperienceAssistPolicyStatusCode,
  GradingExperienceAssistPolicyStatusDescription,
} from '@/types/enums/grading-experience-assist-policy-status-enum'

export interface MarkAiReferenceExperienceAuditResponse {
  referenceExperienceApplied?: boolean
  referenceExperienceSourceExamName?: string
  referenceExperienceConsistencyRate?: number
  referenceExperienceMatchMode?: GradingExperienceReferenceMatchModeCode
}

export interface MarkTenantGradingPolicyResponse {
  experienceAssistEnabled: boolean
  minConsistencyRate: number
  maxHammingDistance: number
  maxExperienceItems: number
  sourceExamKinds?: string
  requireSameCourse?: boolean
  requireEffectivenessEval?: boolean
  manualFinalScoreConfirmRequired: boolean
  delayedFinalScoreConfirmMinutes: number
}

export interface MarkTenantGradingPolicySaveRequest {
  experienceAssistEnabled: boolean
  minConsistencyRate: number
  maxHammingDistance: number
  maxExperienceItems: number
  sourceExamKinds?: string
  requireSameCourse?: boolean
  requireEffectivenessEval?: boolean
  manualFinalScoreConfirmRequired: boolean
  delayedFinalScoreConfirmMinutes: number
}

export interface ExamGradingExperienceAssistPolicyResponse {
  examId: string
  examKind?: ExamKindCode
  autoMatchSupported?: boolean
  policyStatus: GradingExperienceAssistPolicyStatusCode
  enabled?: boolean
  tenantExperienceAssistEnabled?: boolean
  effectiveMinConsistencyRate?: number
  effectiveMaxHammingDistance?: number
  effectiveMaxExperienceItems?: number
  enabledTime?: string
  frozenTime?: string
}

export interface ExamGradingExperienceAssistPolicyEnableRequest {
  examId: string
  minConsistencyRate: number
  maxHammingDistance: number
  maxExperienceItems: number
}

export type ExamGradingExperienceAssistPolicySaveRequest
  = ExamGradingExperienceAssistPolicyEnableRequest

export interface ExamQuestionExperienceAssistBindingResponse {
  id?: string
  examId: string
  layoutQuestionId: string
  questionNo?: string
  baselineReady?: boolean
  experienceCaseId?: string
  effectivenessEvalId?: string
  sourceExamName?: string
  experienceSummary?: string
  consistencyRate?: number
  boundTime?: string
  assistResolutionStatus?: GradingExperienceAssistQuestionResolutionCode
}

export interface GradingExperienceAssistCandidateResponse {
  experienceCaseId: string
  effectivenessEvalId: string
  sourceExamId: string
  sourceExamName?: string
  sourceExamNo?: string
  experienceSummary?: string
  consistencyRate?: number
  recommendation?: ExperienceRecommendationCode
}

export interface ExamQuestionExperienceAssistBindingPageRequest extends QueryDto {
  examId: string
  keyword?: string
  assistResolutionStatus?: GradingExperienceAssistQuestionResolutionCode
}

export interface ExamQuestionExperienceAssistBindingSaveRequest {
  examId: string
  layoutQuestionId: string
  experienceCaseId?: string
  effectivenessEvalId?: string
}

export interface GradingExperienceAssistReadinessQuestionResponse {
  layoutQuestionId: string
  questionNo?: string
  baselineReady?: boolean
  assistResolutionStatus?: GradingExperienceAssistQuestionResolutionCode
  readyForFormalMarking?: boolean
}

export interface GradingExperienceAssistReadinessResponse {
  examId: string
  tenantExperienceAssistEnabled?: boolean
  examPolicyEnabled?: boolean
  policyStatus?: GradingExperienceAssistPolicyStatusCode
  readyForFormalMarking?: boolean
  baselineMissingCount?: number
  assistUnresolvedCount?: number
  subjectiveQuestionCount?: number
  questions?: GradingExperienceAssistReadinessQuestionResponse[]
}

export interface MarkTenantGradingOpsExamRowResponse {
  examId: string
  examName: string
  examNo: string
  organizationStatus: MarkingOrganizationStatusCode
  examPolicyEnabled?: boolean
  pendingItemCount: number
  baselineMissingCount?: number
  assistUnresolvedCount?: number
  readyForFormalMarking?: boolean
}

export interface MarkTenantGradingOpsOverviewResponse {
  tenantPolicy: MarkTenantGradingPolicyResponse
  trialMarkingExamCount: number
  pendingExamCount: number
  totalPendingItemCount: number
  exams: MarkTenantGradingOpsExamRowResponse[]
}

export function getTenantGradingPolicy(
  config?: ExtendedAxiosRequestConfig,
): Promise<MarkTenantGradingPolicyResponse> {
  return http.get<MarkTenantGradingPolicyResponse>('/api/mark/admin/grading-policy/tenant', config)
}

export function saveTenantGradingPolicy(
  request: MarkTenantGradingPolicySaveRequest,
  config?: ExtendedAxiosRequestConfig,
): Promise<MarkTenantGradingPolicyResponse> {
  return http.post<MarkTenantGradingPolicyResponse>(
    '/api/mark/admin/grading-policy/tenant/save',
    request,
    config,
  )
}

export function getTenantGradingOpsOverview(
  config?: ExtendedAxiosRequestConfig,
): Promise<MarkTenantGradingOpsOverviewResponse> {
  return http.get<MarkTenantGradingOpsOverviewResponse>(
    '/api/mark/admin/grading-policy/tenant/ops-overview',
    config,
  )
}

export function getExamGradingExperienceAssistPolicy(
  examId: string,
  config?: ExtendedAxiosRequestConfig,
): Promise<ExamGradingExperienceAssistPolicyResponse> {
  return http.get<ExamGradingExperienceAssistPolicyResponse>(
    '/api/mark/exam/grading-experience-assist/policy',
    {
      ...config,
      params: { examId, ...(config?.params ?? {}) },
    },
  )
}

export function enableExamGradingExperienceAssistPolicy(
  request: ExamGradingExperienceAssistPolicyEnableRequest,
  config?: ExtendedAxiosRequestConfig,
): Promise<ExamGradingExperienceAssistPolicyResponse> {
  return http.post<ExamGradingExperienceAssistPolicyResponse>(
    '/api/mark/exam/grading-experience-assist/policy/enable',
    request,
    config,
  )
}

export function saveExamGradingExperienceAssistPolicy(
  request: ExamGradingExperienceAssistPolicySaveRequest,
  config?: ExtendedAxiosRequestConfig,
): Promise<ExamGradingExperienceAssistPolicyResponse> {
  return http.post<ExamGradingExperienceAssistPolicyResponse>(
    '/api/mark/exam/grading-experience-assist/policy/save',
    request,
    config,
  )
}

export function disableExamGradingExperienceAssistPolicy(
  examId: string,
  config?: ExtendedAxiosRequestConfig,
): Promise<ExamGradingExperienceAssistPolicyResponse> {
  return http.post<ExamGradingExperienceAssistPolicyResponse>(
    '/api/mark/exam/grading-experience-assist/policy/disable',
    { examId },
    config,
  )
}

export function getExamGradingExperienceAssistReadiness(
  examId: string,
  config?: ExtendedAxiosRequestConfig,
): Promise<GradingExperienceAssistReadinessResponse> {
  return http.get<GradingExperienceAssistReadinessResponse>(
    '/api/mark/exam/grading-experience-assist/policy/readiness',
    { ...config, params: { examId, ...(config?.params ?? {}) } },
  )
}

export function pageExamExperienceAssistBindings(
  request: ExamQuestionExperienceAssistBindingPageRequest,
  config?: ExtendedAxiosRequestConfig,
): Promise<PageResult<ExamQuestionExperienceAssistBindingResponse>> {
  return http.post<PageResult<ExamQuestionExperienceAssistBindingResponse>>(
    '/api/mark/exam/grading-experience-assist/bindings/page',
    request,
    config,
  )
}

export function saveExamExperienceAssistBinding(
  request: ExamQuestionExperienceAssistBindingSaveRequest,
  config?: ExtendedAxiosRequestConfig,
): Promise<ExamQuestionExperienceAssistBindingResponse> {
  return http.post<ExamQuestionExperienceAssistBindingResponse>(
    '/api/mark/exam/grading-experience-assist/bindings/save',
    request,
    config,
  )
}

export function listExamExperienceAssistCandidates(
  examId: string,
  layoutQuestionId: string,
  config?: ExtendedAxiosRequestConfig,
): Promise<GradingExperienceAssistCandidateResponse[]> {
  return http.get<GradingExperienceAssistCandidateResponse[]>(
    '/api/mark/exam/grading-experience-assist/bindings/candidates',
    { ...config, params: { examId, layoutQuestionId, ...(config?.params ?? {}) } },
  )
}
