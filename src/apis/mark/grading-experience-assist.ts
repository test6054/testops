import type { ExtendedAxiosRequestConfig } from '@/config/axios/types'
import type { ExamKindCode } from '@/types/enums/exam-kind-enum'
import type { ExperienceRecommendationCode } from '@/types/enums/experience-recommendation-enum'
import type { GradingExperienceAssistQuestionResolutionCode } from '@/types/enums/grading-experience-assist-question-resolution-enum'
import type { GradingExperienceReferenceMatchModeCode } from '@/types/enums/grading-experience-reference-match-mode-enum'
import type { MarkingOrganizationStatusCode } from '@/types/enums/marking-organization-status-enum'
import http from '@/config/axios'

export interface MarkAiReferenceExperienceAuditVO {
  referenceExperienceApplied?: boolean
  referenceExperienceSourceExamName?: string
  referenceExperienceConsistencyRate?: number
  referenceExperienceMatchMode?: GradingExperienceReferenceMatchModeCode
}

export interface MarkTenantGradingPolicyVO {
  experienceAssistEnabled: boolean
  minConsistencyRate: number
  maxHammingDistance: number
  maxExperienceItems: number
  sourceExamKinds?: string
  requireSameCourse?: boolean
  requireEffectivenessEval?: boolean
}

export interface MarkTenantGradingPolicySaveRequest {
  experienceAssistEnabled: boolean
  minConsistencyRate: number
  maxHammingDistance: number
  maxExperienceItems: number
  sourceExamKinds?: string
  requireSameCourse?: boolean
  requireEffectivenessEval?: boolean
}

export type GradingExperienceAssistPolicyStatusCode = 'DISABLED' | 'ENABLED' | 'FROZEN'

export interface ExamGradingExperienceAssistPolicyVO {
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

export interface ExamQuestionExperienceAssistBindingVO {
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

export interface GradingExperienceAssistCandidateVO {
  experienceCaseId: string
  effectivenessEvalId: string
  sourceExamId: string
  sourceExamName?: string
  sourceExamNo?: string
  experienceSummary?: string
  consistencyRate?: number
  recommendation?: ExperienceRecommendationCode
}

export interface ExamQuestionExperienceAssistBindingSaveRequest {
  examId: string
  layoutQuestionId: string
  experienceCaseId?: string
  effectivenessEvalId?: string
}

export interface GradingExperienceAssistReadinessQuestionVO {
  layoutQuestionId: string
  questionNo?: string
  baselineReady?: boolean
  assistResolutionStatus?: GradingExperienceAssistQuestionResolutionCode
  readyForFormalMarking?: boolean
}

export interface GradingExperienceAssistReadinessVO {
  examId: string
  tenantExperienceAssistEnabled?: boolean
  examPolicyEnabled?: boolean
  policyStatus?: GradingExperienceAssistPolicyStatusCode
  readyForFormalMarking?: boolean
  baselineMissingCount?: number
  assistUnresolvedCount?: number
  questions?: GradingExperienceAssistReadinessQuestionVO[]
}

export interface MarkTenantGradingOpsExamRowVO {
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

export interface MarkTenantGradingOpsOverviewVO {
  tenantPolicy: MarkTenantGradingPolicyVO
  trialMarkingExamCount: number
  pendingExamCount: number
  totalPendingItemCount: number
  exams: MarkTenantGradingOpsExamRowVO[]
}

export function getTenantGradingPolicy(
  config?: ExtendedAxiosRequestConfig,
): Promise<MarkTenantGradingPolicyVO> {
  return http.get<MarkTenantGradingPolicyVO>('/api/mark/admin/grading-policy/tenant', config)
}

export function saveTenantGradingPolicy(
  request: MarkTenantGradingPolicySaveRequest,
  config?: ExtendedAxiosRequestConfig,
): Promise<MarkTenantGradingPolicyVO> {
  return http.post<MarkTenantGradingPolicyVO>(
    '/api/mark/admin/grading-policy/tenant/save',
    request,
    config,
  )
}

export function getTenantGradingOpsOverview(
  config?: ExtendedAxiosRequestConfig,
): Promise<MarkTenantGradingOpsOverviewVO> {
  return http.get<MarkTenantGradingOpsOverviewVO>(
    '/api/mark/admin/grading-policy/tenant/ops-overview',
    config,
  )
}

export function getExamGradingExperienceAssistPolicy(
  examId: string,
  config?: ExtendedAxiosRequestConfig,
): Promise<ExamGradingExperienceAssistPolicyVO> {
  return http.get<ExamGradingExperienceAssistPolicyVO>(
    '/api/mark/exam/grading-experience-assist/policy',
    {
      ...config,
      params: { examId, ...(config?.params ?? {}) },
    },
  )
}

export function enableExamGradingExperienceAssistPolicy(
  examId: string,
  config?: ExtendedAxiosRequestConfig,
): Promise<ExamGradingExperienceAssistPolicyVO> {
  return http.post<ExamGradingExperienceAssistPolicyVO>(
    '/api/mark/exam/grading-experience-assist/policy/enable',
    { examId },
    config,
  )
}

export function disableExamGradingExperienceAssistPolicy(
  examId: string,
  config?: ExtendedAxiosRequestConfig,
): Promise<ExamGradingExperienceAssistPolicyVO> {
  return http.post<ExamGradingExperienceAssistPolicyVO>(
    '/api/mark/exam/grading-experience-assist/policy/disable',
    { examId },
    config,
  )
}

export function getExamGradingExperienceAssistReadiness(
  examId: string,
  config?: ExtendedAxiosRequestConfig,
): Promise<GradingExperienceAssistReadinessVO> {
  return http.get<GradingExperienceAssistReadinessVO>(
    '/api/mark/exam/grading-experience-assist/policy/readiness',
    { ...config, params: { examId, ...(config?.params ?? {}) } },
  )
}

export function listExamExperienceAssistBindings(
  examId: string,
  config?: ExtendedAxiosRequestConfig,
): Promise<ExamQuestionExperienceAssistBindingVO[]> {
  return http.get<ExamQuestionExperienceAssistBindingVO[]>(
    '/api/mark/exam/grading-experience-assist/bindings/list',
    { ...config, params: { examId, ...(config?.params ?? {}) } },
  )
}

export function saveExamExperienceAssistBinding(
  request: ExamQuestionExperienceAssistBindingSaveRequest,
  config?: ExtendedAxiosRequestConfig,
): Promise<ExamQuestionExperienceAssistBindingVO> {
  return http.post<ExamQuestionExperienceAssistBindingVO>(
    '/api/mark/exam/grading-experience-assist/bindings/save',
    request,
    config,
  )
}

export function listExamExperienceAssistCandidates(
  examId: string,
  layoutQuestionId: string,
  config?: ExtendedAxiosRequestConfig,
): Promise<GradingExperienceAssistCandidateVO[]> {
  return http.get<GradingExperienceAssistCandidateVO[]>(
    '/api/mark/exam/grading-experience-assist/bindings/candidates',
    { ...config, params: { examId, layoutQuestionId, ...(config?.params ?? {}) } },
  )
}
