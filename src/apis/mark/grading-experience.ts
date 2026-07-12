/**
 * 批改经验沉淀 API - 对接 edu-mark 模块 GradingExperienceController
 */
import type { AiAnalysisStatusCode } from './ai-analysis-status'
import type { QuestionTypeCode } from './question-type'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { PageResult, QueryDto } from '@/types'
import type { ExperienceRecommendationCode } from '@/types/enums/experience-recommendation-enum'
import http from '@/config/axios'
import {
  ExperienceCaseStatusCode,
  ExperienceCaseStatusDescription,
} from '@/types/enums/experience-case-status-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

export {
  ALL_EXPERIENCE_CASE_STATUS_CODES,
  ExperienceCaseStatusCode,
  ExperienceCaseStatusDescription,
} from '@/types/enums/experience-case-status-enum'

export const EXPERIENCE_CASE_STATUS_TONE: Record<ExperienceCaseStatusCode, BadgeTone> = {
  [ExperienceCaseStatusCode.DRAFT]: 'gray',
  [ExperienceCaseStatusCode.CONFIRMED]: 'green',
  [ExperienceCaseStatusCode.DEPRECATED]: 'red',
}

/** 经验案例主流程状态链（不含 DEPRECATED 分支），供列表页流程 hint 展示 */
export const EXPERIENCE_CASE_MAIN_FLOW_STATUSES: ExperienceCaseStatusCode[] = [
  ExperienceCaseStatusCode.DRAFT,
  ExperienceCaseStatusCode.CONFIRMED,
]

/** 经验案例主流程 hint */
export const EXPERIENCE_CASE_FLOW_HINT = `${EXPERIENCE_CASE_MAIN_FLOW_STATUSES.map(
  (status) => strictEnumLabel(ExperienceCaseStatusDescription, status, '经验案例状态'),
).join(' → ')} / ${strictEnumLabel(ExperienceCaseStatusDescription, ExperienceCaseStatusCode.DEPRECATED, '经验案例状态')}`

/** 经验辅助定标引导：有效性评估通过后才可绑定或自动匹配 */
export const EXPERIENCE_ASSIST_CALIBRATION_HINT
  = '确认经验案例 → 完成有效性评估（KEEP/UPDATE）→ 绑定本期末或启用经验辅助评阅'

// ─── DTO ─────────────────────────────────

/** 跨考试相似题检索 - 对应 SimilarQuestionSearchRequest */
export interface SimilarQuestionSearchRequest {
  examId: string
  layoutQuestionId: string
  /** 最大返回条数，默认 10 */
  limit?: number
}

/** 考试详情查询 - 对应 ExamDetailQueryRequest */
export interface ExamDetailQueryRequest {
  examId: string
}

/** 考试 + 制卷题目范围 - 对应 ExamQuestionScopeQueryRequest */
export interface ExamQuestionScopeQueryRequest {
  examId: string
  layoutQuestionId: string
}

/** 题目签名分页 - 对应 QuestionSignaturePageRequest */
export interface QuestionSignaturePageRequest extends QueryDto {
  examId: string
}

/** 经验案例分页 - 对应 GradingExperiencePageRequest */
export interface GradingExperiencePageRequest extends QueryDto {
  examId: string
  layoutQuestionId?: string
}

/** 阅卷经验库汇总统计请求 - 对应 GradingExperienceStatsRequest */
export interface GradingExperienceStatsRequest {
  examId: string
}

/** 阅卷经验库汇总统计 - 对应 GradingExperienceStatsResponse */
export interface GradingExperienceStatsResponse {
  signatureCount: number
  experienceCount: number
  confirmedCount: number
  pendingAnalysisCount: number
  assistReadyCount: number
}

/** 题目签名 VO - 对应 QuestionSignatureResponse */
export interface QuestionSignatureResponse {
  id?: string
  examId: string
  examName: string
  examNo: string
  layoutQuestionId: string
  questionType: QuestionTypeCode
  questionNo: string
  questionDigest?: string
  standardAnswerDigest?: string
  /** 该题已沉淀经验案例数 */
  experienceCount?: number
  createTime?: string
}

/** 批改经验单项 */
export interface ExperienceItemResponse {
  experienceType?: string
  description?: string
  frequency?: number
  scoringPattern?: string
  applicableScenario?: string
  riskNote?: string
}

/** 经验案例 VO - 对应 GradingExperienceCaseResponse */
export interface GradingExperienceCaseResponse {
  id?: string
  sourceExamId: string
  sourceExamName: string
  sourceExamNo: string
  layoutQuestionId: string
  questionNo: string
  questionDigest?: string
  questionType: QuestionTypeCode
  aiTraceId?: string
  experienceSummary?: string
  experienceItems?: ExperienceItemResponse[]
  riskTags?: string[]
  applicableScope?: string
  caseStatus: ExperienceCaseStatusCode
  analysisStatus: AiAnalysisStatusCode
  errorMessage?: string
  latencyMs?: number
  createTime?: string
  /** 评阅引用次数（最新 SUCCESS 有效性评估） */
  reuseCount?: number
  /** 最新有效性评估推荐 KEEP/UPDATE/DEPRECATE */
  latestEffectivenessRecommendation?: ExperienceRecommendationCode
  /** 是否满足经验辅助定标门禁 */
  assistEligible?: boolean
}

/** 答案聚类单组 */
export interface AnswerGroupResponse {
  groupNo?: number
  groupLabel?: string
  groupDescription?: string
  representativeAnswers?: string[]
  answerCount?: number
  avgScore?: number
  suggestedAction?: string
  controversyNote?: string
}

/** 答案聚类记录 VO - 对应 ExamAnswerClusterRecord */
export interface AnswerClusterRecordResponse {
  id?: string
  examId: string
  layoutQuestionId: string
  aiTraceId?: string
  clusterSummary?: string
  answerGroups?: AnswerGroupResponse[]
  groupCount?: number
  analysisStatus: AiAnalysisStatusCode
  errorMessage?: string
  latencyMs?: number
  createTime?: string
}

export function generateSignatures(examId: string): Promise<QuestionSignatureResponse[]> {
  return http.post<QuestionSignatureResponse[]>('/api/exam/grading-experience/signature/generate', {
    examId,
  } satisfies ExamDetailQueryRequest)
}

export function pageSignatures(
  request: QuestionSignaturePageRequest,
): Promise<PageResult<QuestionSignatureResponse>> {
  return http.post<PageResult<QuestionSignatureResponse>>(
    '/api/exam/grading-experience/signature/page',
    request,
  )
}

export function searchSimilar(
  request: SimilarQuestionSearchRequest,
): Promise<QuestionSignatureResponse[]> {
  return http.post<QuestionSignatureResponse[]>('/api/exam/grading-experience/signature/similar', request)
}

export function extractExperience(
  request: ExamQuestionScopeQueryRequest,
): Promise<GradingExperienceCaseResponse> {
  return http.post<GradingExperienceCaseResponse>(
    '/api/exam/grading-experience/experience/extract',
    request,
  )
}

export function pageExperiences(
  request: GradingExperiencePageRequest,
): Promise<PageResult<GradingExperienceCaseResponse>> {
  return http.post<PageResult<GradingExperienceCaseResponse>>(
    '/api/exam/grading-experience/experience/page',
    request,
  )
}

export function getExperienceStats(
  request: GradingExperienceStatsRequest,
): Promise<GradingExperienceStatsResponse> {
  return http.post<GradingExperienceStatsResponse>(
    '/api/exam/grading-experience/experience/stats',
    request,
  )
}

export function confirmExperienceCase(experienceCaseId: string): Promise<GradingExperienceCaseResponse> {
  return http.post<GradingExperienceCaseResponse>('/api/exam/grading-experience/experience/confirm', {
    id: experienceCaseId,
  })
}

export function deprecateExperienceCase(
  experienceCaseId: string,
): Promise<GradingExperienceCaseResponse> {
  return http.post<GradingExperienceCaseResponse>('/api/exam/grading-experience/experience/deprecate', {
    id: experienceCaseId,
  })
}

export function generateAnswerCluster(
  request: ExamQuestionScopeQueryRequest,
): Promise<AnswerClusterRecordResponse> {
  return http.post<AnswerClusterRecordResponse>(
    '/api/exam/grading-experience/answer-cluster/generate',
    request,
  )
}

export function getLatestAnswerCluster(
  request: ExamQuestionScopeQueryRequest,
): Promise<AnswerClusterRecordResponse | null> {
  return http.post<AnswerClusterRecordResponse | null>(
    '/api/exam/grading-experience/answer-cluster/latest',
    request,
  )
}
